import { Router } from 'express';
import {
  createCommunity,
  getCommunities,
  joinCommunity,
  addCommunityChannel
} from '../controllers/communityController.js';
import { authenticateJWT } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = Router();

router.use(authenticateJWT as any);

router.post(
  '/',
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'banner', maxCount: 1 }
  ]),
  createCommunity as any
);

router.get('/', getCommunities as any);
router.post('/join', joinCommunity as any);
router.post('/:communityId/channels', addCommunityChannel as any);

export default router;
