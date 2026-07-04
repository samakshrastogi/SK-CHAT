import { Response, NextFunction } from 'express';
import { User } from '../models/User.js';
import { FriendRequest } from '../models/FriendRequest.js';
import { createNotification } from '../services/notificationService.js';
import { CustomError } from '../utils/customError.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { uploadMedia } from '../services/cloudinaryService.js';
import { ConnectionCode } from '../models/ConnectionCode.js';
import { Chat } from '../models/Chat.js';

export const getProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user!.id)
      .select('-password -verificationToken -resetPasswordToken');
    if (!user) {
      throw new CustomError('User not found', 404);
    }
    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { bio, username } = req.body;
    const updateData: any = {};

    if (bio !== undefined) updateData.bio = bio;
    
    if (username) {
      updateData.username = username;
    }

    // Check files
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    if (files) {
      if (files.avatar && files.avatar[0]) {
        const upload = await uploadMedia(files.avatar[0], 'avatars');
        updateData.avatar = upload.url;
      }
      if (files.coverImage && files.coverImage[0]) {
        const upload = await uploadMedia(files.coverImage[0], 'covers');
        updateData.coverImage = upload.url;
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user!.id,
      { $set: updateData },
      { new: true }
    ).select('-password');

    res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
    next(error);
  }
};

export const searchUsers = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      res.status(200).json({ success: true, users: [] });
      return;
    }

    const users = await User.find({
      $and: [
        { _id: { $ne: req.user!.id } },
        { isVerified: true },
        {
          $or: [
            { username: { $regex: q, $options: 'i' } },
            { email: { $regex: q, $options: 'i' } }
          ]
        }
      ]
    })
      .select('username avatar email bio status lastSeen')
      .limit(20);

    res.status(200).json({ success: true, users });
  } catch (error) {
    next(error);
  }
};

export const updateThemeSettings = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { theme, accentColor, wallpaper } = req.body;
    const settingsUpdate: any = {};

    if (theme) settingsUpdate['themeSettings.theme'] = theme;
    if (accentColor) settingsUpdate['themeSettings.accentColor'] = accentColor;
    if (wallpaper !== undefined) settingsUpdate['themeSettings.wallpaper'] = wallpaper;

    const user = await User.findByIdAndUpdate(
      req.user!.id,
      { $set: settingsUpdate },
      { new: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      themeSettings: user!.themeSettings
    });
  } catch (error) {
    next(error);
  }
};

export const blockUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.body;
    if (userId === req.user!.id) {
      throw new CustomError('You cannot block yourself', 400);
    }

    const userToBlock = await User.findById(userId);
    if (!userToBlock) {
      throw new CustomError('User to block not found', 404);
    }

    const user = await User.findById(req.user!.id);
    const alreadyBlocked = user!.blockedUsers.includes(userId);

    const update = alreadyBlocked
      ? { $pull: { blockedUsers: userId } }
      : { $addToSet: { blockedUsers: userId } };

    const updated = await User.findByIdAndUpdate(
      req.user!.id,
      update,
      { new: true }
    ).populate('blockedUsers', 'username avatar bio email');

    res.status(200).json({
      success: true,
      blockedUsers: updated!.blockedUsers,
      message: alreadyBlocked ? 'User unblocked' : 'User blocked'
    });
  } catch (error) {
    next(error);
  }
};

export const getBlockedUsers = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user!.id)
      .populate('blockedUsers', 'username avatar bio email');
    res.status(200).json({
      success: true,
      blockedUsers: user!.blockedUsers
    });
  } catch (error) {
    next(error);
  }
};

export const getDiscoveryUsers = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const currentUserId = req.user!.id;
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) throw new CustomError('User not found', 404);

    const excludeIds = [
      currentUserId,
      ...currentUser.friends,
      ...currentUser.blockedUsers
    ];

    // Recently joined (sorted by createdAt desc)
    const recentlyJoined = await User.find({
      _id: { $nin: excludeIds },
      isVerified: true
    })
      .select('username avatar bio status lastSeen createdAt')
      .sort({ createdAt: -1 })
      .limit(10);

    // Suggested users: find other users who are not friends/blocked, and calculate mutual friends
    const suggestedCandidates = await User.find({
      _id: { $nin: excludeIds },
      isVerified: true
    })
      .select('username avatar bio status lastSeen friends')
      .limit(20);

    // Map candidates to add mutual friends count
    const currentUserFriendIds = currentUser.friends.map(id => id.toString());
    const suggested = suggestedCandidates.map(u => {
      const mutuals = u.friends.filter(fId => currentUserFriendIds.includes(fId.toString()));
      return {
        _id: u._id,
        username: u.username,
        avatar: u.avatar,
        bio: u.bio,
        status: u.status,
        lastSeen: u.lastSeen,
        mutualFriends: mutuals.length
      };
    }).sort((a, b) => b.mutualFriends - a.mutualFriends).slice(0, 10);

    res.status(200).json({
      success: true,
      recentlyJoined,
      suggested
    });
  } catch (error) {
    next(error);
  }
};

export const sendFriendRequest = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const senderId = req.user!.id;
    const { receiverId } = req.body;

    if (senderId === receiverId) {
      throw new CustomError('You cannot add yourself', 400);
    }

    const [senderUser, receiverUser] = await Promise.all([
      User.findById(senderId),
      User.findById(receiverId)
    ]);

    if (!receiverUser) throw new CustomError('Receiver not found', 404);
    if (!senderUser) throw new CustomError('Sender not found', 404);

    if (senderUser.blockedUsers.some(id => id.toString() === receiverId)) {
      throw new CustomError('You have blocked this user. Unblock them first.', 400);
    }
    if (receiverUser.blockedUsers.some(id => id.toString() === senderId)) {
      throw new CustomError('You cannot send a request to this user.', 400);
    }

    if (senderUser.friends.some(id => id.toString() === receiverId)) {
      throw new CustomError('You are already friends', 400);
    }

    // Check existing requests
    let request = await FriendRequest.findOne({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId }
      ]
    });

    if (request) {
      if (request.status === 'pending') {
        throw new CustomError('A request is already pending between you two', 400);
      }
      if (request.status === 'accepted') {
        throw new CustomError('You are already friends', 400);
      }
      
      // Update status if it was declined/cancelled
      request.senderId = senderId as any;
      request.receiverId = receiverId as any;
      request.status = 'pending';
      await request.save();
    } else {
      request = await FriendRequest.create({ senderId, receiverId, status: 'pending' });
    }

    // Send real-time notification
    await createNotification({
      recipientId: receiverId,
      actorId: senderId,
      type: 'friend_request',
      title: 'New Friend Request',
      body: `${senderUser.username} sent you a friend request.`,
      referenceId: request._id.toString(),
      referenceType: 'user',
      expiresInHours: 168
    });

    res.status(200).json({ success: true, message: 'Friend request sent', request });
  } catch (error) {
    next(error);
  }
};

export const acceptFriendRequest = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const receiverId = req.user!.id;
    const { requestId } = req.body;

    const request = await FriendRequest.findById(requestId);
    if (!request) throw new CustomError('Friend request not found', 404);
    if (request.receiverId.toString() !== receiverId) {
      throw new CustomError('Unauthorized to accept this request', 403);
    }
    if (request.status !== 'pending') {
      throw new CustomError(`Request is not pending (current status: ${request.status})`, 400);
    }

    request.status = 'accepted';
    await request.save();

    // Add to each other's friends list
    await Promise.all([
      User.findByIdAndUpdate(request.senderId, { $addToSet: { friends: request.receiverId } }),
      User.findByIdAndUpdate(request.receiverId, { $addToSet: { friends: request.senderId } })
    ]);

    const receiverUser = await User.findById(receiverId);

    // Send notification to the sender
    await createNotification({
      recipientId: request.senderId.toString(),
      actorId: receiverId,
      type: 'friend_request_accepted',
      title: 'Friend Request Accepted',
      body: `${receiverUser?.username || 'Someone'} accepted your friend request.`,
      referenceId: receiverId,
      referenceType: 'user',
      expiresInHours: 72
    });

    res.status(200).json({ success: true, message: 'Friend request accepted', request });
  } catch (error) {
    next(error);
  }
};

export const rejectFriendRequest = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const receiverId = req.user!.id;
    const { requestId } = req.body;

    const request = await FriendRequest.findById(requestId);
    if (!request) throw new CustomError('Friend request not found', 404);
    if (request.receiverId.toString() !== receiverId) {
      throw new CustomError('Unauthorized to reject this request', 403);
    }

    request.status = 'declined';
    await request.save();

    res.status(200).json({ success: true, message: 'Friend request declined', request });
  } catch (error) {
    next(error);
  }
};

export const cancelFriendRequest = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const senderId = req.user!.id;
    const { requestId } = req.body;

    const request = await FriendRequest.findById(requestId);
    if (!request) throw new CustomError('Friend request not found', 404);
    if (request.senderId.toString() !== senderId) {
      throw new CustomError('Unauthorized to cancel this request', 403);
    }

    request.status = 'cancelled';
    await request.save();

    res.status(200).json({ success: true, message: 'Friend request cancelled', request });
  } catch (error) {
    next(error);
  }
};

export const removeFriend = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { friendId } = req.body;

    // Pull from both lists
    await Promise.all([
      User.findByIdAndUpdate(userId, { $pull: { friends: friendId } }),
      User.findByIdAndUpdate(friendId, { $pull: { friends: userId } })
    ]);

    // Also delete any existing accepted FriendRequest to reset friendship state
    await FriendRequest.deleteMany({
      $or: [
        { senderId: userId, receiverId: friendId },
        { senderId: friendId, receiverId: userId }
      ]
    });

    res.status(200).json({ success: true, message: 'Friend removed successfully' });
  } catch (error) {
    next(error);
  }
};

export const getFriendsList = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const currentUserId = req.user!.id;
    const user = await User.findById(currentUserId)
      .populate('friends', 'username avatar bio status lastSeen friends');
    if (!user) throw new CustomError('User not found', 404);

    // Map each friend to include mutual friends count
    const friends = user.friends.map((friend: any) => {
      const mutuals = friend.friends.filter((fId: any) => user.friends.some(myFriend => myFriend._id.toString() === fId.toString()));
      return {
        _id: friend._id,
        username: friend.username,
        avatar: friend.avatar,
        bio: friend.bio,
        status: friend.status,
        lastSeen: friend.lastSeen,
        mutualFriends: mutuals.length
      };
    });

    res.status(200).json({ success: true, friends });
  } catch (error) {
    next(error);
  }
};

export const getFriendRequests = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    // Incoming requests (received)
    const incoming = await FriendRequest.find({ receiverId: userId, status: 'pending' })
      .populate('senderId', 'username avatar bio status lastSeen');

    // Outgoing requests (sent)
    const outgoing = await FriendRequest.find({ senderId: userId, status: 'pending' })
      .populate('receiverId', 'username avatar bio status lastSeen');

    res.status(200).json({ success: true, incoming, outgoing });
  } catch (error) {
    next(error);
  }
};

export const muteUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.body;
    if (userId === req.user!.id) {
      throw new CustomError('You cannot mute yourself', 400);
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) throw new CustomError('User not found', 404);

    const user = await User.findById(req.user!.id);
    const alreadyMuted = user!.mutedUsers.includes(userId);

    const update = alreadyMuted
      ? { $pull: { mutedUsers: userId } }
      : { $addToSet: { mutedUsers: userId } };

    const updated = await User.findByIdAndUpdate(
      req.user!.id,
      update,
      { new: true }
    ).populate('mutedUsers', 'username avatar bio status');

    res.status(200).json({
      success: true,
      mutedUsers: updated!.mutedUsers,
      message: alreadyMuted ? 'User unmuted' : 'User muted'
    });
  } catch (error) {
    next(error);
  }
};

export const getMutedUsers = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user!.id)
      .populate('mutedUsers', 'username avatar bio status');
    res.status(200).json({
      success: true,
      mutedUsers: user!.mutedUsers
    });
  } catch (error) {
    next(error);
  }
};

export const generateConnectionCode = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    // Delete existing codes for this user
    await ConnectionCode.deleteMany({ userId });

    // Generate unique 4-digit code
    let code = '';
    let exists = true;
    while (exists) {
      code = Math.floor(1000 + Math.random() * 9000).toString();
      const found = await ConnectionCode.findOne({ code });
      if (!found) exists = false;
    }

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min
    await ConnectionCode.create({
      code,
      userId,
      expiresAt
    });

    res.status(200).json({ success: true, code, expiresAt });
  } catch (error) {
    next(error);
  }
};

export const resolveConnectionCode = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { code } = req.body;
    if (!code || code.length !== 4) {
      throw new CustomError('Valid 4-digit code is required', 400);
    }

    const connCode = await ConnectionCode.findOne({ code });
    if (!connCode) {
      throw new CustomError('Invalid or expired code', 404);
    }

    const targetUserId = connCode.userId.toString();
    const currentUserId = req.user!.id;

    if (targetUserId === currentUserId) {
      throw new CustomError('You cannot connect with yourself', 400);
    }

    // Connect: create or get 1-on-1 chat
    let chat = await Chat.findOne({
      isGroup: false,
      participants: { $all: [currentUserId, targetUserId] }
    }).populate('participants', 'username avatar status lastSeen bio');

    if (!chat) {
      const newChat = await Chat.create({
        isGroup: false,
        participants: [currentUserId, targetUserId]
      });
      chat = await Chat.findById(newChat._id)
        .populate('participants', 'username avatar status lastSeen bio');
    }

    // Delete single-use code
    await ConnectionCode.deleteOne({ _id: connCode._id });

    // Return target user and chat
    const targetUser = await User.findById(targetUserId).select('username avatar status lastSeen bio');

    res.status(200).json({ success: true, chat, targetUser });
  } catch (error) {
    next(error);
  }
};
