import { Router } from 'express';
import {
  askAI,
  getSmartRepliesRoute,
  summarizeChatRoute,
  translateRoute,
  rewriteRoute
} from '../controllers/aiController.js';
import { authenticateJWT } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateJWT as any);

router.post('/ask', askAI as any);
router.get('/replies/:chatId', getSmartRepliesRoute as any);
router.get('/summarize/:chatId', summarizeChatRoute as any);
router.post('/translate', translateRoute as any);
router.post('/rewrite', rewriteRoute as any);

export default router;
