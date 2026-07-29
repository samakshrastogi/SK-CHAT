import { useRef } from 'react';
import { useCallStore } from '../store/callStore.js';
import { apiClient } from '../api/client.js';

const turnUrls = (import.meta.env.VITE_TURN_URLS || '').split(',').map((value: string) => value.trim()).filter(Boolean);
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    ...(turnUrls.length ? [{ urls: turnUrls, username: import.meta.env.VITE_TURN_USERNAME, credential: import.meta.env.VITE_TURN_CREDENTIAL }] : [])
  ]
};

export const useWebRTC = (socketEmit: (event: string, data: any) => void) => {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const callStore = useCallStore();

  const startLocalStream = async (type: 'voice' | 'video') => {
    try {
      const constraints = {
        audio: true,
        video: type === 'video' ? { width: 1280, height: 720, facingMode: 'user' } : false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      callStore.setLocalStream(stream);
      return stream;
    } catch (err: any) {
      console.error('Error getting media devices:', err.message);
      alert('Could not open camera or microphone. Please grant access.');
      throw err;
    }
  };

  const initializePeerConnection = (
    localStream: MediaStream,
    targetId: string,
    onRemoteStream: (stream: MediaStream) => void,
    callId: string
  ) => {
    const pc = new RTCPeerConnection(RTC_CONFIG);
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
      
      const pc = initializePeerConnection(localStream, receiverId, (remoteStream) => {
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
    } catch (e) {
      callStore.resetCallStore();
    }
  };

  const answerCall = async (callerId: string, offer: RTCSessionDescriptionInit) => {
    try {
      const localStream = await startLocalStream(callStore.callType || 'video');
      
      const callId = callStore.callId;
      if (!callId) throw new Error('Missing call identifier');
      const pc = initializePeerConnection(localStream, callerId, (remoteStream) => {
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

  const hangUp = async () => {
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
    hangUp
  };
};
