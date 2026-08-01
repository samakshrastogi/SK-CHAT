import { Request, Response, NextFunction } from 'express';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { NotificationPreference } from '../models/NotificationPreference.js';

/** GET /api/notifications?page=1&limit=20 */
export const getNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const page   = parseInt(req.query.page as string)  || 1;
    const limit  = parseInt(req.query.limit as string) || 20;
    const skip   = (page - 1) * limit;

    const [notifications, totalUnread] = await Promise.all([
      Notification.find({ recipientId: userId, type: { $ne: 'new_message' } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('actorId', 'username avatar')
        .lean(),
      Notification.countDocuments({ recipientId: userId, isRead: false, type: { $ne: 'new_message' } }),
    ]);

    res.json({ notifications, totalUnread, page, limit });
  } catch (err) {
    next(err);
  }
};

/** GET /api/notifications/unread-count */
export const getUnreadCount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const count  = await Notification.countDocuments({ recipientId: userId, isRead: false, type: { $ne: 'new_message' } });
    res.json({ count });
  } catch (err) {
    next(err);
  }
};

/** PATCH /api/notifications/:id/read */
export const markAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: userId },
      { isRead: true }
    );
    req.app.get('io')?.to(`user:${userId}`).emit('notification:read', {
      notificationId: req.params.id
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

/** PATCH /api/notifications/read-all */
export const markAllAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    await Notification.updateMany({ recipientId: userId, isRead: false }, { isRead: true });
    req.app.get('io')?.to(`user:${userId}`).emit('notification:read-all');
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/notifications/:id */
export const deleteNotification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    await Notification.findOneAndDelete({ _id: req.params.id, recipientId: userId });
    req.app.get('io')?.to(`user:${userId}`).emit('notification:deleted', {
      notificationId: req.params.id
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/notifications */
export const clearAllNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    await Notification.deleteMany({ recipientId: userId });
    req.app.get('io')?.to(`user:${userId}`).emit('notification:cleared');
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

/** POST /api/notifications/push-subscribe  — Save Web Push subscription */
export const savePushSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId       = (req as any).user.id;
    const subscription = req.body.subscription;
    if (!subscription) return res.status(400).json({ message: 'subscription required' });

    await User.findByIdAndUpdate(userId, { pushSubscription: subscription });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/notifications/push-subscribe — Unsubscribe */
export const removePushSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    await User.findByIdAndUpdate(userId, { $unset: { pushSubscription: 1 } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

/** GET /api/notifications/vapid-public-key — for SW registration */
export const getVapidPublicKey = async (_req: Request, res: Response) => {
  const key = process.env.VAPID_PUBLIC_KEY || '';
  res.json({ key });
};


export const getNotificationPreferences = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const preference = await NotificationPreference.findOneAndUpdate(
      { userId },
      { $setOnInsert: { userId } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();
    res.json({ preferences: preference });
  } catch (error) {
    next(error);
  }
};

export const updateNotificationPreferences = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const enabledTypes = req.body?.enabledTypes || {};
    const quietHours = req.body?.quietHours;
    const allowedTypes = new Set([
      'new_message', 'mention', 'friend_request', 'friend_request_accepted',
      'community_invitation', 'community_join_request', 'community_join_approved',
      'event_reminder', 'reaction', 'reply', 'call_missed', 'group_added', 'system',
    ]);
    const sanitizedTypes = Object.fromEntries(
      Object.entries(enabledTypes).filter(([key, value]) => allowedTypes.has(key) && typeof value === 'boolean'),
    );
    const update: Record<string, unknown> = { enabledTypes: sanitizedTypes };
    if (quietHours) {
      const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
      if (!timePattern.test(quietHours.start) || !timePattern.test(quietHours.end)) {
        return res.status(400).json({ message: 'Quiet hours must use HH:mm format' });
      }
      try {
        new Intl.DateTimeFormat('en', { timeZone: quietHours.timezone }).format();
      } catch {
        return res.status(400).json({ message: 'Invalid quiet-hours timezone' });
      }
      update.quietHours = {
        enabled: Boolean(quietHours.enabled),
        start: quietHours.start,
        end: quietHours.end,
        timezone: quietHours.timezone,
      };
    }
    const preferences = await NotificationPreference.findOneAndUpdate(
      { userId },
      { $set: update, $setOnInsert: { userId } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();
    res.json({ preferences });
  } catch (error) {
    next(error);
  }
};
