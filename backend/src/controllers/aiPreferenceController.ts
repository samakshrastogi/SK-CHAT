import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { AIPreference } from '../models/AIPreference.js';
import { getAISetting } from '../middleware/aiGovernanceMiddleware.js';

export const getAIPreference = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const [preference, setting] = await Promise.all([
      AIPreference.findOne({ userId: req.user!.id }).lean(),
      getAISetting(),
    ]);
    res.json({
      success: true,
      consented: Boolean(preference?.consented && preference.policyVersion === setting.policyVersion),
      policyVersion: setting.policyVersion,
      enabled: setting.enabled,
      disclosure: 'AI requests are sent to the configured Gemini provider. Chat context is included only when you explicitly use a chat-scoped feature.',
    });
  } catch (error) { next(error); }
};

export const updateAIPreference = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const consented = req.body.consented === true;
    const setting = await getAISetting();
    const preference = await AIPreference.findOneAndUpdate(
      { userId: req.user!.id },
      {
        $set: {
          consented,
          consentedAt: consented ? new Date() : undefined,
          policyVersion: consented ? setting.policyVersion : undefined,
        },
      },
      { upsert: true, new: true }
    );
    res.json({ success: true, consented: preference.consented, policyVersion: setting.policyVersion });
  } catch (error) { next(error); }
};
