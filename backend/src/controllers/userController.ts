import { Response, NextFunction } from 'express';
import { User } from '../models/User.js';
import { CustomError } from '../utils/customError.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { uploadMedia } from '../services/cloudinaryService.js';

export const getProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user!.id)
      .select('-password -verificationToken -resetPasswordToken');
    if (!user) {
      throw new CustomError('User not found', 404);
    }
    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { bio, username } = req.body;
    const updateData: any = {};

    if (bio !== undefined) updateData.bio = bio;
    
    if (username) {
      // Verify username is not taken
      const existing = await User.findOne({ username, _id: { $ne: req.user!.id } });
      if (existing) {
        throw new CustomError('Username is already taken', 400);
      }
      updateData.username = username;
    }

    // Check files
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    if (files) {
      if (files.avatar && files.avatar[0]) {
        const upload = await uploadMedia(files.avatar[0], 'avatars');
        updateData.avatar = upload.url;
      }
      if (files.coverImage && files.coverImage[0]) {
        const upload = await uploadMedia(files.coverImage[0], 'covers');
        updateData.coverImage = upload.url;
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user!.id,
      { $set: updateData },
      { new: true }
    ).select('-password');

    res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
    next(error);
  }
};

export const searchUsers = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      res.status(200).json({ success: true, users: [] });
      return;
    }

    const users = await User.find({
      $and: [
        { _id: { $ne: req.user!.id } },
        { isVerified: true },
        {
          $or: [
            { username: { $regex: q, $options: 'i' } },
            { email: { $regex: q, $options: 'i' } }
          ]
        }
      ]
    })
      .select('username avatar email bio status lastSeen')
      .limit(20);

    res.status(200).json({ success: true, users });
  } catch (error) {
    next(error);
  }
};

export const updateThemeSettings = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { theme, accentColor, wallpaper } = req.body;
    const settingsUpdate: any = {};

    if (theme) settingsUpdate['themeSettings.theme'] = theme;
    if (accentColor) settingsUpdate['themeSettings.accentColor'] = accentColor;
    if (wallpaper !== undefined) settingsUpdate['themeSettings.wallpaper'] = wallpaper;

    const user = await User.findByIdAndUpdate(
      req.user!.id,
      { $set: settingsUpdate },
      { new: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      themeSettings: user!.themeSettings
    });
  } catch (error) {
    next(error);
  }
};

export const blockUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.body;
    if (userId === req.user!.id) {
      throw new CustomError('You cannot block yourself', 400);
    }

    const userToBlock = await User.findById(userId);
    if (!userToBlock) {
      throw new CustomError('User to block not found', 404);
    }

    const user = await User.findById(req.user!.id);
    const alreadyBlocked = user!.blockedUsers.includes(userId);

    const update = alreadyBlocked
      ? { $pull: { blockedUsers: userId } }
      : { $addToSet: { blockedUsers: userId } };

    const updated = await User.findByIdAndUpdate(
      req.user!.id,
      update,
      { new: true }
    ).populate('blockedUsers', 'username avatar bio email');

    res.status(200).json({
      success: true,
      blockedUsers: updated!.blockedUsers,
      message: alreadyBlocked ? 'User unblocked' : 'User blocked'
    });
  } catch (error) {
    next(error);
  }
};

export const getBlockedUsers = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user!.id)
      .populate('blockedUsers', 'username avatar bio email');
    res.status(200).json({
      success: true,
      blockedUsers: user!.blockedUsers
    });
  } catch (error) {
    next(error);
  }
};
