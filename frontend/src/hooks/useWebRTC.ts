import { useRef } from 'react';
import { toast } from '../store/toastStore.js';
import { useCallStore } from '../store/callStore.js';
import { apiClient } from '../api/client.js';

export const useWebRTC = (socketEmit: (event: string, data: any) => void) => {
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const ringTimeoutRef = useRef<number | null>(null);
  const clearRingTimeout = () => { if (ringTimeoutRef.current) window.clearTimeout(ringTimeoutRef.current); ringTimeoutRef.current = null; };
  const getRtcConfiguration = async (): Promise<RTCConfiguration> => {
    const response = await apiClient.get('/calls/ice-servers');
    return { iceServers: response.data.iceServers };
  };
  const state = () => useCallStore.getState();

  const requestMediaWithRecovery = (constraints: MediaStreamConstraints) =>
    navigator.mediaDevices.getUserMedia(constraints);

  const startLocalStream = async (type: 'voice' | 'video') => {
    const existing = state().localStream;
    if (existing) return existing;

    const audio = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
    try {
      const stream = await requestMediaWithRecovery({
        audio,
        video: type === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
      });
      state().setLocalStream(stream);
      return stream;
    } catch {
      if (type === 'video') {
        try {
          const audioOnlyStream = await requestMediaWithRecovery({ audio, video: false });
          state().setLocalStream(audioOnlyStream);
          toast.info('Camera access is blocked. You joined with microphone only.');
          return audioOnlyStream;
        } catch {
          // Continue into listen-only mode below.
        }
      }

      const listenOnlyStream = new MediaStream();
      state().setLocalStream(listenOnlyStream);
      toast.info('Camera and microphone are blocked. You joined in listen-only mode; enable site permissions to speak or share video.');
      return listenOnlyStream;
    }
  };

  const queueCandidate = (targetId: string, candidate: RTCIceCandidateInit) => {
    const queued = pendingCandidatesRef.current.get(targetId) || [];
    queued.push(candidate);
    pendingCandidatesRef.current.set(targetId, queued);
  };
  const flushCandidates = async (targetId: string, peer: RTCPeerConnection) => {
    const queued = pendingCandidatesRef.current.get(targetId) || [];
    pendingCandidatesRef.current.delete(targetId);
    for (const candidate of queued) await peer.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => undefined);
  };
  const createPeer = async (targetId: string, callId: string, localStream: MediaStream, group = false, name?: string, offerer = false) => {
    const existing = peersRef.current.get(targetId);
    if (existing) return existing;
    const peer = new RTCPeerConnection(await getRtcConfiguration());
    peersRef.current.set(targetId, peer);
    state().setPeerConnection(targetId, peer);
    localStream.getTracks().forEach((track) => peer.addTrack(track, localStream));
    if (offerer && localStream.getAudioTracks().length === 0) peer.addTransceiver('audio', { direction: 'recvonly' });
    if (offerer && state().callType === 'video' && localStream.getVideoTracks().length === 0) {
      peer.addTransceiver('video', { direction: 'recvonly' });
    }
    peer.ontrack = (event) => {
      const stream = event.streams[0] || new MediaStream([event.track]);
      state().setCallConnected(stream, peer, targetId, name);
    };
    peer.onicecandidate = (event) => {
      if (!event.candidate) return;
      socketEmit(group ? 'call:peer-candidate' : 'call:candidate', {
        targetId, callId, candidate: event.candidate,
      });
    };
    peer.onconnectionstatechange = () => {
      if (['failed', 'closed'].includes(peer.connectionState)) state().removeRemoteParticipant(targetId);
    };
    return peer;
  };

  const makeCall = async (receiverId: string, chatId: string, type: 'voice' | 'video') => {
    try {
      const logResp = await apiClient.post('/calls/start', { receiverId, chatId, type });
      const callId = logResp.data.call._id;
      state().setOutgoingCall(receiverId, callId, type);
      const stream = await startLocalStream(type);
      const peer = await createPeer(receiverId, callId, stream, false, undefined, true);
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socketEmit('call:initiate', { receiverId, callId, type, offer });
      localStorage.setItem('active_backend_call_id', callId);
      clearRingTimeout();
      ringTimeoutRef.current = window.setTimeout(() => {
        socketEmit('call:end', { targetId: receiverId, callId });
        void apiClient.put('/calls/' + callId + '/end', { status: 'missed' });
        state().resetCallStore();
      }, 30_000);
    } catch {
      state().resetCallStore();
    }
  };

  const makeGroupCall = async (chatId: string, type: 'voice' | 'video') => {
    try {
      const response = await apiClient.post('/calls/start', { chatId, type });
      const callId = response.data.call._id;
      state().setOutgoingGroupCall(chatId, callId, type);
      await startLocalStream(type);
      socketEmit('call:initiate-group', { chatId, callId, type });
      localStorage.setItem('active_backend_call_id', callId);
      state().markConnected();
    } catch {
      state().resetCallStore();
      toast.error('Could not start the group call.');
    }
  };

  const answerCall = async (callerId: string, offer?: RTCSessionDescriptionInit | null) => {
    const current = state();
    if (current.isGroupCall) {
      try {
        await startLocalStream(current.callType || 'video');
        socketEmit('call:join-group', { callId: current.callId });
        current.markConnected();
      } catch { state().resetCallStore(); }
      return;
    }
    if (!offer || !current.callId) return;
    try {
      const stream = await startLocalStream(current.callType || 'video');
      const peer = await createPeer(callerId, current.callId, stream);
      await peer.setRemoteDescription(new RTCSessionDescription(offer));
      await flushCandidates(callerId, peer);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socketEmit('call:accept', { callerId, callId: current.callId, answer });
    } catch { rejectCall(callerId, 'Failed to establish connection tracks'); }
  };

  const rejectCall = (callerId: string, reason = 'declined') => {
    const current = state();
    socketEmit(current.isGroupCall ? 'call:leave-group' : 'call:reject', { callerId, callId: current.callId, reason });
    current.resetCallStore();
  };

  const handleGroupParticipantJoined = async ({ userId, username }: { userId: string; username?: string }) => {
    const current = state();
    if (!current.callId || !current.localStream || userId === current.callerId) return;
    const peer = await createPeer(userId, current.callId, current.localStream, true, username, true);
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    socketEmit('call:peer-offer', { targetId: userId, callId: current.callId, offer });
  };

  const handlePeerOffer = async ({ senderId, senderName, offer }: { senderId: string; senderName?: string; offer: RTCSessionDescriptionInit }) => {
    const current = state();
    if (!current.callId) return;
    const stream = await startLocalStream(current.callType || 'video');
    const peer = await createPeer(senderId, current.callId, stream, true, senderName);
    await peer.setRemoteDescription(new RTCSessionDescription(offer));
    await flushCandidates(senderId, peer);
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    socketEmit('call:peer-answer', { targetId: senderId, callId: current.callId, answer });
  };

  const handlePeerAnswer = async ({ senderId, answer }: { senderId: string; answer: RTCSessionDescriptionInit }) => {
    const peer = peersRef.current.get(senderId);
    if (!peer) return;
    await peer.setRemoteDescription(new RTCSessionDescription(answer));
    await flushCandidates(senderId, peer);
  };
  const handleIceCandidate = async (candidate: RTCIceCandidateInit, senderId?: string) => {
    const targetId = senderId || [...peersRef.current.keys()][0];
    if (!targetId) return;
    const peer = peersRef.current.get(targetId);
    if (!peer || !peer.remoteDescription) {
      queueCandidate(targetId, candidate);
      return;
    }
    await peer.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => undefined);
  };
  const handleCallAccepted = async (answer: RTCSessionDescriptionInit, receiverId?: string) => {
    clearRingTimeout();
    const targetId = receiverId || [...peersRef.current.keys()][0];
    if (!targetId) return;
    const peer = peersRef.current.get(targetId);
    if (!peer) return;
    await peer.setRemoteDescription(new RTCSessionDescription(answer));
    await flushCandidates(targetId, peer);
  };
  const handleParticipantLeft = ({ userId }: { userId: string }) => {
    peersRef.current.get(userId)?.close(); peersRef.current.delete(userId); state().removeRemoteParticipant(userId);
  };

  const replaceVideoTrack = async (track: MediaStreamTrack) => {
    await Promise.all([...peersRef.current.values()].map(async (peer) => {
      const sender = peer.getSenders().find((item) => item.track?.kind === 'video');
      if (sender) await sender.replaceTrack(track);
    }));
  };
  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = stream.getVideoTracks()[0]; await replaceVideoTrack(track); state().setScreenSharing(true);
      track.onended = () => { void stopScreenShare(); };
    } catch { toast.error('Screen sharing could not be started.'); }
  };
  const stopScreenShare = async () => {
    const current = state(); if (!current.localStream || current.callType !== 'video') return;
    const stream = await requestMediaWithRecovery({ video: { width: 1280, height: 720 } });
    const track = stream.getVideoTracks()[0]; await replaceVideoTrack(track); current.setScreenSharing(false);
  };

  const hangUp = async () => {
    clearRingTimeout();
    const current = state();
    if (current.isGroupCall) socketEmit('call:leave-group', { callId: current.callId });
    else {
      const target = current.callerId || current.receiverId;
      if (target) socketEmit('call:end', { targetId: target, callId: current.callId });
    }
    if (current.callId) await apiClient.put('/calls/' + current.callId + '/end', { status: 'completed' }).catch(() => undefined);
    localStorage.removeItem('active_backend_call_id');
    peersRef.current.forEach((peer) => peer.close()); peersRef.current.clear(); pendingCandidatesRef.current.clear(); current.resetCallStore();
  };

  return { makeCall, makeGroupCall, answerCall, rejectCall, handleIceCandidate, handleCallAccepted,
    handleGroupParticipantJoined, handlePeerOffer, handlePeerAnswer, handleParticipantLeft,
    startScreenShare, stopScreenShare, hangUp, listMediaDevices: () => navigator.mediaDevices.enumerateDevices() };
};
