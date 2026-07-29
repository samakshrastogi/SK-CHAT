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
  searchMessages,
  togglePinMessage,
  generateInviteLink,
  joinChatGroup,
  updateChatSettings,
  updateGroupProfile,
  addGroupMember,
  removeGroupMember,
  leaveGroup,
  getGroupSharedMedia,
  getGroupSharedFiles,
  getChatPreferences,
  updateChatPreferences
} from '../controllers/chatController.js';
import { authenticateJWT } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = Router();

router.use(authenticateJWT as any);

router.post('/', createChat as any);
router.get('/', getChats as any);
router.get('/search/messages', searchMessages as any);
router.get('/starred', getStarredMessages as any);
router.post('/:chatId/invite-link', generateInviteLink as any);
router.post('/join/:codeOrToken', joinChatGroup as any);
router.patch('/:chatId/settings', updateChatSettings as any);
router.put('/:chatId', upload.single('avatar'), updateGroupProfile as any);
router.post('/:chatId/members', addGroupMember as any);
router.delete('/:chatId/members/:userId', removeGroupMember as any);
router.post('/:chatId/leave', leaveGroup as any);
router.get('/:chatId/media', getGroupSharedMedia as any);
router.get('/:chatId/files', getGroupSharedFiles as any);

router.get('/:chatId/preferences', getChatPreferences as any);
router.put('/:chatId/preferences', updateChatPreferences as any);
router.get('/:chatId/messages', getChatMessages as any);
router.post('/:chatId/messages', upload.single('file'), sendMessage as any);
router.post('/:chatId/pin', togglePinMessage as any);

router.put('/messages/:messageId', editMessage as any);
router.delete('/messages/:messageId', deleteMessage as any);
router.post('/messages/:messageId/react', addReaction as any);
router.post('/messages/:messageId/star', toggleStarMessage as any);
router.post('/messages/:messageId/vote', castVote as any);

export default router;
