import { Router } from 'express';
import {
  getDashboardStats,
  getUsersAdmin,
  toggleBanUser
} from '../controllers/adminController.js';
import { authenticateJWT, authorizeRoles } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateJWT as any);
router.use(authorizeRoles('admin', 'moderator') as any);

router.get('/stats', getDashboardStats as any);
router.get('/users', getUsersAdmin as any);
router.post('/users/:userId/ban', toggleBanUser as any);

export default router;
