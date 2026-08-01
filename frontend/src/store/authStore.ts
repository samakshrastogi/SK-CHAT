import { create } from 'zustand';
import { User, DeviceSession } from '../types/index.js';
import { apiClient, setAccessTokenInMemory } from '../api/client.js';
import { getCentralProfile, requestCentralAppToken } from '../api/centralAuth.js';

let authCheckPromise: Promise<boolean> | null = null;
const getBrowserDeviceId = () => {
  const key = 'sk_connect_device_id';
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const created = window.crypto.randomUUID();
  window.localStorage.setItem(key, created);
  return created;
};

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessions: DeviceSession[];
  
  login: (emailOrUsername: string, password: string, deviceType?: string) => Promise<void>;
  clearLocalSession: () => Promise<void>;
  registerUser: (email: string, username: string, password: string) => Promise<void>;
  verifyEmailCode: (otp: string, email: string) => Promise<void>;
  googleLogin: (credential: string) => Promise<void>;
  checkAuth: () => Promise<boolean>;
  updateProfileData: (formData: FormData) => Promise<void>;
  updateThemePreferences: (theme: 'dark'|'light'|'system', accentColor: string, wallpaper?: string) => Promise<void>;
  fetchSessions: () => Promise<void>;
  terminateSession: (sessionId: string) => Promise<void>;
  terminateAllSessions: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  sessions: [],

  login: async (emailOrUsername, password, deviceType) => {
    set({ isLoading: true });
    try {
      const response = await apiClient.post('/auth/login', {
        emailOrUsername,
        password,
        deviceType
      });
      const { accessToken, user } = response.data;
      setAccessTokenInMemory(accessToken);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  clearLocalSession: async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // The local cookie may already be absent or expired.
    }
    setAccessTokenInMemory('');
    set({ user: null, isAuthenticated: false, isLoading: false, sessions: [] });
  },
  registerUser: async (email, username, password) => {
    set({ isLoading: true });
    try {
      await apiClient.post('/auth/register', { email, username, password });
      set({ isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  verifyEmailCode: async (otp, email) => {
    set({ isLoading: true });
    try {
      await apiClient.post('/auth/verify-otp', { otp, email });
      set({ isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  googleLogin: async (credential) => {
    set({ isLoading: true });
    try {
      const response = await apiClient.post('/auth/google-sso', { credential });
      const { accessToken, user } = response.data;
      setAccessTokenInMemory(accessToken);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  checkAuth: async () => {
    if (authCheckPromise) return authCheckPromise;

    set({ isLoading: true });
    authCheckPromise = (async () => {
      try {
        const centralToken = await requestCentralAppToken();
        const centralProfile = getCentralProfile();
        const response = await apiClient.post('/auth/central', {
          token: centralToken,
          deviceType: navigator.userAgent,
          deviceId: getBrowserDeviceId(),
          centralAvatar: centralProfile?.avatarUrl,
        });
        const { accessToken, user } = response.data;
        const connectedUser = {
          ...user,
          avatar: centralProfile?.avatarUrl || user.avatar,
          centralName: centralProfile?.name,
          avatarInitials: centralProfile?.avatarInitials
        };
        setAccessTokenInMemory(accessToken);
        set({ user: connectedUser, isAuthenticated: true, isLoading: false });
        return true;
      } catch {
        setAccessTokenInMemory('');
        set({ user: null, isAuthenticated: false, isLoading: false });
        return false;
      } finally {
        authCheckPromise = null;
      }
    })();

    return authCheckPromise;
  },
  updateProfileData: async (formData) => {
    set({ isLoading: true });
    try {
      const response = await apiClient.put('/users/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      set({ user: response.data.user, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  updateThemePreferences: async (theme, accentColor, wallpaper) => {
    try {
      const response = await apiClient.put('/users/theme', { theme, accentColor, wallpaper });
      if (get().user) {
        set({
          user: {
            ...get().user!,
            themeSettings: response.data.themeSettings
          }
        });
      }
    } catch (error) {
      throw error;
    }
  },

  fetchSessions: async () => {
    try {
      const response = await apiClient.get('/auth/sessions');
      set({ sessions: response.data.sessions });
    } catch (error) {
      throw error;
    }
  },

  terminateSession: async (sessionId) => {
    try {
      const target = get().sessions.find(s => s.id === sessionId);
      await apiClient.delete(`/auth/sessions/${sessionId}`);
      set({ sessions: get().sessions.filter(s => s.id !== sessionId) });
      
      // If we terminated our own session, clear state
      if (target?.isCurrent) {
        setAccessTokenInMemory('');
        set({ user: null, isAuthenticated: false });
      }
    } catch (error) {
      throw error;
    }
  },

  terminateAllSessions: async () => {
    try {
      await apiClient.delete('/auth/sessions/all');
    } catch (e) {}
    setAccessTokenInMemory('');
    set({ user: null, isAuthenticated: false, sessions: [] });
  }
}));
