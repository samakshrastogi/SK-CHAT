import { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Community } from '../models/Community.js';
import { CommunityJoinRequest } from '../models/CommunityJoinRequest.js';
import { User } from '../models/User.js';
import { Chat } from '../models/Chat.js';
import { CustomError } from '../utils/customError.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { uploadMedia } from '../services/cloudinaryService.js';
import crypto from 'crypto';

export const createCommunity = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { name, description } = req.body;
    
    let avatarUrl = '';
    let bannerUrl = '';

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    if (files) {
      if (files.avatar && files.avatar[0]) {
        const upload = await uploadMedia(files.avatar[0], 'communities');
        avatarUrl = upload.url;
      }
      if (files.banner && files.banner[0]) {
        const upload = await uploadMedia(files.banner[0], 'communities');
        bannerUrl = upload.url;
      }
    }

    const inviteCode = crypto.randomBytes(8).toString('hex');

    // 1. Create a placeholder community
    const community = new Community({
      name,
      description: description || '',
      avatar: avatarUrl,
      banner: bannerUrl,
      creatorId: req.user!.id,
      admins: [req.user!.id],
      members: [req.user!.id],
      inviteCode,
      groupIds: []
    });

    // 2. Create the default announcement channel
    const announcementChat = await Chat.create({
      name: `announcements`,
      description: `Official announcements for ${name}`,
      isGroup: true,
      isCommunity: true,
      channelType: 'announcement',
      creatorId: req.user!.id,
      admins: [req.user!.id],
      participants: [req.user!.id],
      communityId: community._id
    });

    // 3. Create a general chat channel
    const generalChat = await Chat.create({
      name: `general`,
      description: `General discussion channel for ${name}`,
      isGroup: true,
      isCommunity: true,
      channelType: 'text',
      creatorId: req.user!.id,
      admins: [req.user!.id],
      participants: [req.user!.id],
      communityId: community._id
    });

    // 3b. Create Q&A channel
    const qaChat = await Chat.create({
      name: `q-and-a`,
      description: `Questions and answers channel`,
      isGroup: true,
      isCommunity: true,
      channelType: 'qa',
      creatorId: req.user!.id,
      admins: [req.user!.id],
      participants: [req.user!.id],
      communityId: community._id
    });

    // 3c. Create Media channel
    const mediaChat = await Chat.create({
      name: `media`,
      description: `Photos, videos and links hub`,
      isGroup: true,
      isCommunity: true,
      channelType: 'media',
      creatorId: req.user!.id,
      admins: [req.user!.id],
      participants: [req.user!.id],
      communityId: community._id
    });

    // 3d. Create Events channel
    const eventsChat = await Chat.create({
      name: `events`,
      description: `Upcoming meetups and events list`,
      isGroup: true,
      isCommunity: true,
      channelType: 'events',
      creatorId: req.user!.id,
      admins: [req.user!.id],
      participants: [req.user!.id],
      communityId: community._id
    });

    // 3e. Create Voice Room channel
    const voiceChat = await Chat.create({
      name: `voice-room`,
      description: `Drop in audio voice chats`,
      isGroup: true,
      isCommunity: true,
      channelType: 'voice',
      creatorId: req.user!.id,
      admins: [req.user!.id],
      participants: [req.user!.id],
      communityId: community._id
    });

    // 4. Update and save the community
    community.announcementChannelId = announcementChat._id as any;
    community.groupIds = [
      announcementChat._id as any,
      generalChat._id as any,
      qaChat._id as any,
      mediaChat._id as any,
      eventsChat._id as any,
      voiceChat._id as any
    ];
    await community.save();

    const populated = await Community.findById(community._id)
      .populate('admins', 'username avatar')
      .populate('members', 'username avatar')
      .populate({
        path: 'groupIds',
        select: 'name description lastMessage'
      });

    const io = req.app.get('io');
    if (io) {
      io.emit('community:created', populated);
    }

    res.status(201).json({ success: true, community: populated });
  } catch (error) {
    next(error);
  }
};

export const getCommunities = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const communities = await Community.find({
      members: req.user!.id
    })
      .populate('admins', 'username avatar')
      .populate({
        path: 'groupIds',
        select: 'name description lastMessage'
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, communities });
  } catch (error) {
    next(error);
  }
};

export const joinCommunity = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) {
      throw new CustomError('Invite code is required', 400);
    }

    const community = await Community.findOne({ inviteCode });
    if (!community) {
      throw new CustomError('Community not found with this invite code', 404);
    }

    // Check if user is already a member
    if (community.members.includes(req.user!.id as any)) {
      res.status(200).json({ success: true, message: 'You are already a member of this community', community });
      return;
    }

    // Add user to community members list
    community.members.push(req.user!.id as any);
    await community.save();

    // Add user to all groups/channels within this community
    await Chat.updateMany(
      { communityId: community._id },
      { $addToSet: { participants: req.user!.id } }
    );

    const populated = await Community.findById(community._id)
      .populate('admins', 'username avatar')
      .populate({
        path: 'groupIds',
        select: 'name description lastMessage'
      });

    const io = req.app.get('io');
    if (io) {
      io.emit('community:updated', populated);
    }

    res.status(200).json({
      success: true,
      message: 'Joined community successfully',
      community: populated
    });
  } catch (error) {
    next(error);
  }
};

export const addCommunityChannel = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { communityId } = req.params;
    const { name, description } = req.body;

    const community = await Community.findOne({ _id: communityId, admins: req.user!.id });
    if (!community) {
      throw new CustomError('Community not found or administrator access denied', 403);
    }

    const newChannel = await Chat.create({
      name,
      description: description || '',
      isGroup: true,
      isCommunity: true,
      creatorId: req.user!.id,
      admins: [req.user!.id],
      participants: community.members,
      communityId: community._id
    });

    community.groupIds.push(newChannel._id as any);
    await community.save();

    const populated = await Community.findById(communityId)
      .populate('admins', 'username avatar')
      .populate('members', 'username avatar')
      .populate('groupIds', 'name description lastMessage');

    const io = req.app.get('io');
    if (io) {
      io.emit('community:updated', populated);
    }

    res.status(201).json({ success: true, channel: newChannel });
  } catch (error) {
    next(error);
  }
};

export const leaveCommunity = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { communityId } = req.params;
    const userId = req.user!.id;

    const community = await Community.findById(communityId);
    if (!community) throw new CustomError('Community not found', 404);

    // Creator cannot leave without transferring ownership
    if (community.creatorId.toString() === userId) {
      throw new CustomError('You must transfer community ownership before leaving', 400);
    }

    community.members = community.members.filter(m => m.toString() !== userId);
    community.admins = community.admins.filter(a => a.toString() !== userId);
    await community.save();

    // Pull from all community chats
    await Chat.updateMany(
      { communityId: community._id },
      { $pull: { participants: userId, admins: userId, moderators: userId } }
    );

    const io = req.app.get('io');
    if (io) {
      const populated = await Community.findById(communityId)
        .populate('admins', 'username avatar')
        .populate('members', 'username avatar')
        .populate('groupIds', 'name description lastMessage');
      if (populated) {
        io.emit('community:updated', populated);
      }
    }

    res.status(200).json({ success: true, message: 'Successfully left community' });
  } catch (error) {
    next(error);
  }
};

export const requestToJoinCommunity = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) throw new CustomError('Invite code is required', 400);

    const community = await Community.findOne({ inviteCode });
    if (!community) throw new CustomError('Community not found', 404);

    if (community.members.includes(req.user!.id as any)) {
      res.status(200).json({ success: true, message: 'You are already a member', isJoined: true });
      return;
    }

    if (community.privacyType === 'public') {
      // Public: Join immediately
      community.members.push(req.user!.id as any);
      await community.save();

      await Chat.updateMany(
        { communityId: community._id },
        { $addToSet: { participants: req.user!.id } }
      );

      res.status(200).json({
        success: true,
        message: 'Joined community successfully',
        isJoined: true,
        community
      });
    } else {
      // Private/Invite-only: Create a pending join request
      const existing = await CommunityJoinRequest.findOne({
        communityId: community._id,
        userId: req.user!.id
      });

      if (existing) {
        if (existing.status === 'pending') {
          throw new CustomError('A request to join is already pending approval', 400);
        }
        existing.status = 'pending';
        await existing.save();
      } else {
        await CommunityJoinRequest.create({
          communityId: community._id,
          userId: req.user!.id,
          status: 'pending'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Request to join submitted. Awaiting administrator approval.',
        isJoined: false
      });
    }
  } catch (error) {
    next(error);
  }
};

export const getJoinRequests = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { communityId } = req.params;

    const community = await Community.findOne({ _id: communityId, admins: req.user!.id });
    if (!community) throw new CustomError('Community not found or admin access denied', 403);

    const requests = await CommunityJoinRequest.find({
      communityId,
      status: 'pending'
    }).populate('userId', 'username avatar bio status');

    res.status(200).json({ success: true, requests });
  } catch (error) {
    next(error);
  }
};

export const actionJoinRequest = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body; // 'accept' or 'reject'

    const joinReq = await CommunityJoinRequest.findById(requestId);
    if (!joinReq) throw new CustomError('Request not found', 404);

    const community = await Community.findOne({ _id: joinReq.communityId, admins: req.user!.id });
    if (!community) throw new CustomError('Admin access denied', 403);

    if (action === 'accept') {
      joinReq.status = 'accepted';
      await joinReq.save();

      // Add user to community
      await Community.findByIdAndUpdate(joinReq.communityId, {
        $addToSet: { members: joinReq.userId }
      });

      // Add user to all community channels
      await Chat.updateMany(
        { communityId: joinReq.communityId },
        { $addToSet: { participants: joinReq.userId } }
      );
    } else {
      joinReq.status = 'rejected';
      await joinReq.save();
    }

    const populated = await Community.findById(joinReq.communityId)
      .populate('admins', 'username avatar')
      .populate('members', 'username avatar')
      .populate('groupIds', 'name description lastMessage');

    const io = req.app.get('io');
    if (io && populated) {
      io.emit('community:updated', populated);
    }

    res.status(200).json({ success: true, message: `Request successfully ${action}ed` });
  } catch (error) {
    next(error);
  }
};

export const updateCommunitySettings = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { communityId } = req.params;
    const { name, description, privacyType, welcomeMessage, guidelines, admins } = req.body;

    const community = await Community.findById(communityId);
    if (!community) throw new CustomError('Community not found', 404);

    const isOwner = community.creatorId.toString() === req.user!.id;
    const isAdmin = community.admins.includes(req.user!.id as any);
    if (!isOwner && !isAdmin) {
      throw new CustomError('Administrator access required', 403);
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (privacyType !== undefined) updateData.privacyType = privacyType;
    if (welcomeMessage !== undefined) updateData.welcomeMessage = welcomeMessage;
    if (guidelines !== undefined) updateData.guidelines = guidelines;

    // Only creator/owner can modify admins list
    if (isOwner && admins !== undefined) {
      updateData.admins = admins;
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    if (files) {
      if (files.avatar && files.avatar[0]) {
        const upload = await uploadMedia(files.avatar[0], 'communities');
        updateData.avatar = upload.url;
      }
      if (files.banner && files.banner[0]) {
        const upload = await uploadMedia(files.banner[0], 'communities');
        updateData.banner = upload.url;
      }
    }

    const updated = await Community.findByIdAndUpdate(
      communityId,
      { $set: updateData },
      { new: true }
    )
      .populate('admins', 'username avatar')
      .populate('members', 'username avatar')
      .populate('groupIds', 'name description lastMessage');

    const io = req.app.get('io');
    if (io) {
      io.emit('community:updated', updated);
    }

    res.status(200).json({ success: true, community: updated });
  } catch (error) {
    next(error);
  }
};

export const searchPublicCommunities = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query;

    const query: any = { privacyType: 'public', members: { $ne: req.user!.id } };
    if (q && typeof q === 'string') {
      query.name = { $regex: q, $options: 'i' };
    }

    const communities = await Community.find(query)
      .select('name description avatar banner members admins inviteCode welcomeMessage guidelines')
      .populate('admins', 'username avatar')
      .limit(30);

    res.status(200).json({ success: true, communities });
  } catch (error) {
    next(error);
  }
};

export const createCommunityRole = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { communityId } = req.params;
    const { name, color, permissions } = req.body;
    const community = await Community.findById(communityId);
    if (!community) throw new CustomError('Community not found', 404);
    if (community.creatorId.toString() !== req.user!.id && !community.admins.some(a => a.toString() === req.user!.id)) {
      throw new CustomError('Admin access required', 403);
    }
    
    community.roles.push({ name, color, permissions });
    await community.save();
    
    const io = req.app.get('io');
    if (io) io.emit('community:updated', community);
    
    res.status(200).json({ success: true, community });
  } catch (error) {
    next(error);
  }
};

export const assignMemberRole = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { communityId, userId } = req.params;
    const { roleName } = req.body;
    const community = await Community.findById(communityId);
    if (!community) throw new CustomError('Community not found', 404);
    if (community.creatorId.toString() !== req.user!.id && !community.admins.some(a => a.toString() === req.user!.id)) {
      throw new CustomError('Admin access required', 403);
    }
    
    community.memberRoles = community.memberRoles.filter(mr => mr.userId.toString() !== userId);
    if (roleName) {
      community.memberRoles.push({ userId: new Types.ObjectId(userId) as any, roleName });
    }
    await community.save();
    
    const io = req.app.get('io');
    if (io) io.emit('community:updated', community);
    
    res.status(200).json({ success: true, community });
  } catch (error) {
    next(error);
  }
};

export const createCommunityEvent = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { communityId } = req.params;
    const { title, description, date } = req.body;
    const community = await Community.findById(communityId);
    if (!community) throw new CustomError('Community not found', 404);
    if (community.creatorId.toString() !== req.user!.id && !community.admins.some(a => a.toString() === req.user!.id)) {
      throw new CustomError('Admin access required', 403);
    }
    
    community.events.push({
      title,
      description,
      date: new Date(date),
      creatorId: new Types.ObjectId(req.user!.id) as any,
      rsvps: []
    });
    await community.save();
    
    const io = req.app.get('io');
    if (io) io.emit('community:updated', community);
    
    res.status(200).json({ success: true, community });
  } catch (error) {
    next(error);
  }
};

export const rsvpToEvent = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { communityId, eventId } = req.params;
    const { status } = req.body;
    const community = await Community.findById(communityId);
    if (!community) throw new CustomError('Community not found', 404);
    
    const event = community.events.find(e => (e as any)._id.toString() === eventId);
    if (!event) throw new CustomError('Event not found', 404);
    
    event.rsvps = event.rsvps.filter(r => r.userId.toString() !== req.user!.id);
    event.rsvps.push({
      userId: new Types.ObjectId(req.user!.id) as any,
      status
    });
    await community.save();
    
    const io = req.app.get('io');
    if (io) io.emit('community:updated', community);
    
    res.status(200).json({ success: true, community });
  } catch (error) {
    next(error);
  }
};
