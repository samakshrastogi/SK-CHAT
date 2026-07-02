import { Router } from 'express';
import {
  createChat,
  getChats,
  getChatMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  addReaction,
  toggleStarMessage,
  getStarredMessages,
  castVote,
  searchMessages
} from '../controllers/chatController.js';
import { authenticateJWT } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = Router();

router.use(authenticateJWT as any);

router.post('/', createChat as any);
router.get('/', getChats as any);
router.get('/search/messages', searchMessages as any);
router.get('/starred', getStarredMessages as any);

router.get('/:chatId/messages', getChatMessages as any);
router.post('/:chatId/messages', upload.single('file'), sendMessage as any);

router.put('/messages/:messageId', editMessage as any);
router.delete('/messages/:messageId', deleteMessage as any);
router.post('/messages/:messageId/react', addReaction as any);
router.post('/messages/:messageId/star', toggleStarMessage as any);
router.post('/messages/:messageId/vote', castVote as any);

export default router;
