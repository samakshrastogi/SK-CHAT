import { Router } from 'express';
import {
  getCallHistory,
  logCallStart,
  logCallEnd,
  getIceServers
} from '../controllers/callController.js';
import { authenticateJWT } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateJWT as any);

router.get('/history', getCallHistory as any);
router.get('/ice-servers', getIceServers as any);
router.post('/start', logCallStart as any);
router.put('/:callId/end', logCallEnd as any);

export default router;
