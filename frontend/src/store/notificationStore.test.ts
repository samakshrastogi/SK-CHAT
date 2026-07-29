import { beforeEach, describe, expect, it } from 'vitest';
import { useNotificationStore } from './notificationStore.js';

const notification = {
  _id: 'notification-1',
  recipientId: 'user-1',
  type: 'new_message' as const,
  title: 'New message',
  body: 'Hello',
  isRead: false,
  isDelivered: true,
  createdAt: new Date().toISOString(),
};

describe('notification store realtime updates', () => {
  beforeEach(() => {
    useNotificationStore.setState({ notifications: [], unreadCount: 0 });
  });

  it('adds an incoming notification exactly once', () => {
    useNotificationStore.getState().addIncomingNotification(notification);
    useNotificationStore.getState().addIncomingNotification(notification);

    expect(useNotificationStore.getState().notifications).toHaveLength(1);
    expect(useNotificationStore.getState().unreadCount).toBe(1);
  });

  it('marks an unread notification as read and decrements the count', () => {
    useNotificationStore.getState().addIncomingNotification(notification);
    useNotificationStore.getState().applyNotificationRead(notification._id);

    expect(useNotificationStore.getState().notifications[0].isRead).toBe(true);
    expect(useNotificationStore.getState().unreadCount).toBe(0);
  });
});
