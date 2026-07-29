import { Router } from 'express';
import {
  askAI,
  getSmartRepliesRoute,
  summarizeChatRoute,
  translateRoute,
  rewriteRoute
} from '../controllers/aiController.js';
import { authenticateJWT } from '../middleware/authMiddleware.js';
import { enforceAIGovernance } from '../middleware/aiGovernanceMiddleware.js';
import { getAIPreference, updateAIPreference } from '../controllers/aiPreferenceController.js';

const router = Router();

router.use(authenticateJWT as any);
router.get('/preferences', getAIPreference as any);
router.put('/preferences', updateAIPreference as any);
router.use(enforceAIGovernance as any);

router.post('/ask', askAI as any);
router.get('/replies/:chatId', getSmartRepliesRoute as any);
router.get('/summarize/:chatId', summarizeChatRoute as any);
router.post('/translate', translateRoute as any);
router.post('/rewrite', rewriteRoute as any);

export default router;
