import { Router } from 'express';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  savePushSubscription,
  removePushSubscription,
  getVapidPublicKey,
  getNotificationPreferences,
  updateNotificationPreferences,
} from '../controllers/notificationController.js';
import { authenticateJWT } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateJWT as any);

// Persisted notification preferences
router.get('/preferences', getNotificationPreferences as any);
router.put('/preferences', updateNotificationPreferences as any);

// Notification CRUD
router.get('/',               getNotifications as any);
router.get('/unread-count',   getUnreadCount   as any);
router.patch('/:id/read',     markAsRead       as any);
router.patch('/read-all',     markAllAsRead    as any);
router.delete('/:id',         deleteNotification    as any);
router.delete('/',            clearAllNotifications as any);

// Push Notification
router.get('/vapid-public-key',    getVapidPublicKey      as any);
router.post('/push-subscribe',     savePushSubscription   as any);
router.delete('/push-subscribe',   removePushSubscription as any);

export default router;
