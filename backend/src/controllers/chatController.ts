import { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
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
    const { isGroup, participantId, name, description, isCommunity, communityId, isBroadcast } = req.body;

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
      isBroadcast: !!isBroadcast,
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

    const chatsWithUnread = await Promise.all(
      chats.map(async (chat) => {
        const unreadCount = await Message.countDocuments({
          chatId: chat._id,
          'seenBy.userId': { $ne: req.user!.id },
          senderId: { $ne: req.user!.id }
        });
        return {
          ...chat.toObject(),
          unreadCount
        };
      })
    );

    res.status(200).json({ success: true, chats: chatsWithUnread });
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

    // Check Group Settings: Announcement Mode & Slow Mode
    if (chat.isGroup) {
      const isOwner = chat.creatorId?.toString() === req.user!.id.toString();
      const isAdmin = chat.admins.some(adm => adm.toString() === req.user!.id.toString());
      const isMod = chat.moderators?.some(mod => mod.toString() === req.user!.id.toString());
      
      if (chat.announcementMode && !isOwner && !isAdmin && !isMod) {
        throw new CustomError('Only administrators and moderators can send messages in this announcement-only group.', 403);
      }
      
      if (chat.slowMode > 0 && !isOwner && !isAdmin && !isMod) {
        const lastMsg = await Message.findOne({ chatId: chat._id, senderId: req.user!.id }).sort({ createdAt: -1 });
        if (lastMsg) {
          const secondsElapsed = Math.floor((Date.now() - new Date(lastMsg.createdAt).getTime()) / 1000);
          if (secondsElapsed < chat.slowMode) {
            throw new CustomError(`Slow mode is active. Please wait ${chat.slowMode - secondsElapsed} more second(s).`, 429);
          }
        }
      }
    }

    if (!chat.isGroup) {
      const otherParticipantId = chat.participants.find(p => p.toString() !== req.user!.id);
      if (otherParticipantId) {
        const otherUser = await User.findById(otherParticipantId);
        const currentUser = await User.findById(req.user!.id);
        
        if (otherUser?.blockedUsers.some(id => id.toString() === req.user!.id.toString())) {
          throw new CustomError('You cannot send messages to this user because they have blocked you.', 403);
        }
        if (currentUser?.blockedUsers.some(id => id.toString() === otherParticipantId.toString())) {
          throw new CustomError('You cannot send messages to this user because you have blocked them.', 403);
        }
      }
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

    let finalContent = content || '';
    if (chat.isCommunity && chat.communityId && (!messageType || messageType === 'text')) {
      const CommunityModel = (await import('../models/Community.js')).Community;
      const communityObj = await CommunityModel.findById(chat.communityId);
      if (communityObj && communityObj.autoModeration !== false) {
        const bannedWords = ['scam', 'spam', 'hack', 'virus', 'abuse', 'profanity', 'badword'];
        for (const word of bannedWords) {
          const regex = new RegExp(`\\b${word}\\b`, 'gi');
          finalContent = finalContent.replace(regex, '****');
        }
      }
    }

    const message = await Message.create({
      chatId,
      senderId: req.user!.id,
      content: finalContent,
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

    const io = req.app.get('io');

    // Handle Broadcast Group logic
    if (chat.isGroup && chat.isBroadcast) {
      // 1. Verify initiator is the sender
      if (chat.creatorId && chat.creatorId.toString() !== req.user!.id.toString()) {
        throw new CustomError('Only the broadcast creator can send messages to this broadcast list.', 403);
      }

      // 2. Loop through all other participants to send separately
      const otherMembers = chat.participants.filter(p => p.toString() !== req.user!.id.toString());
      for (const memberId of otherMembers) {
        // Find or create direct chat
        let directChat = await Chat.findOne({
          isGroup: false,
          participants: { $all: [req.user!.id, memberId] }
        });
        if (!directChat) {
          directChat = await Chat.create({
            isGroup: false,
            participants: [req.user!.id, memberId]
          });
        }

        // Save message copy under direct chat
        const copyMsg = await Message.create({
          chatId: directChat._id,
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
          expiresAt,
          status: 'sent'
        });

        directChat.lastMessage = copyMsg._id as any;
        await directChat.save();

        const populatedCopy = await Message.findById(copyMsg._id)
          .populate('senderId', 'username avatar')
          .populate({
            path: 'replyTo',
            populate: { path: 'senderId', select: 'username' }
          });

        if (io) {
          // Emit to direct chat room
          io.to(`chat:${directChat._id}`).emit('message:receive', populatedCopy);
          // Emit to receiver user room specifically
          io.to(`user:${memberId}`).emit('message:receive', populatedCopy);
        }
      }
    }

    // Regular socket emit to the main chat room and all participant user rooms in real-time
    if (io) {
      io.to(`chat:${chatId}`).emit('message:receive', populated);

      chat.participants.forEach((participantId) => {
        if (participantId.toString() !== req.user!.id.toString()) {
          io.to(`user:${participantId}`).emit('message:receive', populated);
        }
      });
    }

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

    // Broadcast the updated reactions array to all participants in the chat room in real-time
    const io = req.app.get('io');
    if (io) {
      io.to(`chat:${message.chatId}`).emit('message:reaction', {
        chatId: message.chatId,
        messageId: message._id,
        reactions: message.reactions,
      });
    }

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

export const generateInviteLink = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { chatId } = req.params;
    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw new CustomError('Chat not found', 404);
    }
    if (!chat.isGroup) {
      throw new CustomError('Only group chats support invite links', 400);
    }

    // Generate public invite code if missing
    if (!chat.inviteCode) {
      chat.inviteCode = crypto.randomBytes(4).toString('hex');
      await chat.save();
    }

    // Generate signed private token (valid for 24h)
    const privateToken = jwt.sign(
      { chatId: chat._id, type: 'private' },
      process.env.JWT_ACCESS_SECRET || 'supersecretaccesskeyconnect123!@#',
      { expiresIn: '1d' }
    );

    res.status(200).json({
      success: true,
      inviteCode: chat.inviteCode,
      privateToken
    });
  } catch (error) {
    next(error);
  }
};

export const joinChatGroup = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { codeOrToken } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      throw new CustomError('User context required', 401);
    }

    let chatId: string;
    let joinType = 'public';

    // Check if codeOrToken is a JWT (contains dots)
    if (codeOrToken.includes('.')) {
      try {
        const decoded: any = jwt.verify(
          codeOrToken,
          process.env.JWT_ACCESS_SECRET || 'supersecretaccesskeyconnect123!@#'
        );
        chatId = decoded.chatId;
        joinType = 'private';
      } catch (err) {
        throw new CustomError('Private invite token is invalid or has expired', 400);
      }
    } else {
      // Find chat by public code
      const chatByCode = await Chat.findOne({ inviteCode: codeOrToken });
      if (!chatByCode) {
        throw new CustomError('Group invite link is invalid', 400);
      }
      chatId = (chatByCode._id as any).toString();
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw new CustomError('Chat group no longer exists', 404);
    }

    const participantObjectId = new Types.ObjectId(userId);
    // Check if already a participant
    if (chat.participants.some(p => p.toString() === userId.toString())) {
      return res.status(200).json({
        success: true,
        message: 'You are already a member of this group chat',
        chat
      });
    }

    // Add user as participant
    chat.participants.push(participantObjectId);
    await chat.save();

    // Create a system message in the chat that this user joined
    const userDoc = await User.findById(userId);
    const systemMessage = await Message.create({
      chatId: chat._id,
      senderId: new Types.ObjectId('668270117e3b9a2b9c3d4e5f'), // Admin/System sender
      content: `${userDoc?.username || 'A new user'} joined the group via ${joinType} invite link!`,
      messageType: 'text',
      status: 'sent'
    });

    chat.lastMessage = systemMessage._id as any;
    await chat.save();

    // Broadcast member joined socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`chat:${chat._id}`).emit('chat:member-joined', {
        chatId: chat._id,
        user: {
          _id: userDoc?._id,
          username: userDoc?.username,
          avatar: userDoc?.avatar,
          status: userDoc?.status
        },
        message: systemMessage
      });
    }

    res.status(200).json({
      success: true,
      message: 'Successfully joined group chat',
      chat
    });
  } catch (error) {
    next(error);
  }
};

export const updateChatSettings = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { chatId } = req.params;
    const { slowMode, announcementMode, approvalRequired, groupRules, moderators, admins } = req.body;
    
    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw new CustomError('Chat group not found', 404);
    }
    
    // Authorization: Must be owner/creator or admin
    const isOwner = chat.creatorId?.toString() === req.user!.id.toString() || chat.ownerId?.toString() === req.user!.id.toString();
    const isAdmin = chat.admins.some(adm => adm.toString() === req.user!.id.toString());
    if (!isOwner && !isAdmin) {
      throw new CustomError('Administrator access required to modify group settings', 403);
    }

    if (slowMode !== undefined) chat.slowMode = Number(slowMode);
    if (announcementMode !== undefined) chat.announcementMode = Boolean(announcementMode);
    if (approvalRequired !== undefined) chat.approvalRequired = Boolean(approvalRequired);
    if (groupRules !== undefined) chat.groupRules = String(groupRules);
    
    // Only owner can promote/demote admins & mods
    if (isOwner) {
      if (moderators !== undefined) {
        chat.moderators = moderators.map((id: string) => new Types.ObjectId(id));
      }
      if (admins !== undefined) {
        chat.admins = admins.map((id: string) => new Types.ObjectId(id));
      }
    }
    
    await chat.save();
    
    // Populate and return updated chat
    const populated = await Chat.findById(chat._id)
      .populate('admins', 'username avatar bio')
      .populate('participants', 'username avatar bio')
      .populate('moderators', 'username avatar bio');
      
    res.status(200).json({ success: true, chat: populated });
  } catch (error) {
    next(error);
  }
};

export const updateGroupProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { chatId } = req.params;
    const { name, description } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat) throw new CustomError('Chat group not found', 404);

    const isOwner = chat.creatorId?.toString() === req.user!.id.toString() || chat.ownerId?.toString() === req.user!.id.toString();
    const isAdmin = chat.admins.some(adm => adm.toString() === req.user!.id.toString());
    if (!isOwner && !isAdmin) {
      throw new CustomError('Administrator access required to modify group settings', 403);
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    // Check files for Group Avatar
    const file = req.file;
    if (file) {
      const upload = await uploadMedia(file, 'group-avatars');
      updateData.avatar = upload.url;
    }

    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { $set: updateData },
      { new: true }
    )
      .populate('participants', 'username avatar status lastSeen bio')
      .populate('admins', 'username avatar')
      .populate('moderators', 'username avatar');

    // Create a system message in the chat
    const systemMessage = await Message.create({
      chatId: chat._id,
      senderId: new Types.ObjectId('668270117e3b9a2b9c3d4e5f'),
      content: `Group settings updated by ${req.user!.username}`,
      messageType: 'text',
      status: 'sent'
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`chat:${chat._id}`).emit('chat:updated', {
        chatId: chat._id,
        chat: updatedChat,
        message: systemMessage
      });
    }

    res.status(200).json({ success: true, chat: updatedChat });
  } catch (error) {
    next(error);
  }
};

export const addGroupMember = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { chatId } = req.params;
    const { userId } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat) throw new CustomError('Chat group not found', 404);

    const isOwner = chat.creatorId?.toString() === req.user!.id.toString() || chat.ownerId?.toString() === req.user!.id.toString();
    const isAdmin = chat.admins.some(adm => adm.toString() === req.user!.id.toString());
    if (!isOwner && !isAdmin) {
      throw new CustomError('Administrator access required to add members', 403);
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) throw new CustomError('User to add not found', 404);

    if (chat.participants.some(p => p.toString() === userId.toString())) {
      throw new CustomError('User is already a member', 400);
    }

    chat.participants.push(new Types.ObjectId(userId));
    await chat.save();

    // Create a system message in the chat
    const systemMessage = await Message.create({
      chatId: chat._id,
      senderId: new Types.ObjectId('668270117e3b9a2b9c3d4e5f'),
      content: `${targetUser.username} was added to the group by ${req.user!.username}`,
      messageType: 'text',
      status: 'sent'
    });

    chat.lastMessage = systemMessage._id as any;
    await chat.save();

    const populated = await Chat.findById(chat._id)
      .populate('participants', 'username avatar status lastSeen bio')
      .populate('admins', 'username avatar')
      .populate('moderators', 'username avatar');

    const io = req.app.get('io');
    if (io) {
      io.to(`chat:${chat._id}`).emit('chat:member-joined', {
        chatId: chat._id,
        user: {
          _id: targetUser._id,
          username: targetUser.username,
          avatar: targetUser.avatar,
          status: targetUser.status
        },
        message: systemMessage
      });
      // Emit to the added user's room to notify them to pull this chat
      io.to(`user:${userId}`).emit('chat:added', { chat: populated });
    }

    res.status(200).json({ success: true, chat: populated });
  } catch (error) {
    next(error);
  }
};

export const removeGroupMember = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { chatId, userId } = req.params;

    const chat = await Chat.findById(chatId);
    if (!chat) throw new CustomError('Chat group not found', 404);

    // Only owners and admins can remove members
    const isOwner = chat.creatorId?.toString() === req.user!.id.toString() || chat.ownerId?.toString() === req.user!.id.toString();
    const isAdmin = chat.admins.some(adm => adm.toString() === req.user!.id.toString());
    if (!isOwner && !isAdmin) {
      throw new CustomError('Administrator access required to remove members', 403);
    }

    // Owner cannot be removed, and admins cannot be removed by admins (only owner)
    if (chat.creatorId?.toString() === userId.toString() || chat.ownerId?.toString() === userId.toString()) {
      throw new CustomError('Group creator/owner cannot be removed', 400);
    }
    const isTargetAdmin = chat.admins.some(adm => adm.toString() === userId.toString());
    if (isTargetAdmin && !isOwner) {
      throw new CustomError('Only the group owner can remove administrators', 403);
    }

    chat.participants = chat.participants.filter(p => p.toString() !== userId.toString());
    chat.admins = chat.admins.filter(a => a.toString() !== userId.toString());
    chat.moderators = chat.moderators.filter(m => m.toString() !== userId.toString());
    await chat.save();

    const targetUser = await User.findById(userId);

    // Create a system message in the chat
    const systemMessage = await Message.create({
      chatId: chat._id,
      senderId: new Types.ObjectId('668270117e3b9a2b9c3d4e5f'),
      content: `${targetUser?.username || 'User'} was removed from the group by ${req.user!.username}`,
      messageType: 'text',
      status: 'sent'
    });

    chat.lastMessage = systemMessage._id as any;
    await chat.save();

    const populated = await Chat.findById(chat._id)
      .populate('participants', 'username avatar status lastSeen bio')
      .populate('admins', 'username avatar')
      .populate('moderators', 'username avatar');

    const io = req.app.get('io');
    if (io) {
      io.to(`chat:${chat._id}`).emit('chat:member-left', {
        chatId: chat._id,
        userId,
        message: systemMessage
      });
      io.to(`user:${userId}`).emit('chat:removed', { chatId: chat._id });
    }

    res.status(200).json({ success: true, chat: populated });
  } catch (error) {
    next(error);
  }
};

export const leaveGroup = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { chatId } = req.params;
    const userId = req.user!.id;

    const chat = await Chat.findById(chatId);
    if (!chat) throw new CustomError('Chat group not found', 404);

    // Creator/owner cannot leave without transferring ownership
    const isOwner = chat.creatorId?.toString() === userId.toString() || chat.ownerId?.toString() === userId.toString();
    if (isOwner && chat.participants.length > 1) {
      throw new CustomError('You must transfer group ownership before leaving', 400);
    }

    chat.participants = chat.participants.filter(p => p.toString() !== userId.toString());
    chat.admins = chat.admins.filter(a => a.toString() !== userId.toString());
    chat.moderators = chat.moderators.filter(m => m.toString() !== userId.toString());
    await chat.save();

    // Create system message
    const systemMessage = await Message.create({
      chatId: chat._id,
      senderId: new Types.ObjectId('668270117e3b9a2b9c3d4e5f'),
      content: `${req.user!.username} left the group`,
      messageType: 'text',
      status: 'sent'
    });

    chat.lastMessage = systemMessage._id as any;
    await chat.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`chat:${chat._id}`).emit('chat:member-left', {
        chatId: chat._id,
        userId,
        message: systemMessage
      });
    }

    res.status(200).json({ success: true, message: 'Successfully left group chat' });
  } catch (error) {
    next(error);
  }
};

export const getGroupSharedMedia = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findOne({ _id: chatId, participants: req.user!.id });
    if (!chat) throw new CustomError('Chat not found or access denied', 403);

    const messages = await Message.find({
      chatId,
      messageType: { $in: ['image', 'video', 'audio', 'voice'] },
      isDeleted: false
    })
      .select('mediaUrl messageType fileName mediaSize createdAt senderId')
      .populate('senderId', 'username avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, media: messages });
  } catch (error) {
    next(error);
  }
};

export const getGroupSharedFiles = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findOne({ _id: chatId, participants: req.user!.id });
    if (!chat) throw new CustomError('Chat not found or access denied', 403);

    const messages = await Message.find({
      chatId,
      messageType: 'document',
      isDeleted: false
    })
      .select('mediaUrl messageType fileName mediaSize createdAt senderId')
      .populate('senderId', 'username avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, files: messages });
  } catch (error) {
    next(error);
  }
};
