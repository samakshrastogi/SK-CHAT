import { Router, type NextFunction, type Request, type Response } from 'express';
import {
  getDashboardStats,
  getUsersAdmin,
  toggleBanUser
} from '../controllers/adminController.js';
import { authenticateJWT, authorizeRoles } from '../middleware/authMiddleware.js';
import { getAIAdminSettings, updateAIAdminSettings, getAIMetrics } from '../controllers/aiAdminController.js';

const router = Router();

const requireCentralServiceToken = (req: Request, res: Response, next: NextFunction) => {
  const configured = process.env.SK_CENTRAL_SERVICE_TOKEN?.trim();
  const received = req.header("x-sk-central-token")?.trim();
  if (configured && received === configured) return next();
  return res.status(401).json({ success: false, message: "Valid SK Central service token required" });
};

router.get("/central-insights", requireCentralServiceToken, getDashboardStats as any);

router.use(authenticateJWT as any);
router.use(authorizeRoles('admin', 'moderator') as any);

router.get('/stats', getDashboardStats as any);
router.get('/users', getUsersAdmin as any);
router.post('/users/:userId/ban', toggleBanUser as any);
router.get('/ai/settings', getAIAdminSettings as any);
router.put('/ai/settings', authorizeRoles('admin') as any, updateAIAdminSettings as any);
router.get('/ai/metrics', getAIMetrics as any);

export default router;
