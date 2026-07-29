import { useRef } from 'react';
import { toast } from '../store/toastStore.js';
import { useCallStore } from '../store/callStore.js';
import { apiClient } from '../api/client.js';


export const useWebRTC = (socketEmit: (event: string, data: any) => void) => {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const ringTimeoutRef = useRef<number | null>(null);
  const clearRingTimeout = () => {
    if (ringTimeoutRef.current) window.clearTimeout(ringTimeoutRef.current);
    ringTimeoutRef.current = null;
  };
  const getRtcConfiguration = async (): Promise<RTCConfiguration> => {
    const response = await apiClient.get('/calls/ice-servers');
    return { iceServers: response.data.iceServers };
  };
  const callStore = useCallStore();

  const startLocalStream = async (type: 'voice' | 'video', audioDeviceId?: string, videoDeviceId?: string) => {
    try {
      const constraints = {
        audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true,
        video: type === 'video' ? { width: 1280, height: 720, facingMode: 'user', ...(videoDeviceId ? { deviceId: { exact: videoDeviceId } } : {}) } : false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      callStore.setLocalStream(stream);
      return stream;
    } catch (err: any) {
      console.error('Error getting media devices:', err.message);
      toast.error('Could not open camera or microphone. Please grant access.');
      throw err;
    }
  };

  const initializePeerConnection = async (
    localStream: MediaStream,
    targetId: string,
    onRemoteStream: (stream: MediaStream) => void,
    callId: string
  ) => {
    const pc = new RTCPeerConnection(await getRtcConfiguration());
    pcRef.current = pc;

    // Add local tracks to peer
    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    // Remote track listener
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        onRemoteStream(event.streams[0]);
      }
    };

    // Gather ICE candidates and emit to peer
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketEmit('call:candidate', {
          targetId,
          callId,
          candidate: event.candidate
        });
      }
    };

    return pc;
  };

  const makeCall = async (receiverId: string, chatId: string, type: 'voice' | 'video') => {
    try {
      // Create the authorized backend call record before signaling.
      const logResp = await apiClient.post('/calls/start', { receiverId, chatId, type });
      const callId = logResp.data.call._id;
      callStore.setOutgoingCall(receiverId, callId, type);

      const localStream = await startLocalStream(type);
      
      const pc = await initializePeerConnection(localStream, receiverId, (remoteStream) => {
        callStore.setCallConnected(remoteStream, pc);
      }, callId);

      // Create SDP Offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Signal target
      socketEmit('call:initiate', {
        receiverId,
        callId,
        type,
        offer
      });

      // Cache reference to backend call log id in localStorage to end it cleanly
      localStorage.setItem('active_backend_call_id', callId);
      clearRingTimeout();
      ringTimeoutRef.current = window.setTimeout(() => {
        socketEmit('call:end', { targetId: receiverId, callId });
        void apiClient.put(`/calls/${callId}/end`, { status: 'missed' });
        callStore.resetCallStore();
      }, 30_000);
    } catch (e) {
      callStore.resetCallStore();
    }
  };

  const answerCall = async (callerId: string, offer: RTCSessionDescriptionInit) => {
    try {
      const localStream = await startLocalStream(callStore.callType || 'video');
      
      const callId = callStore.callId;
      if (!callId) throw new Error('Missing call identifier');
      const pc = await initializePeerConnection(localStream, callerId, (remoteStream) => {
        callStore.setCallConnected(remoteStream, pc);
      }, callId);

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      // Create SDP Answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Signal acceptance
      socketEmit('call:accept', {
        callerId,
        callId,
        answer
      });
    } catch (e) {
      rejectCall(callerId, 'Failed to establish connection tracks');
    }
  };

  const rejectCall = (callerId: string, reason = 'declined') => {
    socketEmit('call:reject', { callerId, callId: callStore.callId, reason });
    callStore.resetCallStore();
  };

  const handleIceCandidate = async (candidate: RTCIceCandidateInit) => {
    if (pcRef.current) {
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error('Error adding ICE candidate:', e);
      }
    }
  };

  const handleCallAccepted = async (answer: RTCSessionDescriptionInit) => {
    clearRingTimeout();
    if (pcRef.current) {
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (e) {
        console.error('Error setting remote description:', e);
      }
    }
  };

  const startScreenShare = async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const videoTrack = displayStream.getVideoTracks()[0];
      
      if (pcRef.current) {
        const senders = pcRef.current.getSenders();
        const videoSender = senders.find((s) => s.track?.kind === 'video');
        
        if (videoSender) {
          videoSender.replaceTrack(videoTrack);
        }
      }

      callStore.setScreenSharing(true);

      // Handle user stopping screen share from browser default popup controls
      videoTrack.onended = () => {
        stopScreenShare();
      };
    } catch (e) {
      console.error('Failed to share screen:', e);
    }
  };

  const stopScreenShare = async () => {
    try {
      const { localStream, callType } = callStore;
      if (!localStream) return;

      // Re-trigger standard user camera stream
      const constraints = {
        video: callType === 'video' ? { width: 1280, height: 720 } : false
      };
      
      const freshCamStream = await navigator.mediaDevices.getUserMedia(constraints);
      const camTrack = freshCamStream.getVideoTracks()[0];

      if (pcRef.current) {
        const senders = pcRef.current.getSenders();
        const videoSender = senders.find((s) => s.track?.kind === 'video');
        if (videoSender && camTrack) {
          videoSender.replaceTrack(camTrack);
        }
      }

      callStore.setScreenSharing(false);
    } catch (e) {
      console.error('Failed to stop screen share:', e);
    }
  };

  const listMediaDevices = async () => navigator.mediaDevices.enumerateDevices();

  const hangUp = async () => {
    clearRingTimeout();
    const activeCallRecordId = localStorage.getItem('active_backend_call_id');
    const target = callStore.callerId || callStore.receiverId;

    if (target) {
      socketEmit('call:end', { targetId: target, callId: callStore.callId });
    }

    if (activeCallRecordId) {
      // Put call log completion update in backend
      try {
        await apiClient.put(`/calls/${activeCallRecordId}/end`, {
          status: 'completed'
        });
      } catch (err) {}
      localStorage.removeItem('active_backend_call_id');
    }

    callStore.resetCallStore();
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
  };

  return {
    makeCall,
    answerCall,
    rejectCall,
    handleIceCandidate,
    handleCallAccepted,
    startScreenShare,
    stopScreenShare,
    hangUp,
    listMediaDevices
  };
};
