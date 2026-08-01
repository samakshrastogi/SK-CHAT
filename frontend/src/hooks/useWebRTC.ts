import { useRef } from 'react';
import { toast } from '../store/toastStore.js';
import { useCallStore } from '../store/callStore.js';
import { apiClient } from '../api/client.js';

export const useWebRTC = (socketEmit: (event: string, data: any) => void) => {
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const ringTimeoutRef = useRef<number | null>(null);
  const clearRingTimeout = () => { if (ringTimeoutRef.current) window.clearTimeout(ringTimeoutRef.current); ringTimeoutRef.current = null; };
  const getRtcConfiguration = async (): Promise<RTCConfiguration> => {
    const response = await apiClient.get('/calls/ice-servers');
    return { iceServers: response.data.iceServers };
  };
  const state = () => useCallStore.getState();

  const requestMediaWithRecovery = async (constraints: MediaStreamConstraints) => {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      const denied = error instanceof DOMException && ['NotAllowedError', 'SecurityError'].includes(error.name);
      if (!denied) throw error;
      toast.info('Camera or microphone permission was denied. Allow it in the browser site controls; SK Connect will ask once more.');
      await new Promise((resolve) => window.setTimeout(resolve, 350));
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (retryError) {
        toast.error('Permission is still blocked. Enable Camera and Microphone for this site, then tap the call button again.');
        throw retryError;
      }
    }
  };
  const startLocalStream = async (type: 'voice' | 'video') => {
    const existing = state().localStream;
    if (existing) return existing;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: type === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
      });
      state().setLocalStream(stream);
      return stream;
    } catch (error) {
      toast.error('Could not open camera or microphone. Please grant access.');
      throw error;
    }
  };

  const createPeer = async (targetId: string, callId: string, localStream: MediaStream, group = false, name?: string) => {
    const existing = peersRef.current.get(targetId);
    if (existing) return existing;
    const peer = new RTCPeerConnection(await getRtcConfiguration());
    peersRef.current.set(targetId, peer);
    state().setPeerConnection(targetId, peer);
    localStream.getTracks().forEach((track) => peer.addTrack(track, localStream));
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
      const peer = await createPeer(receiverId, callId, stream);
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
    const peer = await createPeer(userId, current.callId, current.localStream, true, username);
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
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    socketEmit('call:peer-answer', { targetId: senderId, callId: current.callId, answer });
  };

  const handlePeerAnswer = async ({ senderId, answer }: { senderId: string; answer: RTCSessionDescriptionInit }) => {
    await peersRef.current.get(senderId)?.setRemoteDescription(new RTCSessionDescription(answer));
  };
  const handleIceCandidate = async (candidate: RTCIceCandidateInit, senderId?: string) => {
    const peer = senderId ? peersRef.current.get(senderId) : peersRef.current.values().next().value;
    if (peer) await peer.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => undefined);
  };
  const handleCallAccepted = async (answer: RTCSessionDescriptionInit, receiverId?: string) => {
    clearRingTimeout();
    const peer = receiverId ? peersRef.current.get(receiverId) : peersRef.current.values().next().value;
    if (peer) await peer.setRemoteDescription(new RTCSessionDescription(answer));
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
    peersRef.current.forEach((peer) => peer.close()); peersRef.current.clear(); current.resetCallStore();
  };

  return { makeCall, makeGroupCall, answerCall, rejectCall, handleIceCandidate, handleCallAccepted,
    handleGroupParticipantJoined, handlePeerOffer, handlePeerAnswer, handleParticipantLeft,
    startScreenShare, stopScreenShare, hangUp, listMediaDevices: () => navigator.mediaDevices.enumerateDevices() };
};
