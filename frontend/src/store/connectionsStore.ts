import { create } from 'zustand';
import { User } from '../types/index.js';
import { apiClient } from '../api/client.js';
import { useAuthStore } from './authStore.js';

interface FriendRequestData {
  _id: string;
  senderId?: User;
  receiverId?: User;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  createdAt: string;
}

interface ConnectionsState {
  friends: any[];
  incomingRequests: FriendRequestData[];
  outgoingRequests: FriendRequestData[];
  recentlyJoined: User[];
  suggestedUsers: any[];
  blockedUsers: User[];
  mutedUsers: User[];
  isLoading: boolean;

  fetchDiscovery: () => Promise<void>;
  fetchFriends: () => Promise<void>;
  fetchRequests: () => Promise<void>;
  fetchBlocked: () => Promise<void>;
  fetchMuted: () => Promise<void>;
  sendRequest: (receiverId: string) => Promise<void>;
  acceptRequest: (requestId: string) => Promise<void>;
  rejectRequest: (requestId: string) => Promise<void>;
  cancelRequest: (requestId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  blockUserToggle: (userId: string) => Promise<void>;
  muteUserToggle: (userId: string) => Promise<void>;
  addIncomingRequest: (request: FriendRequestData) => void;
  addOutgoingRequest: (request: FriendRequestData) => void;
  markRequestResolved: (requestId: string) => void;
  addRealtimeFriend: (payload: { senderId: string; receiverId: string; senderUser?: any; receiverUser?: any }) => void;
  removeRealtimeFriend: (payload: { userId: string; friendId: string }) => void;
}

export const useConnectionsStore = create<ConnectionsState>((set, get) => ({
  friends: [],
  incomingRequests: [],
  outgoingRequests: [],
  recentlyJoined: [],
  suggestedUsers: [],
  blockedUsers: [],
  mutedUsers: [],
  isLoading: false,

  fetchDiscovery: async () => {
    set({ isLoading: true });
    try {
      const resp = await apiClient.get('/users/discovery');
      set({
        recentlyJoined: resp.data.recentlyJoined,
        suggestedUsers: resp.data.suggested,
        isLoading: false
      });
    } catch (e) {
      set({ isLoading: false });
    }
  },

  fetchFriends: async () => {
    set({ isLoading: true });
    try {
      const resp = await apiClient.get('/users/friends');
      set({ friends: resp.data.friends, isLoading: false });
    } catch (e) {
      set({ isLoading: false });
    }
  },

  fetchRequests: async () => {
    set({ isLoading: true });
    try {
      const resp = await apiClient.get('/users/friends/requests');
      set({
        incomingRequests: resp.data.incoming,
        outgoingRequests: resp.data.outgoing,
        isLoading: false
      });
    } catch (e) {
      set({ isLoading: false });
    }
  },

  fetchBlocked: async () => {
    set({ isLoading: true });
    try {
      const resp = await apiClient.get('/users/blocked');
      set({ blockedUsers: resp.data.blockedUsers, isLoading: false });
    } catch (e) {
      set({ isLoading: false });
    }
  },

  fetchMuted: async () => {
    set({ isLoading: true });
    try {
      const resp = await apiClient.get('/users/muted');
      set({ mutedUsers: resp.data.mutedUsers, isLoading: false });
    } catch (e) {
      set({ isLoading: false });
    }
  },

  sendRequest: async (receiverId) => {
    const resp = await apiClient.post('/users/friends/request', { receiverId });
    if (resp.data.request) {
      get().addOutgoingRequest(resp.data.request);
    }
    set((state) => ({
      suggestedUsers: state.suggestedUsers.filter((user) => user._id !== receiverId)
    }));
  },

  acceptRequest: async (requestId) => {
    await apiClient.post('/users/friends/accept', { requestId });
    get().markRequestResolved(requestId);
  },

  rejectRequest: async (requestId) => {
    await apiClient.post('/users/friends/reject', { requestId });
    get().markRequestResolved(requestId);
  },

  cancelRequest: async (requestId) => {
    await apiClient.post('/users/friends/cancel', { requestId });
    get().markRequestResolved(requestId);
  },

  removeFriend: async (friendId) => {
    await apiClient.post('/users/friends/remove', { friendId });
    get().removeRealtimeFriend({
      userId: useAuthStore.getState().user?._id || useAuthStore.getState().user?.id || '',
      friendId
    });
  },

  blockUserToggle: async (userId) => {
    const resp = await apiClient.post('/users/block', { userId });
    set((state) => ({
      blockedUsers: resp.data.blockedUsers,
      friends: state.friends.filter((friend) => friend._id !== userId),
      suggestedUsers: state.suggestedUsers.filter((user) => user._id !== userId)
    }));
  },

  muteUserToggle: async (userId) => {
    const resp = await apiClient.post('/users/mute', { userId });
    set({ mutedUsers: resp.data.mutedUsers });
  },

  addIncomingRequest: (request) => {
    set((state) => ({
      incomingRequests: [request, ...state.incomingRequests].filter((req, idx, self) =>
        self.findIndex((r) => r._id === req._id) === idx
      )
    }));
  },

  addOutgoingRequest: (request) => {
    set((state) => ({
      outgoingRequests: [request, ...state.outgoingRequests].filter((req, idx, self) =>
        self.findIndex((r) => r._id === req._id) === idx
      )
    }));
  },

  markRequestResolved: (requestId) => {
    set((state) => ({
      incomingRequests: state.incomingRequests.filter((req) => req._id !== requestId),
      outgoingRequests: state.outgoingRequests.filter((req) => req._id !== requestId)
    }));
  },

  addRealtimeFriend: ({ senderId, receiverId, senderUser, receiverUser }) => {
    const myId = useAuthStore.getState().user?._id || useAuthStore.getState().user?.id;
    const friend = myId === senderId ? receiverUser : senderUser;
    if (!friend) return;

    set((state) => ({
      friends: [friend, ...state.friends].filter((candidate, idx, self) =>
        self.findIndex((f) => f._id === candidate._id) === idx
      ),
      incomingRequests: state.incomingRequests.filter((req) => req.senderId?._id !== friend._id && req.receiverId?._id !== friend._id),
      outgoingRequests: state.outgoingRequests.filter((req) => req.senderId?._id !== friend._id && req.receiverId?._id !== friend._id),
      suggestedUsers: state.suggestedUsers.filter((u) => u._id !== friend._id)
    }));
  },

  removeRealtimeFriend: ({ userId, friendId }) => {
    const myId = useAuthStore.getState().user?._id || useAuthStore.getState().user?.id;
    const removedId = myId === userId ? friendId : userId;

    set((state) => ({
      friends: state.friends.filter((friend) => friend._id !== removedId)
    }));
  }
}));
