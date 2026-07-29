import { Response, NextFunction } from 'express';
import { getSmartReplies, summarizeChat, translateMessage, rewriteMessage, generateAIResponse } from '../services/aiService.js';
import { Message } from '../models/Message.js';
import { CustomError } from '../utils/customError.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { Chat } from '../models/Chat.js';
import { AIRequestMetric } from '../models/AIRequestMetric.js';

const executeAI = async <T>(
  req: AuthenticatedRequest,
  res: Response,
  feature: string,
  operation: (signal: AbortSignal) => Promise<T>
) => {
  const startedAt = Date.now();
  const controller = new AbortController();
  const onClose = () => {
    if (!res.writableEnded) controller.abort();
  };
  res.once('close', onClose);
  try {
    const result = await operation(controller.signal);
    await AIRequestMetric.create({
      userId: req.user!.id, feature, status: 'success', latencyMs: Date.now() - startedAt,
      inputCharacters: (req as any).aiInputCharacters || 0,
      outputCharacters: JSON.stringify(result).length,
    }).catch(() => undefined);
    return result;
  } catch (error: any) {
    await AIRequestMetric.create({
      userId: req.user!.id, feature, status: controller.signal.aborted ? 'cancelled' : 'error',
      latencyMs: Date.now() - startedAt, inputCharacters: (req as any).aiInputCharacters || 0,
      outputCharacters: 0, errorCode: String(error?.statusCode || error?.name || 'unknown'),
    }).catch(() => undefined);
    throw error;
  } finally {
    res.off('close', onClose);
  }
};

const requireChatMembership = async (chatId: string, userId?: string) => {
  if (!userId || !await Chat.exists({ _id: chatId, participants: userId })) {
    throw new CustomError('Chat not found or access denied', 404);
  }
};

export const askAI = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { prompt, chatId } = req.body;
    if (!prompt || typeof prompt !== 'string' || prompt.length > 4000) {
      throw new CustomError('Prompt must be 1-4000 characters', 400);
    }
    let context: string | undefined;
    if (chatId) {
      await requireChatMembership(String(chatId), req.user?.id);
      const messages = await Message.find({ chatId }).sort({ createdAt: -1 }).limit(20).populate('senderId', 'username').lean();
      context = messages.reverse().map((message: any) => `${message.senderId?.username || 'User'}: ${String(message.content || '').slice(0, 1000)}`).join('\n');
    }
    const response = await executeAI(req, res, 'ask', (signal) => generateAIResponse(prompt.trim(), context, signal));
    res.status(200).json({ success: true, response });
  } catch (error) {
    next(error);
  }
};

export const getSmartRepliesRoute = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { chatId } = req.params;
    await requireChatMembership(String(chatId), req.user?.id);
    
    // Get last 10 messages for context
    const messages = await Message.find({ chatId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('senderId', 'username');

    const formattedMessages = messages.reverse().map((m: any) => ({
      sender: m.senderId?.username || 'Unknown',
      text: m.content || ''
    }));

    const replies = await executeAI(req, res, 'smart_replies', (signal) => getSmartReplies(formattedMessages, signal));
    res.status(200).json({ success: true, replies });
  } catch (error) {
    next(error);
  }
};

export const summarizeChatRoute = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { chatId } = req.params;
    await requireChatMembership(String(chatId), req.user?.id);
    
    // Fetch last 50 messages to summarize
    const messages = await Message.find({ chatId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('senderId', 'username');

    if (messages.length === 0) {
      res.status(200).json({ success: true, summary: 'No messages to summarize.' });
      return;
    }

    const formattedMessages = messages.reverse().map((m: any) => ({
      sender: m.senderId?.username || 'Unknown',
      text: m.content || ''
    }));

    const summary = await executeAI(req, res, 'summarize', (signal) => summarizeChat(formattedMessages, signal));
    res.status(200).json({ success: true, summary });
  } catch (error) {
    next(error);
  }
};

export const translateRoute = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { text, targetLanguage } = req.body;
    if (!text || !targetLanguage) {
      throw new CustomError('Text and targetLanguage are required', 400);
    }
    if (String(text).length > 5000 || String(targetLanguage).length > 50) throw new CustomError('Translation input is too large', 413);
    const translated = await executeAI(req, res, 'translate', (signal) => translateMessage(String(text), String(targetLanguage), signal));
    res.status(200).json({ success: true, translated });
  } catch (error) {
    next(error);
  }
};

export const rewriteRoute = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { text, tone } = req.body; // tone: 'professional' | 'casual' | 'friendly' | 'grammar'
    if (!text || !tone) {
      throw new CustomError('Text and tone are required', 400);
    }
    if (!['professional', 'casual', 'friendly', 'grammar'].includes(tone) || String(text).length > 5000) throw new CustomError('Invalid rewrite request', 400);
    const rewritten = await executeAI(req, res, 'rewrite', (signal) => rewriteMessage(String(text), tone, signal));
    res.status(200).json({ success: true, rewritten });
  } catch (error) {
    next(error);
  }
};
