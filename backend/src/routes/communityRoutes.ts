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
  searchPublicCommunities,
  createCommunityRole,
  assignMemberRole,
  createCommunityEvent,
  rsvpToEvent,
  banCommunityMember,
  unbanCommunityMember,
  getCommunityAuditLog
} from '../controllers/communityController.js';
import { authenticateJWT } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';
import { validateUploadedMedia } from '../middleware/mediaSecurityMiddleware.js';

const router = Router();

router.use(authenticateJWT as any);

router.post(
  '/',
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'banner', maxCount: 1 }
  ]),
  validateUploadedMedia as any,
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
  validateUploadedMedia as any,
  updateCommunitySettings as any
);
router.get('/explore', searchPublicCommunities as any);

// Roles & Badges Management
router.post('/:communityId/roles', createCommunityRole as any);
router.post('/:communityId/members/:userId/role', assignMemberRole as any);

// Events & RSVPs
router.post('/:communityId/events', createCommunityEvent as any);
router.post('/:communityId/events/:eventId/rsvp', rsvpToEvent as any);
router.post('/:communityId/members/:userId/ban', banCommunityMember as any);
router.delete('/:communityId/members/:userId/ban', unbanCommunityMember as any);
router.get('/:communityId/audit-log', getCommunityAuditLog as any);

export default router;
