import { Request, Response, NextFunction } from 'express';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';

/** GET /api/notifications?page=1&limit=20 */
export const getNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const page   = parseInt(req.query.page as string)  || 1;
    const limit  = parseInt(req.query.limit as string) || 20;
    const skip   = (page - 1) * limit;

    const [notifications, totalUnread] = await Promise.all([
      Notification.find({ recipientId: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('actorId', 'username avatar')
        .lean(),
      Notification.countDocuments({ recipientId: userId, isRead: false }),
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
    const count  = await Notification.countDocuments({ recipientId: userId, isRead: false });
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
