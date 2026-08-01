import { Response, NextFunction } from 'express';
import { Call } from '../models/Call.js';
import { CustomError } from '../utils/customError.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { Chat } from '../models/Chat.js';
import { buildIceServers } from '../services/turnService.js';

export const getCallHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const calls = await Call.find({
      $or: [
        { callerId: req.user!.id },
        { receiverId: req.user!.id },
        { participants: req.user!.id }
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

    if (receiverId === req.user!.id) throw new CustomError('A valid receiver is required', 400);
    if (!['voice', 'video'].includes(type)) {
      throw new CustomError('Call type must be voice or video', 400);
    }
    const chat = await Chat.findOne({ _id: chatId, participants: req.user!.id });
    if (!chat) throw new CustomError('Call chat not found or access denied', 404);
    if (!chat.isGroup && !receiverId) throw new CustomError('A receiver is required for direct calls', 400);
    if (receiverId && !chat.participants.some((id) => id.toString() === receiverId)) throw new CustomError('Receiver is not a chat member', 403);
    const participants = chat.participants.filter((id) => id.toString() !== req.user!.id);
    if (chat.isGroup && participants.length === 0) throw new CustomError('No other group members are available', 400);

    const call = await Call.create({
      callerId: req.user!.id,
      receiverId: receiverId || undefined,
      participants: chat.isGroup ? chat.participants : [req.user!.id, receiverId],
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

    const call = await Call.findOne({
      _id: callId,
      $or: [{ callerId: req.user!.id }, { receiverId: req.user!.id }, { participants: req.user!.id }],
    });
    if (!call) {
      throw new CustomError('Call record not found', 404);
    }

    const allowedStatuses = ['connected', 'rejected', 'missed', 'completed', 'busy'];
    if (status && !allowedStatuses.includes(status)) throw new CustomError('Invalid call status', 400);
    call.status = status || 'completed';
    call.endedAt = new Date();
    call.duration = duration || Math.round((call.endedAt.getTime() - (call.startedAt || new Date()).getTime()) / 1000);
    await call.save();

    res.status(200).json({ success: true, call });
  } catch (error) {
    next(error);
  }
};


export const getIceServers = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, ...buildIceServers(req.user!.id) });
  } catch (error) {
    next(error);
  }
};
