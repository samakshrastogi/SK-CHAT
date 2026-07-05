import { Router } from 'express';
import {
  register,
  verifyEmail,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  getActiveSessions,
  logoutSession,
  logoutAllSessions,
  googleSSO,
  googleSSORedirect
} from '../controllers/authController.js';
import { registerValidator, loginValidator, resetPasswordValidator } from '../validators/authValidator.js';
import { authenticateJWT } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/register', registerValidator, register);
router.get('/verify', verifyEmail);
router.post('/verify-otp', verifyEmail);
router.post('/login', loginValidator, login);
router.post('/logout', logout);
router.post('/refresh', refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPasswordValidator, resetPassword);
router.post('/google-sso', googleSSO);
router.post('/google-sso-redirect', googleSSORedirect);

// Multi-Device Sessions (Protected)
router.get('/sessions', authenticateJWT as any, getActiveSessions as any);
router.delete('/sessions/all', authenticateJWT as any, logoutAllSessions as any);
router.delete('/sessions/:id', authenticateJWT as any, logoutSession as any);

export default router;
