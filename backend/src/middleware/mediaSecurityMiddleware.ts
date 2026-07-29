import fs from 'node:fs/promises';
import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from './authMiddleware.js';
import { UploadUsage } from '../models/UploadUsage.js';
import { CustomError } from '../utils/customError.js';
import { inspectUpload, scanUpload } from '../services/mediaSecurityService.js';

const filesFromRequest = (req: AuthenticatedRequest): Express.Multer.File[] => {
  if (req.file) return [req.file];
  if (Array.isArray(req.files)) return req.files;
  return Object.values(req.files || {}).flat();
};

export const cleanupUploadedFiles = async (files: Express.Multer.File[]) => {
  await Promise.all(files.filter((file) => file.path).map((file) =>
    fs.unlink(file.path).catch(() => undefined)
  ));
};

export const validateUploadedMedia = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const files = filesFromRequest(req);
  if (!files.length) return next();

  const bytes = files.reduce((total, file) => total + file.size, 0);
  const maxDailyBytes = Math.max(1, Number(process.env.UPLOAD_DAILY_QUOTA_MB || 250)) * 1024 * 1024;
  const maxDailyFiles = Math.max(1, Number(process.env.UPLOAD_DAILY_FILE_LIMIT || 100));
  const bucket = new Date().toISOString().slice(0, 10);
  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + 35);
  let reserved = false;

  try {
    if (bytes > maxDailyBytes || files.length > maxDailyFiles) {
      throw new CustomError('Daily upload quota exceeded', 429);
    }
    await Promise.all(files.map(async (file) => {
      await inspectUpload(file);
      await scanUpload(file);
    }));

    const usage = await UploadUsage.findOneAndUpdate(
      {
        userId: req.user!.id,
        bucket,
        bytes: { $lte: maxDailyBytes - bytes },
        files: { $lte: maxDailyFiles - files.length },
      },
      {
        $inc: { bytes, files: files.length },
        $setOnInsert: { expiresAt },
      },
      { upsert: true, new: true }
    ).catch((error: any) => {
      if (error?.code === 11000) return null;
      throw error;
    });

    if (!usage) throw new CustomError('Daily upload quota exceeded', 429);
    reserved = true;

    res.once('finish', () => {
      if (res.statusCode < 400) return;
      void UploadUsage.updateOne(
        { userId: req.user!.id, bucket },
        { $inc: { bytes: -bytes, files: -files.length } }
      );
      void cleanupUploadedFiles(files);
    });
    next();
  } catch (error) {
    if (reserved) {
      await UploadUsage.updateOne(
        { userId: req.user!.id, bucket },
        { $inc: { bytes: -bytes, files: -files.length } }
      );
    }
    await cleanupUploadedFiles(files);
    next(error);
  }
};
