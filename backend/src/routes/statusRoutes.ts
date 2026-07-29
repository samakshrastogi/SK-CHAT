import { Router } from 'express';
import {
  createStatus,
  getStatuses,
  viewStatus,
  likeStatus,
  deleteStatus,
  voteStatusPoll,
  answerStatusQuestion,
  respondStatusSlider
} from '../controllers/statusController.js';
import { authenticateJWT } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';
import { validateUploadedMedia } from '../middleware/mediaSecurityMiddleware.js';

const router = Router();

router.use(authenticateJWT as any);

router.post('/', upload.single('file'), validateUploadedMedia as any, createStatus as any);
router.get('/', getStatuses as any);
router.post('/:statusId/view', viewStatus as any);
router.post('/:statusId/like', likeStatus as any);
router.put('/:statusId/poll', voteStatusPoll as any);
router.put('/:statusId/question', answerStatusQuestion as any);
router.put('/:statusId/slider', respondStatusSlider as any);
router.delete('/:statusId', deleteStatus as any);

export default router;
