import { Response, NextFunction } from 'express';
import { getSmartReplies, summarizeChat, translateMessage, rewriteMessage, generateAIResponse } from '../services/aiService.js';
import { Message } from '../models/Message.js';
import { CustomError } from '../utils/customError.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

export const askAI = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { prompt, context } = req.body;
    if (!prompt) {
      throw new CustomError('Prompt is required', 400);
    }
    const response = await generateAIResponse(prompt, context);
    res.status(200).json({ success: true, response });
  } catch (error) {
    next(error);
  }
};

export const getSmartRepliesRoute = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { chatId } = req.params;
    
    // Get last 10 messages for context
    const messages = await Message.find({ chatId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('senderId', 'username');

    const formattedMessages = messages.reverse().map((m: any) => ({
      sender: m.senderId?.username || 'Unknown',
      text: m.content || ''
    }));

    const replies = await getSmartReplies(formattedMessages);
    res.status(200).json({ success: true, replies });
  } catch (error) {
    next(error);
  }
};

export const summarizeChatRoute = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { chatId } = req.params;
    
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

    const summary = await summarizeChat(formattedMessages);
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
    const translated = await translateMessage(text, targetLanguage);
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
    const rewritten = await rewriteMessage(text, tone);
    res.status(200).json({ success: true, rewritten });
  } catch (error) {
    next(error);
  }
};
