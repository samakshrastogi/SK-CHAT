import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from './authMiddleware.js';
import { AIPreference } from '../models/AIPreference.js';
import { AISetting } from '../models/AISetting.js';
import { AIUsage } from '../models/AIUsage.js';
import { CustomError } from '../utils/customError.js';

export const getAISetting = () => AISetting.findOneAndUpdate(
  { key: 'global' },
  { $setOnInsert: { key: 'global' } },
  { upsert: true, new: true, setDefaultsOnInsert: true }
);

export const getAIInputSize = (req: Pick<AuthenticatedRequest, 'body' | 'params'>) =>
  JSON.stringify(req.body || {}).length + JSON.stringify(req.params || {}).length;

export const enforceAIGovernance = async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  try {
    const setting = await getAISetting();
    if (!setting.enabled) throw new CustomError('AI features are currently disabled', 503);
    const preference = await AIPreference.findOne({ userId: req.user!.id }).lean();
    if (!preference?.consented || preference.policyVersion !== setting.policyVersion) {
      const error = new CustomError('AI consent is required before sending data to the provider', 403) as any;
      error.code = 'AI_CONSENT_REQUIRED';
      throw error;
    }
    const characters = getAIInputSize(req);
    if (characters > 20_000) throw new CustomError('AI request is too large', 413);
    if (characters > setting.dailyInputCharacterLimit) throw new CustomError('Daily AI quota exceeded', 429);
    const bucket = new Date().toISOString().slice(0, 10);
    const expiresAt = new Date(Date.now() + 35 * 24 * 60 * 60 * 1000);
    const usage = await AIUsage.findOneAndUpdate(
      {
        userId: req.user!.id,
        bucket,
        requests: { $lt: setting.dailyRequestLimit },
        inputCharacters: { $lte: setting.dailyInputCharacterLimit - characters },
      },
      {
        $inc: { requests: 1, inputCharacters: characters },
        $setOnInsert: { expiresAt },
      },
      { upsert: true, new: true }
    ).catch((error: any) => error?.code === 11000 ? null : Promise.reject(error));
    if (!usage) throw new CustomError('Daily AI quota exceeded', 429);
    (req as any).aiInputCharacters = characters;
    next();
  } catch (error) { next(error); }
};
