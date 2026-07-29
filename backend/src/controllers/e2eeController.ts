import crypto from 'node:crypto';
import type { NextFunction, Response } from 'express';
import { DeviceKey } from '../models/DeviceKey.js';
import { Chat } from '../models/Chat.js';
import type { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { CustomError } from '../utils/customError.js';

const fingerprintKey = (key: unknown) =>
  crypto.createHash('sha256').update(JSON.stringify(key)).digest('hex');

export const registerCurrentDeviceKey = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const deviceId = req.user?.deviceId;
    const publicKey = req.body?.publicKey;
    if (!deviceId) throw new CustomError('Authenticated device identifier required', 400);
    if (!publicKey || publicKey.kty !== 'EC' || publicKey.crv !== 'P-256' || !publicKey.x || !publicKey.y) {
      throw new CustomError('Valid P-256 public key required', 400);
    }
    const fingerprint = fingerprintKey(publicKey);
    const deviceKey = await DeviceKey.findOneAndUpdate(
      { userId: req.user!.id, deviceId },
      {
        $set: { publicKey, fingerprint, lastUsedAt: new Date() },
        $unset: { revokedAt: 1 },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();
    res.json({ success: true, deviceKey });
  } catch (error) {
    next(error);
  }
};

export const getParticipantDeviceKeys = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = String(req.params.userId);
    const chatId = String(req.query.chatId || '');
    const chat = await Chat.findOne({
      _id: chatId,
      isGroup: false,
      participants: { $all: [req.user!.id, userId] },
    });
    if (!chat) throw new CustomError('Direct chat not found or access denied', 404);
    const keys = await DeviceKey.find({ userId, revokedAt: { $exists: false } })
      .select('deviceId publicKey fingerprint lastUsedAt')
      .lean();
    res.json({ success: true, keys });
  } catch (error) {
    next(error);
  }
};

export const revokeCurrentDeviceKey = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user?.deviceId) throw new CustomError('Authenticated device identifier required', 400);
    await DeviceKey.updateOne(
      { userId: req.user.id, deviceId: req.user.deviceId },
      { $set: { revokedAt: new Date() } },
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};
