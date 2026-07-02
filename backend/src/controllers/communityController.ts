import { Response, NextFunction } from 'express';
import { Community } from '../models/Community.js';
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

    // 2. Create the default announcement channel (which is a Chat document)
    const announcementChat = await Chat.create({
      name: `${name} Announcements`,
      description: `Official announcements for ${name}`,
      isGroup: true,
      isCommunity: true,
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
      creatorId: req.user!.id,
      admins: [req.user!.id],
      participants: [req.user!.id],
      communityId: community._id
    });

    // 4. Update and save the community
    community.announcementChannelId = announcementChat._id as any;
    community.groupIds = [announcementChat._id as any, generalChat._id as any];
    await community.save();

    const populated = await Community.findById(community._id)
      .populate('admins', 'username avatar')
      .populate('members', 'username avatar')
      .populate({
        path: 'groupIds',
        select: 'name description lastMessage'
      });

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

    res.status(201).json({ success: true, channel: newChannel });
  } catch (error) {
    next(error);
  }
};
