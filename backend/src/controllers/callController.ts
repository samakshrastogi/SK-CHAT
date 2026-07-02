import { Response, NextFunction } from 'express';
import { Call } from '../models/Call.js';
import { CustomError } from '../utils/customError.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

export const getCallHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const calls = await Call.find({
      $or: [
        { callerId: req.user!.id },
        { receiverId: req.user!.id }
      ]
    })
      .populate('callerId', 'username avatar')
      .populate('receiverId', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({ success: true, calls });
  } catch (error) {
    next(error);
  }
};

export const logCallStart = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { receiverId, chatId, type } = req.body;

    const call = await Call.create({
      callerId: req.user!.id,
      receiverId,
      chatId,
      type,
      status: 'initiated',
      startedAt: new Date()
    });

    res.status(201).json({ success: true, call });
  } catch (error) {
    next(error);
  }
};

export const logCallEnd = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { callId } = req.params;
    const { status, duration } = req.body; // status: completed, rejected, missed, busy etc

    const call = await Call.findById(callId);
    if (!call) {
      throw new CustomError('Call record not found', 404);
    }

    call.status = status || 'completed';
    call.endedAt = new Date();
    call.duration = duration || Math.round((call.endedAt.getTime() - (call.startedAt || new Date()).getTime()) / 1000);
    await call.save();

    res.status(200).json({ success: true, call });
  } catch (error) {
    next(error);
  }
};
