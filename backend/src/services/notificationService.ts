import { Server } from 'socket.io';
import { Notification, NotificationType } from '../models/Notification.js';
import { User } from '../models/User.js';
import mongoose from 'mongoose';
import { NotificationPreference } from '../models/NotificationPreference.js';

export interface CreateNotificationPayload {
  recipientId: string;
  actorId?: string;
  type: NotificationType;
  title: string;
  body: string;
  imageUrl?: string;
  referenceId?: string;
  referenceType?: 'chat' | 'community' | 'message' | 'user' | 'call' | 'status';
  expiresInHours?: number;
  idempotencyKey?: string;         // Auto-expire after N hours
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
const isQuietHour = (preference: any) => {
  if (!preference?.quietHours?.enabled) return false;
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: preference.quietHours.timezone || 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date());
    const hour = Number(parts.find((part) => part.type === 'hour')?.value || 0);
    const minute = Number(parts.find((part) => part.type === 'minute')?.value || 0);
    const current = hour * 60 + minute;
    const parse = (value: string) => {
      const [h, m] = value.split(':').map(Number);
      return h * 60 + m;
    };
    const start = parse(preference.quietHours.start);
    const end = parse(preference.quietHours.end);
    return start <= end ? current >= start && current < end : current >= start || current < end;
  } catch {
    return false;
  }
};

export const createNotification = async (payload: CreateNotificationPayload): Promise<void> => {
  if (payload.type === 'new_message') return;
  try {
    const preference = await NotificationPreference.findOne({ userId: payload.recipientId }).lean();
    if (preference?.enabledTypes?.[payload.type] === false) return;

    const expiresAt = payload.expiresInHours
      ? new Date(Date.now() + payload.expiresInHours * 3600 * 1000)
      : undefined;

    const notificationData = {
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
      idempotencyKey: payload.idempotencyKey,
    };
    const notif = payload.idempotencyKey
      ? await Notification.findOneAndUpdate(
          { idempotencyKey: payload.idempotencyKey },
          { $setOnInsert: notificationData },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        )
      : await Notification.create(notificationData);

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

    // Durable push delivery; the Mongo-backed worker retries transient failures.
    if (isQuietHour(preference)) return;
    const { enqueueJob } = await import('./jobQueue.js');
    await enqueueJob('web_push', {
      userId: payload.recipientId,
      title: payload.title,
      body: payload.body,
      icon: payload.imageUrl,
    }, { idempotencyKey: `web-push:${notif._id.toString()}` });
  } catch (err: any) {
    console.error('[NotificationService] createNotification failed:', err.message);
  }
};

/** Helper — send Web Push via web-push library if subscription exists */
export const deliverWebPush = async (userId: string, title: string, body: string, icon?: string) => {
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
