import { Response, NextFunction } from 'express';
import { Status } from '../models/Status.js';
import { User } from '../models/User.js';
import { CustomError } from '../utils/customError.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { uploadMedia } from '../services/cloudinaryService.js';

export const createStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { type, content, caption, backgroundColor } = req.body;
    let finalContent = content;

    if (req.file) {
      const upload = await uploadMedia(req.file, 'statuses');
      finalContent = upload.url;
    }

    if (!finalContent) {
      throw new CustomError('Status content or media file is required', 400);
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 Hours

    const status = await Status.create({
      userId: req.user!.id,
      type: type || (req.file ? 'image' : 'text'),
      content: finalContent,
      caption: caption || '',
      backgroundColor: backgroundColor || '#1e1b4b', // Deep indigo/black
      expiresAt,
      views: [],
      likes: []
    });

    const populated = await Status.findById(status._id).populate('userId', 'username avatar');

    const io = req.app.get('io');
    if (io) {
      io.emit('status:new', populated);
    }

    res.status(201).json({ success: true, status: populated });
  } catch (error) {
    next(error);
  }
};

export const getStatuses = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Get all unexpired statuses
    const statuses = await Status.find({
      expiresAt: { $gt: new Date() }
    })
      .populate('userId', 'username avatar bio')
      .populate('views.userId', 'username avatar')
      .populate('likes', 'username avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, statuses });
  } catch (error) {
    next(error);
  }
};

export const viewStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { statusId } = req.params;
    const status = await Status.findById(statusId);

    if (!status) {
      throw new CustomError('Status not found or expired', 404);
    }

    // Check if user already viewed it
    const viewed = status.views.some(v => v.userId.toString() === req.user!.id);
    if (!viewed) {
      status.views.push({ userId: req.user!.id as any, viewedAt: new Date() });
      await status.save();

      const io = req.app.get('io');
      if (io) {
        io.emit('status:viewed', { statusId, views: status.views });
      }
    }

    res.status(200).json({ success: true, views: status.views });
  } catch (error) {
    next(error);
  }
};

export const likeStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { statusId } = req.params;
    const status = await Status.findById(statusId);

    if (!status) {
      throw new CustomError('Status not found or expired', 404);
    }

    const likeIdx = status.likes.indexOf(req.user!.id as any);
    let liked = false;

    if (likeIdx > -1) {
      status.likes.splice(likeIdx, 1);
    } else {
      status.likes.push(req.user!.id as any);
      liked = true;
    }

    await status.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('status:liked', { statusId, likes: status.likes });
    }

    res.status(200).json({ success: true, liked, likes: status.likes });
  } catch (error) {
    next(error);
  }
};

export const deleteStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { statusId } = req.params;
    const status = await Status.findOne({ _id: statusId, userId: req.user!.id });

    if (!status) {
      throw new CustomError('Status not found or unauthorized', 404);
    }

    await Status.findByIdAndDelete(statusId);

    const io = req.app.get('io');
    if (io) {
      io.emit('status:deleted', { statusId });
    }

    res.status(200).json({ success: true, message: 'Status deleted successfully' });
  } catch (error) {
    next(error);
  }
};
