import { create } from 'zustand';

interface RemoteParticipant { userId: string; name?: string; stream: MediaStream; }
interface CallState {
  callId: string | null; chatId: string | null; callerId: string | null; callerName: string | null;
  receiverId: string | null; callType: 'voice' | 'video' | null;
  callStatus: 'idle' | 'incoming' | 'outgoing' | 'connected'; isGroupCall: boolean;
  incomingOffer: RTCSessionDescriptionInit | null; localStream: MediaStream | null;
  remoteStream: MediaStream | null; remoteParticipants: Record<string, RemoteParticipant>;
  peerConnection: RTCPeerConnection | null; peerConnections: Record<string, RTCPeerConnection>;
  isMuted: boolean; isCameraOff: boolean; isScreenSharing: boolean;
  setIncomingCall: (callerId: string, callerName: string, callId: string, type: 'voice' | 'video', offer?: RTCSessionDescriptionInit, options?: { isGroupCall?: boolean; chatId?: string }) => void;
  setOutgoingCall: (receiverId: string, callId: string, type: 'voice' | 'video') => void;
  setOutgoingGroupCall: (chatId: string, callId: string, type: 'voice' | 'video') => void;
  markConnected: () => void;
  setCallConnected: (stream: MediaStream, peer: RTCPeerConnection, userId?: string, name?: string) => void;
  setLocalStream: (stream: MediaStream) => void;
  setPeerConnection: (userId: string, peer: RTCPeerConnection) => void;
  removeRemoteParticipant: (userId: string) => void;
  toggleMute: () => void; toggleCamera: () => void;
  setScreenSharing: (sharing: boolean) => void; resetCallStore: () => void;
}
export const useCallStore = create<CallState>((set, get) => ({
  callId: null, chatId: null, callerId: null, callerName: null, receiverId: null,
  callType: null, callStatus: 'idle', isGroupCall: false, incomingOffer: null,
  localStream: null, remoteStream: null, remoteParticipants: {},
  peerConnection: null, peerConnections: {}, isMuted: false, isCameraOff: false, isScreenSharing: false,
  setIncomingCall: (callerId, callerName, callId, type, offer, options) => set({
    callerId, callerName, callId, chatId: options?.chatId || null, callType: type,
    callStatus: 'incoming', isGroupCall: Boolean(options?.isGroupCall), incomingOffer: offer || null,
  }),
  setOutgoingCall: (receiverId, callId, type) => set({ receiverId, callId, callType: type, callStatus: 'outgoing', isGroupCall: false }),
  setOutgoingGroupCall: (chatId, callId, type) => set({ chatId, callId, callType: type, callStatus: 'outgoing', isGroupCall: true }),
  markConnected: () => set({ callStatus: 'connected' }),
  setCallConnected: (stream, peer, userId = 'direct', name) => set((state) => ({
    remoteStream: state.remoteStream || stream, peerConnection: state.peerConnection || peer,
    peerConnections: { ...state.peerConnections, [userId]: peer },
    remoteParticipants: { ...state.remoteParticipants, [userId]: { userId, name, stream } },
    callStatus: 'connected',
  })),
  setLocalStream: (stream) => set({ localStream: stream }),
  setPeerConnection: (userId, peer) => set((state) => ({
    peerConnections: { ...state.peerConnections, [userId]: peer },
    peerConnection: state.peerConnection || peer,
  })),
  removeRemoteParticipant: (userId) => set((state) => {
    state.peerConnections[userId]?.close();
    const peerConnections = { ...state.peerConnections }; const remoteParticipants = { ...state.remoteParticipants };
    delete peerConnections[userId]; delete remoteParticipants[userId];
    return { peerConnections, remoteParticipants };
  }),
  toggleMute: () => { const { localStream, isMuted } = get(); localStream?.getAudioTracks().forEach((track) => { track.enabled = isMuted; }); set({ isMuted: !isMuted }); },
  toggleCamera: () => { const { localStream, isCameraOff } = get(); localStream?.getVideoTracks().forEach((track) => { track.enabled = isCameraOff; }); set({ isCameraOff: !isCameraOff }); },
  setScreenSharing: (isScreenSharing) => set({ isScreenSharing }),
  resetCallStore: () => {
    const state = get(); state.localStream?.getTracks().forEach((track) => track.stop());
    Object.values(state.peerConnections).forEach((peer) => peer.close()); state.peerConnection?.close();
    set({ callId: null, chatId: null, callerId: null, callerName: null, receiverId: null,
      callType: null, callStatus: 'idle', isGroupCall: false, incomingOffer: null,
      localStream: null, remoteStream: null, remoteParticipants: {}, peerConnection: null,
      peerConnections: {}, isMuted: false, isCameraOff: false, isScreenSharing: false });
  },
}));
