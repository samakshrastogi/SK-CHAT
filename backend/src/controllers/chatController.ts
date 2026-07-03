import { Response, NextFunction } from 'express';
import { Chat } from '../models/Chat.js';
import { Message } from '../models/Message.js';
import { User } from '../models/User.js';
import { CustomError } from '../utils/customError.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { uploadMedia } from '../services/cloudinaryService.js';
import { scheduleSelfDestruct } from '../utils/selfDestruct.js';
import crypto from 'crypto';

export const createChat = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { isGroup, participantId, name, description, isCommunity, communityId } = req.body;

    if (!isGroup) {
      // 1-on-1 Chat
      if (!participantId) {
        throw new CustomError('Participant ID is required for direct chats', 400);
      }

      // Check if chat already exists between the two
      const existing = await Chat.findOne({
        isGroup: false,
        participants: { $all: [req.user!.id, participantId] }
      }).populate('participants', 'username avatar status lastSeen bio');

      if (existing) {
        res.status(200).json({ success: true, chat: existing });
        return;
      }

      const newChat = await Chat.create({
        isGroup: false,
        participants: [req.user!.id, participantId]
      });

      const populated = await Chat.findById(newChat._id)
        .populate('participants', 'username avatar status lastSeen bio');

      res.status(201).json({ success: true, chat: populated });
      return;
    }

    // Group Chat / Community Channel
    const participants = req.body.participants || [];
    if (!participants.includes(req.user!.id)) {
      participants.push(req.user!.id);
    }

    const inviteCode = crypto.randomBytes(8).toString('hex');
    const newGroup = await Chat.create({
      name: name || 'Unnamed Group',
      description: description || '',
      isGroup: true,
      isCommunity: !!isCommunity,
      communityId: communityId || undefined,
      creatorId: req.user!.id,
      admins: [req.user!.id],
      participants,
      inviteCode
    });

    const populatedGroup = await Chat.findById(newGroup._id)
      .populate('participants', 'username avatar status lastSeen bio')
      .populate('admins', 'username avatar');

    res.status(201).json({ success: true, chat: populatedGroup });
  } catch (error) {
    next(error);
  }
};

export const getChats = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const chats = await Chat.find({
      participants: req.user!.id
    })
      .populate('participants', 'username avatar status lastSeen bio')
      .populate('admins', 'username avatar')
      .populate({
        path: 'lastMessage',
        populate: { path: 'senderId', select: 'username avatar' }
      })
      .sort({ updatedAt: -1 });

    res.status(200).json({ success: true, chats });
  } catch (error) {
    next(error);
  }
};

export const getChatMessages = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { chatId } = req.params;
    const limit = parseInt(req.query.limit as string) || 30;
    const skip = parseInt(req.query.skip as string) || 0;

    // Verify participant
    const chat = await Chat.findOne({ _id: chatId, participants: req.user!.id });
    if (!chat) {
      throw new CustomError('Chat not found or access denied', 403);
    }

    const messages = await Message.find({ chatId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('senderId', 'username avatar')
      .populate({
        path: 'replyTo',
        populate: { path: 'senderId', select: 'username' }
      });

    res.status(200).json({
      success: true,
      messages: messages.reverse(), // Return in chronological order
      hasMore: messages.length === limit
    });
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { chatId } = req.params;
    const {
      content,
      messageType,
      pollData,
      locationData,
      contactData,
      replyTo,
      scheduledAt,
      expiresIn
    } = req.body;

    const chat = await Chat.findOne({ _id: chatId, participants: req.user!.id });
    if (!chat) {
      throw new CustomError('Chat not found or access denied', 403);
    }

    let mediaUrl = undefined;
    let fileName = undefined;
    let mediaSize = undefined;

    if (req.file) {
      const upload = await uploadMedia(req.file, 'attachments');
      mediaUrl = upload.url;
      fileName = req.file.originalname;
      mediaSize = req.file.size;
    }

    let cleanPollData = undefined;
    if (messageType === 'poll' && pollData) {
      const parsedPoll = typeof pollData === 'string' ? JSON.parse(pollData) : pollData;
      cleanPollData = {
        question: parsedPoll.question,
        options: parsedPoll.options.map((opt: string) => ({
          id: crypto.randomUUID(),
          text: opt,
          votes: []
        }))
      };
    }

    let expiresAt: Date | undefined;
    if (expiresIn && Number(expiresIn) > 0) {
      expiresAt = new Date(Date.now() + Number(expiresIn) * 1000);
    }

    const message = await Message.create({
      chatId,
      senderId: req.user!.id,
      content: content || '',
      messageType: messageType || 'text',
      mediaUrl,
      fileName,
      mediaSize,
      pollData: cleanPollData,
      locationData: locationData ? (typeof locationData === 'string' ? JSON.parse(locationData) : locationData) : undefined,
      contactData: contactData ? (typeof contactData === 'string' ? JSON.parse(contactData) : contactData) : undefined,
      replyTo: replyTo || undefined,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      expiresAt,
      status: 'sent'
    });

    // Update last message in chat
    chat.lastMessage = message._id as any;
    await chat.save();

    const populated = await Message.findById(message._id)
      .populate('senderId', 'username avatar')
      .populate({
        path: 'replyTo',
        populate: { path: 'senderId', select: 'username' }
      });

    res.status(201).json({ success: true, message: populated });

    // Schedule self-destruction if configured
    if (expiresIn && Number(expiresIn) > 0) {
      const io = req.app.get('io');
      if (io) {
        scheduleSelfDestruct(io, (message._id as any).toString(), chatId, Number(expiresIn) * 1000);
      }
    }
  } catch (error) {
    next(error);
  }
};

export const editMessage = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    const message = await Message.findOne({ _id: messageId, senderId: req.user!.id });
    if (!message) {
      throw new CustomError('Message not found or modification unauthorized', 403);
    }

    if (message.isDeleted) {
      throw new CustomError('Cannot edit a deleted message', 400);
    }

    message.content = content;
    message.isEdited = true;
    await message.save();

    const populated = await Message.findById(message._id)
      .populate('senderId', 'username avatar')
      .populate({
        path: 'replyTo',
        populate: { path: 'senderId', select: 'username' }
      });

    res.status(200).json({ success: true, message: populated });
  } catch (error) {
    next(error);
  }
};

export const deleteMessage = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { messageId } = req.params;
    const { deleteForEveryone } = req.body;

    const message = await Message.findById(messageId);
    if (!message) {
      throw new CustomError('Message not found', 404);
    }

    if (message.senderId.toString() !== req.user!.id && !deleteForEveryone) {
      throw new CustomError('Unauthorized deletion', 403);
    }

    if (deleteForEveryone) {
      if (message.senderId.toString() !== req.user!.id) {
        throw new CustomError('Only the sender can delete a message for everyone', 403);
      }
      message.content = 'This message was deleted';
      message.isDeleted = true;
      message.mediaUrl = undefined;
      message.pollData = undefined;
      message.locationData = undefined;
      message.contactData = undefined;
      await message.save();
    } else {
      // Delete just for me (soft local delete - usually filtered out in queries or logged on User)
      // For simplicity, we flag it or delete it if it is only a single chat.
      // In this setup, we will soft delete the instance
      await Message.findByIdAndDelete(messageId);
    }

    res.status(200).json({ success: true, messageId, isDeletedForEveryone: !!deleteForEveryone });
  } catch (error) {
    next(error);
  }
};

export const addReaction = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    const message = await Message.findById(messageId);
    if (!message) {
      throw new CustomError('Message not found', 404);
    }

    // Check if user already reacted with this emoji
    const existingIndex = message.reactions.findIndex(
      (r) => r.userId.toString() === req.user!.id
    );

    if (existingIndex > -1) {
      if (message.reactions[existingIndex].emoji === emoji) {
        // Toggle off if same emoji
        message.reactions.splice(existingIndex, 1);
      } else {
        // Update emoji
        message.reactions[existingIndex].emoji = emoji;
      }
    } else {
      message.reactions.push({ userId: req.user!.id as any, emoji });
    }

    await message.save();
    res.status(200).json({ success: true, reactions: message.reactions });
  } catch (error) {
    next(error);
  }
};

export const toggleStarMessage = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { messageId } = req.params;
    const user = await User.findById(req.user!.id);
    
    const index = user!.starredMessages.indexOf(messageId as any);
    let starred = false;

    if (index > -1) {
      user!.starredMessages.splice(index, 1);
    } else {
      user!.starredMessages.push(messageId as any);
      starred = true;
    }

    await user!.save();
    res.status(200).json({ success: true, starred, messageId });
  } catch (error) {
    next(error);
  }
};

export const getStarredMessages = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user!.id)
      .populate({
        path: 'starredMessages',
        populate: { path: 'senderId', select: 'username avatar' }
      });

    res.status(200).json({ success: true, starredMessages: user!.starredMessages });
  } catch (error) {
    next(error);
  }
};

export const castVote = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { messageId } = req.params;
    const { optionId } = req.body;

    const message = await Message.findById(messageId);
    if (!message || message.messageType !== 'poll' || !message.pollData) {
      throw new CustomError('Poll not found', 404);
    }

    // Remove user votes from all options first, then append to selected option
    message.pollData.options.forEach((opt) => {
      const idx = opt.votes.indexOf(req.user!.id as any);
      if (idx > -1) {
        opt.votes.splice(idx, 1);
      }
    });

    const targetOpt = message.pollData.options.find((opt) => opt.id === optionId);
    if (targetOpt) {
      targetOpt.votes.push(req.user!.id as any);
    }

    await message.save();

    // Broadcast poll update to room
    const io = req.app.get('io');
    if (io) {
      io.to(`chat:${message.chatId}`).emit('poll:updated', { messageId: message._id, pollData: message.pollData });
    }

    res.status(200).json({ success: true, pollData: message.pollData });
  } catch (error) {
    next(error);
  }
};

export const togglePinMessage = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { chatId } = req.params;
    const { messageId } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw new CustomError('Chat not found', 404);
    }

    if (!chat.participants.some(p => p.toString() === req.user!.id)) {
      throw new CustomError('Access denied', 403);
    }

    const messageIndex = chat.pinnedMessages.indexOf(messageId as any);
    if (messageIndex > -1) {
      chat.pinnedMessages.splice(messageIndex, 1);
    } else {
      chat.pinnedMessages.push(messageId as any);
    }

    await chat.save();

    const populated = await Chat.findById(chatId).populate('pinnedMessages');

    const io = req.app.get('io');
    if (io) {
      io.to(`chat:${chatId}`).emit('chat:pinned-updated', { chatId, pinnedMessages: populated?.pinnedMessages || [] });
    }

    res.status(200).json({ success: true, pinnedMessages: populated?.pinnedMessages || [] });
  } catch (error) {
    next(error);
  }
};

export const searchMessages = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { q, chatId } = req.query;
    if (!q || typeof q !== 'string') {
      res.status(200).json({ success: true, messages: [] });
      return;
    }

    const queryConditions: any = {
      $text: { $search: q }
    };

    if (chatId) {
      queryConditions.chatId = chatId;
    } else {
      // Restrict search to chats the user is in
      const myChats = await Chat.find({ participants: req.user!.id }).select('_id');
      queryConditions.chatId = { $in: myChats.map(c => c._id) };
    }

    const messages = await Message.find(queryConditions)
      .populate('senderId', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({ success: true, messages });
  } catch (error) {
    next(error);
  }
};
