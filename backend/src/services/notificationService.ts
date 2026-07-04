import { Server } from 'socket.io';
import { Notification, NotificationType } from '../models/Notification.js';
import { User } from '../models/User.js';
import mongoose from 'mongoose';

export interface CreateNotificationPayload {
  recipientId: string;
  actorId?: string;
  type: NotificationType;
  title: string;
  body: string;
  imageUrl?: string;
  referenceId?: string;
  referenceType?: 'chat' | 'community' | 'message' | 'user' | 'call';
  expiresInHours?: number;         // Auto-expire after N hours
}

let _io: Server | null = null;

/** Call once from socketHandler to inject the io instance */
export const initNotificationService = (io: Server) => {
  _io = io;
};

/**
 * Create a persistent notification AND push it in real-time via socket.
 * Also fires a Browser Push Notification if the recipient has a push subscription stored.
 */
export const createNotification = async (payload: CreateNotificationPayload): Promise<void> => {
  try {
    const expiresAt = payload.expiresInHours
      ? new Date(Date.now() + payload.expiresInHours * 3600 * 1000)
      : undefined;

    const notif = await Notification.create({
      recipientId: new mongoose.Types.ObjectId(payload.recipientId),
      actorId:     payload.actorId ? new mongoose.Types.ObjectId(payload.actorId) : undefined,
      type:        payload.type,
      title:       payload.title,
      body:        payload.body,
      imageUrl:    payload.imageUrl,
      referenceId:   payload.referenceId,
      referenceType: payload.referenceType,
      isDelivered: false,
      expiresAt,
    });

    // Real-time socket delivery
    if (_io) {
      _io.to(`user:${payload.recipientId}`).emit('notification:new', {
        _id:          notif._id.toString(),
        type:         notif.type,
        title:        notif.title,
        body:         notif.body,
        imageUrl:     notif.imageUrl,
        referenceId:  notif.referenceId,
        referenceType:notif.referenceType,
        actorId:      payload.actorId,
        isRead:       false,
        createdAt:    notif.createdAt,
      });

      // Mark as delivered
      await Notification.findByIdAndUpdate(notif._id, { isDelivered: true });
    }

    // Web Push (if subscription stored on user document)
    await sendWebPush(payload.recipientId, payload.title, payload.body, payload.imageUrl);
  } catch (err: any) {
    console.error('[NotificationService] createNotification failed:', err.message);
  }
};

/** Helper — send Web Push via web-push library if subscription exists */
const sendWebPush = async (userId: string, title: string, body: string, icon?: string) => {
  try {
    const userDoc = await User.findById(userId).select('pushSubscription').lean();
    if (!userDoc || !(userDoc as any).pushSubscription) return;

    // @ts-ignore
    const webpush = await import('web-push').catch(() => null);
    if (!webpush) return;

    const vapidPublic  = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
    const vapidEmail   = process.env.VAPID_EMAIL || 'mailto:admin@skconnect.app';

    if (!vapidPublic || !vapidPrivate) return;

    webpush.default.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate);

    await webpush.default.sendNotification(
      (userDoc as any).pushSubscription,
      JSON.stringify({ title, body, icon: icon || '/icon-192.png', badge: '/badge-72.png' })
    );
  } catch (err: any) {
    // Subscription expired or invalid — remove it
    if (err.statusCode === 410) {
      await User.findByIdAndUpdate(userId, { $unset: { pushSubscription: 1 } });
    }
  }
};
