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
import { CommunityAuditLog } from '../models/CommunityAuditLog.js';
import { COMMUNITY_PERMISSIONS, isCommunityBanned, requireCommunityPermission } from '../services/communityAuthorization.js';
import { enqueueJob } from '../services/jobQueue.js';

const audit = (communityId: string, actorId: string, action: string, targetUserId?: string, metadata?: Record<string, unknown>) =>
  CommunityAuditLog.create({ communityId, actorId, action, targetUserId, metadata });

const emitCommunityRefresh = (req: AuthenticatedRequest, community: any) => {
  const io = req.app.get('io');
  for (const member of community?.members || []) {
    const id = member?._id?.toString?.() || member.toString();
    io?.to(`user:${id}`).emit('community:refresh', { communityId: community._id?.toString?.() || community.id });
  }
};

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
    await audit(community.id, req.user!.id, 'community.created');

    const populated = await Community.findById(community._id)
      .populate('admins', 'username avatar')
      .populate('members', 'username avatar')
      .populate({
        path: 'groupIds',
        select: 'name description lastMessage'
      });

    emitCommunityRefresh(req, community);

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

    if (isCommunityBanned(community, req.user!.id)) throw new CustomError('You are banned from this community', 403);

    // Check if user is already a member

    if (community.members.includes(req.user!.id as any)) {
      res.status(200).json({ success: true, message: 'You are already a member of this community', community });
      return;
    }

    // Add user to community members list
    community.members.push(req.user!.id as any);
    await community.save();
    await audit(community.id, req.user!.id, 'member.joined', req.user!.id);

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

    emitCommunityRefresh(req, community);

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

    const community = await requireCommunityPermission(communityId, req.user!.id, 'manage_channels');

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
    await audit(community.id, req.user!.id, 'channel.created', undefined, { channelId: newChannel.id, name });

    const populated = await Community.findById(communityId)
      .populate('admins', 'username avatar')
      .populate('members', 'username avatar')
      .populate('groupIds', 'name description lastMessage');

    emitCommunityRefresh(req, community);

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
    await audit(communityId, userId, 'member.left', userId);

    // Pull from all community chats
    await Chat.updateMany(
      { communityId: community._id },
      { $pull: { participants: userId, admins: userId, moderators: userId } }
    );

    emitCommunityRefresh(req, community);

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

    await requireCommunityPermission(communityId, req.user!.id, 'manage_members');

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

    const community = await requireCommunityPermission(joinReq.communityId.toString(), req.user!.id, 'manage_members');
    if (!['accept', 'reject'].includes(action)) throw new CustomError('Action must be accept or reject', 400);
    if (isCommunityBanned(community, joinReq.userId.toString())) throw new CustomError('Banned users cannot be approved', 403);

    await audit(community.id, req.user!.id, `join_request.${action}`, joinReq.userId.toString());

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

    emitCommunityRefresh(req, community);

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
    await requireCommunityPermission(communityId, req.user!.id, 'manage_settings');

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (privacyType !== undefined) {
      if (!['public', 'private', 'invite-only'].includes(privacyType)) throw new CustomError('Invalid privacy type', 400);
      updateData.privacyType = privacyType;
    }
    if (welcomeMessage !== undefined) updateData.welcomeMessage = welcomeMessage;
    if (guidelines !== undefined) updateData.guidelines = guidelines;

    // Only creator/owner can modify admins list
    if (isOwner && admins !== undefined) {
      if (!Array.isArray(admins) || admins.some((id: string) => !community.members.some((member) => member.toString() === id))) throw new CustomError('Admins must be community members', 400);
      updateData.admins = [...new Set([req.user!.id, ...admins])];
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

    if (privacyType !== undefined && !['public', 'private', 'invite-only'].includes(privacyType)) throw new CustomError('Invalid privacy type', 400);

    const updated = await Community.findByIdAndUpdate(
      communityId,
      { $set: updateData },
      { new: true }
    )
      .populate('admins', 'username avatar')
      .populate('members', 'username avatar')
      .populate('groupIds', 'name description lastMessage');

    await audit(communityId, req.user!.id, 'settings.updated', undefined, { fields: Object.keys(updateData) });
    const io = req.app.get('io');
    if (io) emitCommunityRefresh(req, updated);

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
      .select('name description avatar banner members admins welcomeMessage guidelines')
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
    const { name, color, permissions = [] } = req.body;
    const community = await requireCommunityPermission(communityId, req.user!.id, 'manage_roles');
    if (!name?.trim()) throw new CustomError('Role name is required', 400);
    if (!Array.isArray(permissions) || permissions.some((permission) => !COMMUNITY_PERMISSIONS.includes(permission))) {
      throw new CustomError('Invalid community permission', 400);
    }
    if (community.roles.some((role) => role.name.toLowerCase() === name.trim().toLowerCase())) {
      throw new CustomError('Role name already exists', 409);
    }
    community.roles.push({ name: name.trim(), color, permissions });
    await community.save();
    await audit(community.id, req.user!.id, 'role.created', undefined, { name: name.trim(), permissions });
    res.json({ success: true, community });
  } catch (error) { next(error); }
};

export const assignMemberRole = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { communityId, userId } = req.params;
    const { roleName } = req.body;
    const community = await requireCommunityPermission(communityId, req.user!.id, 'manage_roles');
    if (!community.members.some((member) => member.toString() === userId)) {
      throw new CustomError('User is not a community member', 404);
    }
    if (roleName && !community.roles.some((role) => role.name === roleName)) {
      throw new CustomError('Community role not found', 404);
    }
    community.memberRoles = community.memberRoles.filter((membership) => membership.userId.toString() !== userId);
    if (roleName) community.memberRoles.push({ userId: new Types.ObjectId(userId), roleName });
    await community.save();
    await audit(community.id, req.user!.id, 'member.role_changed', userId, { roleName: roleName || null });
    res.json({ success: true, community });
  } catch (error) { next(error); }
};

export const createCommunityEvent = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { communityId } = req.params;
    const { title, description, date } = req.body;
    const community = await requireCommunityPermission(communityId, req.user!.id, 'manage_events');
    const eventDate = new Date(date);
    if (!title?.trim() || Number.isNaN(eventDate.getTime()) || eventDate <= new Date()) {
      throw new CustomError('A title and future event date are required', 400);
    }
    community.events.push({
      title: title.trim(), description: String(description || '').slice(0, 2000), date: eventDate,
      creatorId: new Types.ObjectId(req.user!.id), rsvps: [],
    });
    await community.save();
    const event = community.events.at(-1) as any;
    await audit(community.id, req.user!.id, 'event.created', undefined, {
      eventId: event._id.toString(), title: title.trim(),
    });
    const reminderAt = new Date(eventDate.getTime() - 60 * 60 * 1000);
    await enqueueJob('community_event_reminder', {
      communityId: community.id, eventId: event._id.toString(),
    }, {
      idempotencyKey: `community-event:${event._id.toString()}`,
      runAt: reminderAt > new Date() ? reminderAt : new Date(),
    });
    res.status(201).json({ success: true, community });
  } catch (error) { next(error); }
};

export const rsvpToEvent = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { communityId, eventId } = req.params;
    const { status } = req.body;
    const community = await Community.findOne({ _id: communityId, members: req.user!.id });
    if (!community) throw new CustomError('Community membership required', 403);
    if (!['going', 'interested', 'declining'].includes(status)) throw new CustomError('Invalid RSVP status', 400);
    const event = community.events.find((item) => (item as any)._id.toString() === eventId);
    if (!event) throw new CustomError('Event not found', 404);
    event.rsvps = event.rsvps.filter((rsvp) => rsvp.userId.toString() !== req.user!.id);
    event.rsvps.push({ userId: new Types.ObjectId(req.user!.id), status });
    await community.save();
    res.json({ success: true, community });
  } catch (error) { next(error); }
};

export const banCommunityMember = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { communityId, userId } = req.params;
    const community = await requireCommunityPermission(communityId, req.user!.id, 'manage_members');
    if (community.creatorId.toString() === userId) throw new CustomError('Community owner cannot be banned', 400);
    const expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : undefined;
    if (expiresAt && (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date())) throw new CustomError('Ban expiry must be in the future', 400);
    community.bannedMembers = community.bannedMembers.filter((ban) => ban.userId.toString() !== userId);
    community.bannedMembers.push({ userId: new Types.ObjectId(userId), bannedBy: new Types.ObjectId(req.user!.id), reason: String(req.body.reason || '').slice(0, 500), expiresAt, createdAt: new Date() });
    community.members = community.members.filter((member) => member.toString() !== userId);
    community.admins = community.admins.filter((admin) => admin.toString() !== userId);
    community.memberRoles = community.memberRoles.filter((membership) => membership.userId.toString() !== userId);
    await community.save();
    await Chat.updateMany({ communityId }, { $pull: { participants: userId, admins: userId, moderators: userId } });
    await CommunityJoinRequest.deleteMany({ communityId, userId });
    await audit(communityId, req.user!.id, 'member.banned', userId, { reason: req.body.reason || '', expiresAt });
    res.json({ success: true });
  } catch (error) { next(error); }
};

export const unbanCommunityMember = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { communityId, userId } = req.params;
    const community = await requireCommunityPermission(communityId, req.user!.id, 'manage_members');
    community.bannedMembers = community.bannedMembers.filter((ban) => ban.userId.toString() !== userId);
    await community.save();
    await audit(communityId, req.user!.id, 'member.unbanned', userId);
    res.json({ success: true });
  } catch (error) { next(error); }
};

export const getCommunityAuditLog = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await requireCommunityPermission(req.params.communityId, req.user!.id, 'view_audit_log');
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
    const query: any = { communityId: req.params.communityId };
    if (req.query.before) query.createdAt = { $lt: new Date(String(req.query.before)) };
    const entries = await CommunityAuditLog.find(query)
      .populate('actorId', 'username avatar').populate('targetUserId', 'username avatar')
      .sort({ createdAt: -1 }).limit(limit);
    res.json({ success: true, entries, nextCursor: entries.at(-1)?.createdAt || null });
  } catch (error) { next(error); }
};
