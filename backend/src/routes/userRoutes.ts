import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  searchUsers,
  updateThemeSettings,
  blockUser,
  getBlockedUsers,
  getDiscoveryUsers,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  removeFriend,
  getFriendsList,
  getFriendRequests,
  muteUser,
  getMutedUsers,
  generateConnectionCode,
  resolveConnectionCode
} from '../controllers/userController.js';
import { authenticateJWT } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';
import { validateUploadedMedia } from '../middleware/mediaSecurityMiddleware.js';

const router = Router();

router.use(authenticateJWT as any);

router.get('/profile', getProfile as any);
router.put(
  '/profile',
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 }
  ]),
  validateUploadedMedia as any,
  updateProfile as any
);

router.get('/search', searchUsers as any);
router.put('/theme', updateThemeSettings as any);
router.post('/block', blockUser as any);
router.get('/blocked', getBlockedUsers as any);

router.get('/discovery', getDiscoveryUsers as any);
router.post('/friends/request', sendFriendRequest as any);
router.post('/friends/accept', acceptFriendRequest as any);
router.post('/friends/reject', rejectFriendRequest as any);
router.post('/friends/cancel', cancelFriendRequest as any);
router.post('/friends/remove', removeFriend as any);
router.get('/friends', getFriendsList as any);
router.get('/friends/requests', getFriendRequests as any);
router.post('/mute', muteUser as any);
router.get('/muted', getMutedUsers as any);

router.post('/connections/generate-code', generateConnectionCode as any);
router.post('/connections/resolve-code', resolveConnectionCode as any);

export default router;
