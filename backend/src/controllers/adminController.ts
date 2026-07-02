import { Response, NextFunction } from 'express';
import { User } from '../models/User.js';
import { Message } from '../models/Message.js';
import { Chat } from '../models/Chat.js';
import { DeviceSession } from '../models/DeviceSession.js';
import { Community } from '../models/Community.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { CustomError } from '../utils/customError.js';

export const getDashboardStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ isVerified: true });
    const onlineUsers = await User.countDocuments({ status: 'online' });
    
    const totalMessages = await Message.countDocuments();
    const totalChats = await Chat.countDocuments();
    const totalCommunities = await Community.countDocuments();
    const activeSessions = await DeviceSession.countDocuments({ isActive: true });

    // Get last 7 days of message volumes
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const messagesOverTime = await Message.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      stats: {
        users: { total: totalUsers, verified: verifiedUsers, online: onlineUsers },
        messages: { total: totalMessages },
        chats: { total: totalChats },
        communities: { total: totalCommunities },
        sessions: { active: activeSessions },
        charts: { messagesOverTime }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getUsersAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const users = await User.find()
      .select('username email avatar bio role status lastSeen isVerified createdAt')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, users });
  } catch (error) {
    next(error);
  }
};

export const toggleBanUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    
    if (userId === req.user!.id) {
      throw new CustomError('You cannot ban yourself', 400);
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new CustomError('User not found', 404);
    }

    // Toggle ban state by replacing bio with [Banned] or restoring it
    const isBanned = user.bio === '[Banned]';
    if (isBanned) {
      user.bio = 'Hey there! I am using Connect.';
      user.status = 'offline';
    } else {
      user.bio = '[Banned]';
      user.status = 'offline';
      
      // Revoke all device sessions for this user
      await DeviceSession.deleteMany({ userId: user._id });
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: isBanned ? 'User successfully unbanned' : 'User successfully banned',
      user: {
        id: user._id,
        username: user.username,
        bio: user.bio
      }
    });
  } catch (error) {
    next(error);
  }
};
