import { create } from 'zustand';
import { User, DeviceSession } from '../types/index.js';
import { apiClient, setAccessTokenInMemory } from '../api/client.js';
import { logoutFromCentral, requestCentralAppToken } from '../api/centralAuth.js';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessions: DeviceSession[];
  
  login: (emailOrUsername: string, password: string, deviceType?: string) => Promise<void>;
  logout: () => Promise<void>;
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

  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
      await logoutFromCentral();
    } catch (e) {
      // Ignore cleanup error
    } finally {
      setAccessTokenInMemory('');
      set({ user: null, isAuthenticated: false, sessions: [] });
    }
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
    set({ isLoading: true });
    try {
      // Attempt token rotation. If refresh cookie is valid, this returns a new accessToken
      const response = await apiClient.post('/auth/refresh');
      const { accessToken } = response.data;
      setAccessTokenInMemory(accessToken);
      
      const profileResp = await apiClient.get('/users/profile');
      set({ user: profileResp.data.user, isAuthenticated: true, isLoading: false });
      return true;
    } catch (err) {
      try {
        const centralToken = await requestCentralAppToken();
        const response = await apiClient.post('/auth/central', { token: centralToken, deviceType: navigator.userAgent });
        const { accessToken, user } = response.data;
        setAccessTokenInMemory(accessToken);
        set({ user, isAuthenticated: true, isLoading: false });
        return true;
      } catch {
        setAccessTokenInMemory('');
        set({ user: null, isAuthenticated: false, isLoading: false });
        return false;
      }
    }
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
      await apiClient.delete(`/auth/sessions/${sessionId}`);
      set({ sessions: get().sessions.filter(s => s.id !== sessionId) });
      
      // If we terminated our own session, clear state
      const target = get().sessions.find(s => s.id === sessionId);
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
