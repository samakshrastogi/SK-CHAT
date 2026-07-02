import { Router } from 'express';
import {
  createStatus,
  getStatuses,
  viewStatus,
  likeStatus,
  deleteStatus
} from '../controllers/statusController.js';
import { authenticateJWT } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = Router();

router.use(authenticateJWT as any);

router.post('/', upload.single('file'), createStatus as any);
router.get('/', getStatuses as any);
router.post('/:statusId/view', viewStatus as any);
router.post('/:statusId/like', likeStatus as any);
router.delete('/:statusId', deleteStatus as any);

export default router;
