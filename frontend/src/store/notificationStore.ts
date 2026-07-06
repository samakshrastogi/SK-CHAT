import { create } from 'zustand';
import type { Notification as AppNotification } from '../types/index.js';
import { apiClient } from '../api/client.js';

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  hasMore: boolean;
  page: number;

  fetchNotifications: (reset?: boolean) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;

  // Real-time socket push
  addIncomingNotification: (notif: AppNotification) => void;
  applyNotificationRead: (id: string) => void;
  applyAllNotificationsRead: () => void;
  removeLocalNotification: (id: string) => void;
  clearLocalNotifications: () => void;

  // Push subscription
  subscribeToPush: () => Promise<void>;
  unsubscribeFromPush: () => Promise<void>;

  // Browser notification permission
  requestBrowserPermission: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [] as AppNotification[],
  unreadCount: 0,
  isLoading: false,
  hasMore: true,
  page: 1,

  fetchNotifications: async (reset = false) => {
    set({ isLoading: true });
    const nextPage = reset ? 1 : get().page;
    try {
      const res = await apiClient.get('/notifications', { params: { page: nextPage, limit: 20 } });
      const incoming: AppNotification[] = res.data.notifications;
      set((state) => ({
        notifications: reset
          ? incoming
          : [...state.notifications, ...incoming].filter(
              (n, i, self) => self.findIndex((x) => x._id === n._id) === i
            ),
        unreadCount: res.data.totalUnread,
        page: reset ? 2 : state.page + 1,
        hasMore: incoming.length === 20,
        isLoading: false,
      }));
    } catch {
      set({ isLoading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const res = await apiClient.get('/notifications/unread-count');
      set({ unreadCount: res.data.count });
    } catch { /* silent */ }
  },

  markAsRead: async (id) => {
    await apiClient.patch(`/notifications/${id}/read`);
    get().applyNotificationRead(id);
  },

  applyNotificationRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n._id === id ? { ...n, isRead: true } : n
      ),
      unreadCount: state.notifications.some((n) => n._id === id && !n.isRead)
        ? Math.max(0, state.unreadCount - 1)
        : state.unreadCount,
    }));
  },

  markAllAsRead: async () => {
    await apiClient.patch('/notifications/read-all');
    get().applyAllNotificationsRead();
  },

  applyAllNotificationsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    }));
  },

  deleteNotification: async (id) => {
    await apiClient.delete(`/notifications/${id}`);
    get().removeLocalNotification(id);
  },

  removeLocalNotification: (id) => {
    const notif = get().notifications.find((n) => n._id === id);
    set((state) => ({
      notifications: state.notifications.filter((n) => n._id !== id),
      unreadCount: notif && !notif.isRead
        ? Math.max(0, state.unreadCount - 1)
        : state.unreadCount,
    }));
  },

  clearAll: async () => {
    await apiClient.delete('/notifications');
    get().clearLocalNotifications();
  },

  clearLocalNotifications: () => {
    set({ notifications: [], unreadCount: 0 });
  },

  addIncomingNotification: (notif: AppNotification) => {
    set((state) => {
      // Avoid duplicates
      if (state.notifications.some((n) => n._id === notif._id)) return {};
      return {
        notifications: [notif, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      };
    });

    // Fire Browser Notification if permission granted
    if (typeof window !== 'undefined' && window.Notification && window.Notification.permission === 'granted') {
      new window.Notification(notif.title, {
        body: notif.body,
        icon: notif.imageUrl || '/icon-192.png',
        badge: '/badge-72.png',
        tag: notif._id,
      });
    }
  },

  requestBrowserPermission: async () => {
    if (typeof window === 'undefined') return;
    if (window.Notification && window.Notification.permission === 'default') {
      await window.Notification.requestPermission();
    }
  },

  subscribeToPush: async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const vapidRes = await apiClient.get('/notifications/vapid-public-key');
      const vapidKey = vapidRes.data.key;
      if (!vapidKey) return;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as ArrayBuffer,
      });

      await apiClient.post('/notifications/push-subscribe', { subscription: sub.toJSON() });
    } catch (err) {
      console.warn('[Push] Subscribe failed:', err);
    }
  },

  unsubscribeFromPush: async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      await apiClient.delete('/notifications/push-subscribe');
    } catch (err) {
      console.warn('[Push] Unsubscribe failed:', err);
    }
  },
}));

// Helper — convert base64 VAPID public key to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}
