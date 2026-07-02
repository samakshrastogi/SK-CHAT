import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  searchUsers,
  updateThemeSettings,
  blockUser,
  getBlockedUsers
} from '../controllers/userController.js';
import { authenticateJWT } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = Router();

router.use(authenticateJWT as any);

router.get('/profile', getProfile as any);
router.put(
  '/profile',
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 }
  ]),
  updateProfile as any
);

router.get('/search', searchUsers as any);
router.put('/theme', updateThemeSettings as any);
router.post('/block', blockUser as any);
router.get('/blocked', getBlockedUsers as any);

export default router;
