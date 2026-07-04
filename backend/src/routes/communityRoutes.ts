import { Router } from 'express';
import {
  createCommunity,
  getCommunities,
  joinCommunity,
  addCommunityChannel,
  leaveCommunity,
  requestToJoinCommunity,
  getJoinRequests,
  actionJoinRequest,
  updateCommunitySettings,
  searchPublicCommunities
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

router.post('/join-request', requestToJoinCommunity as any);
router.get('/:communityId/requests', getJoinRequests as any);
router.post('/requests/:requestId', actionJoinRequest as any);
router.delete('/:communityId/leave', leaveCommunity as any);
router.put(
  '/:communityId',
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'banner', maxCount: 1 }
  ]),
  updateCommunitySettings as any
);
router.get('/explore', searchPublicCommunities as any);

export default router;
