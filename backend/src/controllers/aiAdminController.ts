import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { AIRequestMetric } from '../models/AIRequestMetric.js';
import { getAISetting } from '../middleware/aiGovernanceMiddleware.js';
import { CustomError } from '../utils/customError.js';

export const getAIAdminSettings = async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try { res.json({ success: true, settings: await getAISetting() }); } catch (error) { next(error); }
};

export const updateAIAdminSettings = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const updates: Record<string, unknown> = {};
    if (typeof req.body.enabled === 'boolean') updates.enabled = req.body.enabled;
    for (const key of ['dailyRequestLimit', 'dailyInputCharacterLimit'] as const) {
      if (req.body[key] !== undefined) {
        const value = Number(req.body[key]);
        if (!Number.isInteger(value) || value < 1) throw new CustomError(`${key} must be a positive integer`, 400);
        updates[key] = value;
      }
    }
    if (req.body.policyVersion !== undefined) {
      const value = String(req.body.policyVersion).trim();
      if (!value || value.length > 40) throw new CustomError('Invalid policy version', 400);
      updates.policyVersion = value;
    }
    const setting = await (await import('../models/AISetting.js')).AISetting.findOneAndUpdate(
      { key: 'global' }, { $set: updates, $setOnInsert: { key: 'global' } },
      { upsert: true, new: true, runValidators: true }
    );
    res.json({ success: true, settings: setting });
  } catch (error) { next(error); }
};

export const getAIMetrics = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const days = Math.min(90, Math.max(1, Number(req.query.days || 7)));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const metrics = await AIRequestMetric.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: {
        _id: { feature: '$feature', status: '$status' },
        requests: { $sum: 1 },
        averageLatencyMs: { $avg: '$latencyMs' },
        inputCharacters: { $sum: '$inputCharacters' },
        outputCharacters: { $sum: '$outputCharacters' },
      } },
      { $sort: { '_id.feature': 1 } },
    ]);
    res.json({ success: true, days, metrics });
  } catch (error) { next(error); }
};
