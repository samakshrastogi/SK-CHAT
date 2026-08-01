import crypto from 'node:crypto';
import { Response, NextFunction } from 'express';
import { Status } from '../models/Status.js';
import { User } from '../models/User.js';
import { CustomError } from '../utils/customError.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { uploadMedia } from '../services/cloudinaryService.js';
import { buildStatusVisibilityQuery, presentStatus } from '../services/statusService.js';
import { createNotification } from '../services/notificationService.js';

const findVisibleStatus = async (statusId: string, userId: string) => {
  const viewer = await User.findById(userId).select('friends').lean();
  if (!viewer) throw new CustomError('User not found', 404);
  return Status.findOne({ _id: statusId, ...buildStatusVisibilityQuery(userId, viewer.friends || []) });
};

const emitRefresh = (req: AuthenticatedRequest) => req.app.get('io')?.emit('status:refresh');

const parseJson = <T>(value: unknown, fallback: T): T => {
  if (!value) return fallback;
  if (typeof value !== 'string') return value as T;
  try { return JSON.parse(value) as T; } catch { throw new CustomError('Invalid story metadata', 400); }
};

export const createStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { type, content, caption, backgroundColor } = req.body;
    let finalContent = content;
    if (req.file) finalContent = (await uploadMedia(req.file, 'statuses')).url;
    if (!finalContent) throw new CustomError('Status content or media file is required', 400);

    const requestedAudience = req.body.audience || 'contacts';
    if (!['contacts', 'selected'].includes(requestedAudience)) throw new CustomError('Stories can only be shared with personal connections', 400);
    const audience = requestedAudience;
    const allowedUsers = parseJson<string[]>(req.body.allowedUsers, []);
    const owner = await User.findById(req.user!.id).select('friends').lean();
    const friendIds = new Set((owner?.friends || []).map((id) => id.toString()));
    if (allowedUsers.some((id) => !friendIds.has(id))) throw new CustomError('Story viewers must be personal connections', 403);
    const excludedUsers = parseJson<string[]>(req.body.excludedUsers, []);
    if (audience === 'selected' && !allowedUsers.length) throw new CustomError('Select at least one story viewer', 400);

    const metadata = parseJson<any>(req.body.metadata, {});
    const pollInput = parseJson<any>(req.body.poll, null);
    const questionInput = parseJson<any>(req.body.question, null);
    const sliderInput = parseJson<any>(req.body.slider, null);
    const interactionCount = [pollInput, questionInput, sliderInput].filter(Boolean).length;
    if (interactionCount > 1) throw new CustomError('A story can contain one interactive widget', 400);

    const poll = pollInput ? {
      question: String(pollInput.question || '').trim(),
      options: (pollInput.options || []).map((text: string) => ({
        id: crypto.randomUUID(),
        text: String(text).trim(),
        voters: [],
      })).filter((option: any) => option.text),
    } : undefined;
    if (poll && (!poll.question || poll.options.length < 2 || poll.options.length > 4)) {
      throw new CustomError('Polls require a question and 2-4 options', 400);
    }

    if (questionInput && !String(questionInput.prompt || '').trim()) throw new CustomError('Question prompt is required', 400);

    const status = await Status.create({
      userId: req.user!.id,
      type: type || (req.file ? (req.file.mimetype.startsWith('video/') ? 'video' : 'image') : 'text'),
      content: finalContent,
      caption: caption || '',
      backgroundColor: backgroundColor || '#1e1b4b',
      audience,
      allowedUsers,
      excludedUsers,
      metadata,
      poll,
      question: questionInput ? { prompt: String(questionInput.prompt || '').trim(), answers: [] } : undefined,
      slider: sliderInput ? { emoji: String(sliderInput.emoji || '🔥'), responses: [] } : undefined,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      views: [],
      likes: [],
    });
    const populated = await Status.findById(status._id).populate('userId', 'username avatar');
    emitRefresh(req);
    res.status(201).json({ success: true, status: presentStatus(populated, req.user!.id) });
  } catch (error) { next(error); }
};

export const getStatuses = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const viewer = await User.findById(req.user!.id).select('friends').lean();
    if (!viewer) throw new CustomError('User not found', 404);
    const statuses = await Status.find(buildStatusVisibilityQuery(req.user!.id, viewer.friends || []))
      .populate('userId', 'username avatar bio')
      .populate('views.userId', 'username avatar')
      .populate('likes', 'username avatar')
      .populate('question.answers.userId', 'username avatar')
      .sort({ createdAt: -1 });
    res.json({ success: true, statuses: statuses.map((status) => presentStatus(status, req.user!.id)) });
  } catch (error) { next(error); }
};

export const viewStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const status = await findVisibleStatus(req.params.statusId, req.user!.id);
    if (!status) throw new CustomError('Status not found or unavailable', 404);
    if (!status.views.some((view) => view.userId.toString() === req.user!.id)) {
      status.views.push({ userId: req.user!.id as any, viewedAt: new Date() });
      await status.save();
      req.app.get('io')?.to(`user:${status.userId.toString()}`).emit('status:refresh');
    }
    res.json({ success: true });
  } catch (error) { next(error); }
};

export const likeStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const status = await findVisibleStatus(req.params.statusId, req.user!.id);
    if (!status) throw new CustomError('Status not found or unavailable', 404);
    const index = status.likes.findIndex((id) => id.toString() === req.user!.id);
    const liked = index < 0;
    if (liked) status.likes.push(req.user!.id as any); else status.likes.splice(index, 1);
    await status.save();
    emitRefresh(req);
    if (liked && status.userId.toString() !== req.user!.id) {
      await createNotification({
        recipientId: status.userId.toString(), actorId: req.user!.id, type: 'reaction',
        title: 'Story reaction', body: `${req.user!.username} liked your story`,
        referenceId: status.id, referenceType: 'status', idempotencyKey: `status-like:${status.id}:${req.user!.id}`,
        expiresInHours: 24,
      });
    }
    res.json({ success: true, liked, status: presentStatus(status, req.user!.id) });
  } catch (error) { next(error); }
};

export const voteStatusPoll = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const status = await findVisibleStatus(req.params.statusId, req.user!.id);
    if (!status?.poll) throw new CustomError('Story poll not found', 404);
    const selected = status.poll.options.find((option) => option.id === req.body.optionId);
    if (!selected) throw new CustomError('Poll option not found', 404);
    for (const option of status.poll.options) {
      option.voters = option.voters.filter((id) => id.toString() !== req.user!.id) as any;
    }
    selected.voters.push(req.user!.id as any);
    await status.save();
    emitRefresh(req);
    res.json({ success: true, status: presentStatus(status, req.user!.id) });
  } catch (error) { next(error); }
};

export const answerStatusQuestion = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const text = String(req.body.text || '').trim();
    if (!text || text.length > 500) throw new CustomError('Answer must be 1-500 characters', 400);
    const status = await findVisibleStatus(req.params.statusId, req.user!.id);
    if (!status?.question) throw new CustomError('Story question not found', 404);
    const existing = status.question.answers.find((answer) => answer.userId.toString() === req.user!.id);
    if (existing) { existing.text = text; existing.createdAt = new Date(); }
    else status.question.answers.push({ userId: req.user!.id as any, text, createdAt: new Date() });
    await status.save();
    emitRefresh(req);
    if (status.userId.toString() !== req.user!.id) {
      await createNotification({
        recipientId: status.userId.toString(), actorId: req.user!.id, type: 'reply',
        title: 'Story answer', body: `${req.user!.username} answered your story question`,
        referenceId: status.id, referenceType: 'status',
        idempotencyKey: `status-answer:${status.id}:${req.user!.id}`, expiresInHours: 24,
      });
    }
    res.json({ success: true, status: presentStatus(status, req.user!.id) });
  } catch (error) { next(error); }
};

export const respondStatusSlider = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const value = Number(req.body.value);
    if (!Number.isFinite(value) || value < 0 || value > 100) throw new CustomError('Slider value must be from 0 to 100', 400);
    const status = await findVisibleStatus(req.params.statusId, req.user!.id);
    if (!status?.slider) throw new CustomError('Story slider not found', 404);
    const existing = status.slider.responses.find((response) => response.userId.toString() === req.user!.id);
    if (existing) existing.value = value;
    else status.slider.responses.push({ userId: req.user!.id as any, value });
    await status.save();
    emitRefresh(req);
    res.json({ success: true, status: presentStatus(status, req.user!.id) });
  } catch (error) { next(error); }
};

export const deleteStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const status = await Status.findOneAndDelete({ _id: req.params.statusId, userId: req.user!.id });
    if (!status) throw new CustomError('Status not found or unauthorized', 404);
    emitRefresh(req);
    res.json({ success: true, message: 'Status deleted successfully' });
  } catch (error) { next(error); }
};
