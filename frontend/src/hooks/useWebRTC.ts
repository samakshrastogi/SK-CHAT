import { useRef } from 'react';
import { toast } from '../store/toastStore.js';
import { useCallStore } from '../store/callStore.js';
import { apiClient } from '../api/client.js';

export const useWebRTC = (socketEmit: (event: string, data: any) => void) => {
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const ringTimeoutRef = useRef<number | null>(null);
  const clearRingTimeout = () => { if (ringTimeoutRef.current) window.clearTimeout(ringTimeoutRef.current); ringTimeoutRef.current = null; };
  const getRtcConfiguration = async (): Promise<RTCConfiguration> => {
    const response = await apiClient.get('/calls/ice-servers');
    return { iceServers: response.data.iceServers };
  };
  const state = () => useCallStore.getState();
  const waitForIceGathering = (peer: RTCPeerConnection, timeoutMs = 4000) => new Promise<void>((resolve) => {
    if (peer.iceGatheringState === 'complete') return resolve();
    const timeout = window.setTimeout(done, timeoutMs);
    function done() {
      window.clearTimeout(timeout);
      peer.removeEventListener('icegatheringstatechange', onStateChange);
      resolve();
    }
    function onStateChange() {
      if (peer.iceGatheringState === 'complete') done();
    }
    peer.addEventListener('icegatheringstatechange', onStateChange);
  });

  const requestMediaWithRecovery = (constraints: MediaStreamConstraints) =>
    navigator.mediaDevices.getUserMedia(constraints);

  const mediaConstraints = (type: 'voice' | 'video'): MediaStreamConstraints => ({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    video: type === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
  });

  const startLocalStream = async (type: 'voice' | 'video') => {
    const existing = state().localStream;
    // An empty stream represents listen-only mode. Do not cache it forever:
    // each explicit call action gives the browser another chance to prompt.
    if (existing?.getTracks().length) return existing;

    try {
      const stream = await requestMediaWithRecovery(mediaConstraints(type));
      state().setLocalStream(stream);
      return stream;
    } catch {
      if (type === 'video') {
        try {
          const audioOnlyStream = await requestMediaWithRecovery({ audio: mediaConstraints('voice').audio, video: false });
          state().setLocalStream(audioOnlyStream);
          toast.info('Camera access is blocked. You joined with microphone only.');
          return audioOnlyStream;
        } catch {
          // Continue into listen-only mode below.
        }
      }

      const listenOnlyStream = new MediaStream();
      state().setLocalStream(listenOnlyStream);
      toast.info('Joined in listen-only mode. Allow camera/microphone in site controls, then use Retry media in the call.');
      return listenOnlyStream;
    }
  };

  const retryMediaPermissions = async () => {
    const current = state();
    if (!current.callType) return false;
    try {
      const stream = await requestMediaWithRecovery(mediaConstraints(current.callType));
      current.localStream?.getTracks().forEach((track) => track.stop());
      current.setLocalStream(stream);
      for (const [targetId, peer] of peersRef.current) {
        for (const track of stream.getTracks()) {
          const sender = peer.getSenders().find((item) => item.track?.kind === track.kind);
          if (sender) await sender.replaceTrack(track); else peer.addTrack(track, stream);
        }
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        await waitForIceGathering(peer);
        socketEmit(current.isGroupCall ? 'call:peer-offer' : 'call:restart-offer', {
          targetId, callId: current.callId, offer: peer.localDescription,
        });
      }
      toast.success('Microphone and camera are connected.');
      return true;
    } catch {
      toast.info('Permission is still unavailable. Enable Camera and Microphone in browser site controls, then tap Retry media again.');
      return false;
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
      // Keep one stable MediaStream per participant. Some mobile browsers emit
      // audio and video as separate track events without event.streams.
      const stream = remoteStreamsRef.current.get(targetId) || event.streams[0] || new MediaStream();
      if (!stream.getTracks().some((track) => track.id === event.track.id)) stream.addTrack(event.track);
      remoteStreamsRef.current.set(targetId, stream);
      event.track.onunmute = () => state().setCallConnected(stream, peer, targetId, name);
      state().setCallConnected(stream, peer, targetId, name);
    };
    peer.onicecandidate = (event) => {
      if (!event.candidate) return;
      socketEmit(group ? 'call:peer-candidate' : 'call:candidate', {
        targetId, callId, candidate: event.candidate,
      });
    };
    let iceRestartAttempted = false;
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'connected') iceRestartAttempted = false;
      if (peer.connectionState === 'failed' && !iceRestartAttempted) {
        iceRestartAttempted = true;
        void (async () => {
          try {
            peer.restartIce();
            const offer = await peer.createOffer({ iceRestart: true });
            await peer.setLocalDescription(offer);
            await waitForIceGathering(peer);
            socketEmit(group ? 'call:peer-offer' : 'call:restart-offer', { targetId, callId, offer: peer.localDescription });
            toast.info('Connection interrupted. Reconnecting the call…');
          } catch {
            state().removeRemoteParticipant(targetId);
            toast.error('The call connection could not be restored.');
          }
        })();
      }
      if (peer.connectionState === 'closed') state().removeRemoteParticipant(targetId);
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
      await waitForIceGathering(peer);
      socketEmit('call:initiate', { receiverId, callId, type, offer: peer.localDescription });
      localStorage.setItem('active_backend_call_id', callId);
      clearRingTimeout();
      ringTimeoutRef.current = window.setTimeout(() => {
        socketEmit('call:end', { targetId: receiverId, callId });
        void apiClient.put('/calls/' + callId + '/end', { status: 'missed' });
        state().resetCallStore();
      }, 90_000);
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
      await waitForIceGathering(peer);
      socketEmit('call:accept', { callerId, callId: current.callId, answer: peer.localDescription });
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
    await waitForIceGathering(peer);
    socketEmit('call:peer-offer', { targetId: userId, callId: current.callId, offer: peer.localDescription });
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
    await waitForIceGathering(peer);
    socketEmit('call:peer-answer', { targetId: senderId, callId: current.callId, answer: peer.localDescription });
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
    // A valid answer establishes the call even when the receiver joined
    // listen-only and therefore has no outbound media tracks.
    state().markConnected();
  };
  const handleRestartOffer = async ({ senderId, offer }: { senderId: string; offer: RTCSessionDescriptionInit }) => {
    const current = state();
    if (!current.callId) return;
    const stream = await startLocalStream(current.callType || 'video');
    const peer = await createPeer(senderId, current.callId, stream);
    await peer.setRemoteDescription(new RTCSessionDescription(offer));
    await flushCandidates(senderId, peer);
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    await waitForIceGathering(peer);
    socketEmit('call:restart-answer', { targetId: senderId, callId: current.callId, answer: peer.localDescription });
  };
  const handleRestartAnswer = async ({ senderId, answer }: { senderId: string; answer: RTCSessionDescriptionInit }) => {
    const peer = peersRef.current.get(senderId);
    if (!peer) return;
    await peer.setRemoteDescription(new RTCSessionDescription(answer));
    await flushCandidates(senderId, peer);
  };
  const handleCallTerminated = () => {
    clearRingTimeout();
    peersRef.current.forEach((peer) => peer.close());
    peersRef.current.clear();
    pendingCandidatesRef.current.clear();
    remoteStreamsRef.current.clear();
    state().resetCallStore();
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
    peersRef.current.forEach((peer) => peer.close()); peersRef.current.clear(); pendingCandidatesRef.current.clear(); remoteStreamsRef.current.clear(); current.resetCallStore();
  };

  return { makeCall, makeGroupCall, answerCall, rejectCall, handleIceCandidate, handleCallAccepted,
    handleGroupParticipantJoined, handlePeerOffer, handlePeerAnswer, handleRestartOffer, handleRestartAnswer, handleCallTerminated, handleParticipantLeft,
    startScreenShare, stopScreenShare, retryMediaPermissions, hangUp, listMediaDevices: () => navigator.mediaDevices.enumerateDevices() };
};
