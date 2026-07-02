import { create } from 'zustand';

interface CallState {
  callId: string | null;
  callerId: string | null;
  callerName: string | null;
  receiverId: string | null;
  callType: 'voice' | 'video' | null;
  callStatus: 'idle' | 'incoming' | 'outgoing' | 'connected';
  
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  peerConnection: RTCPeerConnection | null;
  
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;

  setIncomingCall: (callerId: string, callerName: string, callId: string, type: 'voice' | 'video') => void;
  setOutgoingCall: (receiverId: string, callId: string, type: 'voice' | 'video') => void;
  setCallConnected: (remoteStream: MediaStream, peerConn: RTCPeerConnection) => void;
  setLocalStream: (stream: MediaStream) => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  setScreenSharing: (isSharing: boolean) => void;
  resetCallStore: () => void;
}

export const useCallStore = create<CallState>((set, get) => ({
  callId: null,
  callerId: null,
  callerName: null,
  receiverId: null,
  callType: null,
  callStatus: 'idle',
  
  localStream: null,
  remoteStream: null,
  peerConnection: null,
  
  isMuted: false,
  isCameraOff: false,
  isScreenSharing: false,

  setIncomingCall: (callerId, callerName, callId, type) => {
    set({
      callerId,
      callerName,
      callId,
      callType: type,
      callStatus: 'incoming'
    });
  },

  setOutgoingCall: (receiverId, callId, type) => {
    set({
      receiverId,
      callId,
      callType: type,
      callStatus: 'outgoing'
    });
  },

  setCallConnected: (remoteStream, peerConn) => {
    set({
      remoteStream,
      peerConnection: peerConn,
      callStatus: 'connected'
    });
  },

  setLocalStream: (stream) => {
    set({ localStream: stream });
  },

  toggleMute: () => {
    const { localStream, isMuted } = get();
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = isMuted; // toggling track state
      });
      set({ isMuted: !isMuted });
    }
  },

  toggleCamera: () => {
    const { localStream, isCameraOff } = get();
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = isCameraOff; // toggling video track state
      });
      set({ isCameraOff: !isCameraOff });
    }
  },

  setScreenSharing: (isSharing) => {
    set({ isScreenSharing: isSharing });
  },

  resetCallStore: () => {
    const { localStream, peerConnection } = get();
    
    // Stop all local media tracks
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    
    // Close peer connection
    if (peerConnection) {
      peerConnection.close();
    }

    set({
      callId: null,
      callerId: null,
      callerName: null,
      receiverId: null,
      callType: null,
      callStatus: 'idle',
      localStream: null,
      remoteStream: null,
      peerConnection: null,
      isMuted: false,
      isCameraOff: false,
      isScreenSharing: false
    });
  }
}));
