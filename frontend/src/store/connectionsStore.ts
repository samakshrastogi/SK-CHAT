import { create } from 'zustand';
import { User } from '../types/index.js';
import { apiClient } from '../api/client.js';

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
    await apiClient.post('/users/friends/request', { receiverId });
    await get().fetchRequests();
    await get().fetchDiscovery();
  },

  acceptRequest: async (requestId) => {
    await apiClient.post('/users/friends/accept', { requestId });
    await get().fetchRequests();
    await get().fetchFriends();
  },

  rejectRequest: async (requestId) => {
    await apiClient.post('/users/friends/reject', { requestId });
    await get().fetchRequests();
  },

  cancelRequest: async (requestId) => {
    await apiClient.post('/users/friends/cancel', { requestId });
    await get().fetchRequests();
    await get().fetchDiscovery();
  },

  removeFriend: async (friendId) => {
    await apiClient.post('/users/friends/remove', { friendId });
    await get().fetchFriends();
  },

  blockUserToggle: async (userId) => {
    const resp = await apiClient.post('/users/block', { userId });
    set({ blockedUsers: resp.data.blockedUsers });
    await get().fetchFriends();
    await get().fetchDiscovery();
  },

  muteUserToggle: async (userId) => {
    const resp = await apiClient.post('/users/mute', { userId });
    set({ mutedUsers: resp.data.mutedUsers });
  }
}));
