import { Router } from 'express';
import { authenticateJWT } from '../middleware/authMiddleware.js';
import {
  getParticipantDeviceKeys,
  registerCurrentDeviceKey,
  revokeCurrentDeviceKey,
} from '../controllers/e2eeController.js';

const router = Router();
router.use(authenticateJWT as any);
router.put('/keys/current', registerCurrentDeviceKey as any);
router.delete('/keys/current', revokeCurrentDeviceKey as any);
router.get('/keys/:userId', getParticipantDeviceKeys as any);

export default router;
