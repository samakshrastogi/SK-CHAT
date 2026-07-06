import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/User.js';
import { DeviceSession } from '../models/DeviceSession.js';
import { CustomError } from '../utils/customError.js';
import { sendVerificationOTP, sendResetPasswordOTP } from '../services/emailService.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

const googleOAuthClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// JWT Generation Helpers
const generateAccessToken = (user: any, deviceId: string) => {
  return jwt.sign(
    { id: user._id, email: user.email, username: user.username, role: user.role, deviceId },
    process.env.JWT_ACCESS_SECRET || 'supersecretaccesskeyconnect123!@#',
    { expiresIn: (process.env.JWT_ACCESS_EXPIRY || '15m') as any }
  );
};

const generateRefreshToken = (user: any, deviceId: string) => {
  return jwt.sign(
    { id: user._id, deviceId },
    process.env.JWT_REFRESH_SECRET || 'supersecretrefreshkeyconnect987!@#',
    { expiresIn: (process.env.JWT_REFRESH_EXPIRY || '7d') as any }
  );
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, username, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new CustomError('Email is already taken', 400);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const newUser = await User.create({
      email,
      username,
      password: hashedPassword,
      verificationToken: otp,
      verificationTokenExpires,
      isVerified: false, // OTP verification required!
    });

    // Send email with OTP
    await sendVerificationOTP(email, username, otp);

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email for the 6-digit verification code.',
    });
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { otp, email } = req.body;

    if (!otp || !email) {
      throw new CustomError('Email and OTP code are required', 400);
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
      verificationToken: otp,
      verificationTokenExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new CustomError('Verification OTP code is invalid or has expired', 400);
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! You can now log in.',
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { emailOrUsername, password, deviceType } = req.body;

    const user = await User.findOne({
      $or: [
        { email: emailOrUsername.toLowerCase() },
        { username: emailOrUsername }
      ]
    });

    if (!user || !user.password) {
      throw new CustomError('Invalid credentials', 401);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new CustomError('Invalid credentials', 401);
    }

    if (!user.isVerified) {
      throw new CustomError('Please verify your email address before logging in.', 403);
    }

    // Check if blocked by admin
    if (user.role === 'user' && user.status === 'offline' && user.bio === '[Banned]') {
      throw new CustomError('Your account has been suspended by the moderator team.', 403);
    }

    // Create session details
    const deviceId = crypto.randomUUID();
    const cleanDeviceType = deviceType || req.headers['user-agent'] || 'Unknown Device';
    const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';

    const accessToken = generateAccessToken(user, deviceId);
    const refreshToken = generateRefreshToken(user, deviceId);

    // Save device session
    const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await DeviceSession.create({
      userId: user._id,
      refreshToken: hashedToken,
      deviceId,
      deviceType: cleanDeviceType,
      ipAddress,
      lastActive: new Date()
    });

    // Set refresh token cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json({
      success: true,
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        coverImage: user.coverImage,
        bio: user.bio,
        role: user.role,
        themeSettings: user.themeSettings
      }
    });
  } catch (error) {
    next(error);
  }
};

const parseCookies = (cookieHeader: string | undefined): { [key: string]: string } => {
  const cookies: { [key: string]: string } = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    if (parts.length >= 2) {
      cookies[parts[0].trim()] = parts[1].trim();
    }
  });
  return cookies;
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cookies = req.cookies || parseCookies(req.headers.cookie);
    const token = cookies.refreshToken || req.body.refreshToken;
    if (token) {
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      await DeviceSession.findOneAndDelete({ refreshToken: hashedToken });
    }
    res.clearCookie('refreshToken');
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cookies = req.cookies || parseCookies(req.headers.cookie);
    const token = cookies.refreshToken || req.body.refreshToken;
    if (!token) {
      throw new CustomError('Refresh token required', 401);
    }

    const refreshSecret = process.env.JWT_REFRESH_SECRET || 'supersecretrefreshkeyconnect987!@#';
    jwt.verify(token, refreshSecret, async (err: any, decoded: any) => {
      if (err) {
        return next(new CustomError('Invalid or expired refresh token', 401));
      }

      try {
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const session = await DeviceSession.findOne({ refreshToken: hashedToken, isActive: true });
        
        if (!session) {
          return next(new CustomError('Active session not found', 401));
        }

        // Enforce 48 hours inactivity expiry
        const fortyEightHours = 48 * 60 * 60 * 1000;
        if (session.lastActive && (Date.now() - session.lastActive.getTime() > fortyEightHours)) {
          session.isActive = false;
          await session.save();
          res.clearCookie('refreshToken');
          return next(new CustomError('Session has expired due to 48 hours of inactivity', 401));
        }

        const user = await User.findById(decoded.id);
        if (!user) {
          return next(new CustomError('User not found', 401));
        }

        // Generate new credentials
        const deviceId = decoded.deviceId;
        const accessToken = generateAccessToken(user, deviceId);
        const newRefreshToken = generateRefreshToken(user, deviceId);

        // Rotate Refresh Token
        const newHashedToken = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
        session.refreshToken = newHashedToken;
        session.lastActive = new Date();
        await session.save();

        res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

        res.status(200).json({
          success: true,
          accessToken
        });
      } catch (innerError) {
        next(innerError);
      }
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      res.status(200).json({
        success: true,
        message: 'If a matching account exists, a 6-digit OTP has been sent to that address.',
      });
      return;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordToken = otp;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    await sendResetPasswordOTP(user.email, user.username, otp);

    res.status(200).json({
      success: true,
      message: 'If a matching account exists, a 6-digit OTP has been sent to that address.',
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { otp, email, newPassword } = req.body;

    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordToken: otp,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      throw new CustomError('Reset OTP is invalid or has expired', 400);
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Revoke all existing login sessions
    await DeviceSession.deleteMany({ userId: user._id });

    res.status(200).json({
      success: true,
      message: 'Password reset successful. All active sessions have been terminated. Please log in.',
    });
  } catch (error) {
    next(error);
  }
};

// Multi-Device Sessions
export const getActiveSessions = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const sessions = await DeviceSession.find({ userId: req.user!.id, isActive: true })
      .select('deviceType ipAddress lastActive deviceId')
      .sort({ lastActive: -1 });

    res.status(200).json({
      success: true,
      sessions: sessions.map(s => ({
        id: s._id,
        deviceType: s.deviceType,
        ipAddress: s.ipAddress,
        lastActive: s.lastActive,
        isCurrent: s.deviceId === req.user!.deviceId
      }))
    });
  } catch (error) {
    next(error);
  }
};

export const logoutSession = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const session = await DeviceSession.findOne({ _id: id, userId: req.user!.id });

    if (!session) {
      throw new CustomError('Session not found', 404);
    }

    await DeviceSession.findByIdAndDelete(id);

    // If logging out the current active device, clear client cookie
    if (session.deviceId === req.user!.deviceId) {
      res.clearCookie('refreshToken');
    }

    res.status(200).json({
      success: true,
      message: 'Device session terminated successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const logoutAllSessions = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await DeviceSession.deleteMany({ userId: req.user!.id });
    res.clearCookie('refreshToken');
    res.status(200).json({
      success: true,
      message: 'Logged out of all devices successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const googleSSO = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { credential } = req.body; // Google ID token sent from frontend

    if (!credential) {
      throw new CustomError('Google credential (ID token) is required', 400);
    }

    // Verify the ID token with Google's public keys
    const ticket = await googleOAuthClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new CustomError('Invalid Google token payload', 400);
    }

    const { email, name, picture, sub: googleId } = payload;
    const emailLower = email.toLowerCase();

    // Find existing user by email or googleId
    let user = await User.findOne({ $or: [{ email: emailLower }, { googleId }] });

    if (!user) {
      // New user — derive a unique username from their Google name
      let baseUsername = (name || emailLower.split('@')[0])
        .replace(/\s+/g, '')
        .slice(0, 20);
      let finalUsername = baseUsername;
      const taken = await User.findOne({ username: finalUsername });
      if (taken) {
        finalUsername = `${baseUsername}${Math.floor(1000 + Math.random() * 9000)}`;
      }

      // Random password — Google users never use it, but schema requires it
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(randomPassword, salt);

      user = await User.create({
        email: emailLower,
        username: finalUsername,
        password: hashedPassword,
        googleId,
        avatar: picture || undefined,
        isVerified: true, // Google already verified the email
      });
    } else if (!user.googleId) {
      // Existing email-based account — link Google ID now
      user.googleId = googleId;
      if (!user.avatar && picture) user.avatar = picture;
      await user.save();
    }

    const deviceId = crypto.randomUUID();
    const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';

    const accessToken = generateAccessToken(user, deviceId);
    const refreshToken = generateRefreshToken(user, deviceId);

    const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await DeviceSession.create({
      userId: user._id,
      refreshToken: hashedToken,
      deviceId,
      deviceType: 'Google SSO Web Client',
      ipAddress,
      lastActive: new Date(),
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        coverImage: user.coverImage,
        bio: user.bio,
        role: user.role,
        themeSettings: user.themeSettings,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const googleSSORedirect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      throw new CustomError('Google credential (ID token) is required', 400);
    }

    const ticket = await googleOAuthClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new CustomError('Invalid Google token payload', 400);
    }

    const { email, name, picture, sub: googleId } = payload;
    const emailLower = email.toLowerCase();

    let user = await User.findOne({ $or: [{ email: emailLower }, { googleId }] });

    if (!user) {
      let baseUsername = (name || emailLower.split('@')[0])
        .replace(/\s+/g, '')
        .slice(0, 20);
      let finalUsername = baseUsername;
      const taken = await User.findOne({ username: finalUsername });
      if (taken) {
        finalUsername = `${baseUsername}${Math.floor(1000 + Math.random() * 9000)}`;
      }

      const randomPassword = crypto.randomBytes(16).toString('hex');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(randomPassword, salt);

      user = await User.create({
        email: emailLower,
        username: finalUsername,
        password: hashedPassword,
        googleId,
        avatar: picture || undefined,
        isVerified: true,
      });
    } else if (!user.googleId) {
      user.googleId = googleId;
      if (!user.avatar && picture) user.avatar = picture;
      await user.save();
    }

    const deviceId = crypto.randomUUID();
    const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';

    const accessToken = generateAccessToken(user, deviceId);
    const refreshToken = generateRefreshToken(user, deviceId);

    const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await DeviceSession.create({
      userId: user._id,
      refreshToken: hashedToken,
      deviceId,
      deviceType: 'Google SSO Web Client Redirect',
      ipAddress,
      lastActive: new Date(),
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/login?token=${accessToken}`);
  } catch (error) {
    next(error);
  }
};
