import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { CustomError } from '../utils/customError.js';
import { User } from '../models/User.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    role: 'user' | 'moderator' | 'admin';
    deviceId: string;
  };
}

export const authenticateJWT = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new CustomError('Access token required', 401);
    }

    const token = authHeader.split(' ')[1];
    const accessSecret = process.env.JWT_ACCESS_SECRET || 'supersecretaccesskeyconnect123!@#';

    jwt.verify(token, accessSecret, async (err, decoded: any) => {
      if (err) {
        return next(new CustomError('Invalid or expired access token', 401));
      }

      try {
        const user = await User.findById(decoded.id);
        if (!user) {
          return next(new CustomError('User no longer exists', 401));
        }

        if (!user.isVerified) {
          return next(new CustomError('Please verify your email address to access this feature', 403));
        }

        // Check if user is blocked (banned) by admin
        if (user.role === 'user' && user.status === 'offline' && user.bio === '[Banned]') {
          return next(new CustomError('Your account has been suspended by the moderator team.', 403));
        }

        req.user = {
          id: decoded.id,
          email: decoded.email,
          username: decoded.username,
          role: decoded.role || user.role,
          deviceId: decoded.deviceId
        };

        next();
      } catch (innerError) {
        next(innerError);
      }
    });
  } catch (error) {
    next(error);
  }
};

export const authorizeRoles = (...roles: ('user' | 'moderator' | 'admin')[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new CustomError('Forbidden: You do not have permission to access this resource', 403));
    }
    next();
  };
};
