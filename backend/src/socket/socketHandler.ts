import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Chat } from '../models/Chat.js';
import { Message } from '../models/Message.js';
import { logger } from '../utils/logger.js';

interface SocketUser {
  id: string;
  email: string;
  username: string;
}

export const socketHandler = (io: Server) => {
  // Authentication middleware for Socket.io
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) {
        return next(new Error('Authentication error: Token required'));
      }

      const accessSecret = process.env.JWT_ACCESS_SECRET || 'supersecretaccesskeyconnect123!@#';
      const decoded = jwt.verify(token as string, accessSecret) as SocketUser;

      socket.data.user = decoded;
      next();
    } catch (err) {
      logger.error(`Socket auth failed: ${(err as Error).message}`);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const user = socket.data.user as SocketUser;
    logger.info(`User connected to socket: ${user.username} (${socket.id})`);

    // Join personal user room to receive targeted events
    socket.join(`user:${user.id}`);

    // Update user presence status to online
    try {
      await User.findByIdAndUpdate(user.id, { status: 'online', lastSeen: new Date() });
      
      // Broadcast online status to all user's chats
      const userChats = await Chat.find({ participants: user.id });
      userChats.forEach((chat) => {
        socket.to(`chat:${chat._id}`).emit('presence:update', {
          userId: user.id,
          status: 'online',
          lastSeen: new Date()
        });
      });
    } catch (e: any) {
      logger.error(`Error updating presence on connect: ${e.message}`);
    }

    // Join specific chats
    socket.on('chat:join', (chatId: string) => {
      socket.join(`chat:${chatId}`);
      logger.debug(`Socket ${socket.id} joined room chat:${chatId}`);
    });

    socket.on('chat:leave', (chatId: string) => {
      socket.leave(`chat:${chatId}`);
      logger.debug(`Socket ${socket.id} left room chat:${chatId}`);
    });

    // Typing Indicators
    socket.on('typing:start', (chatId: string) => {
      socket.to(`chat:${chatId}`).emit('typing:start', {
        chatId,
        userId: user.id,
        username: user.username
      });
    });

    socket.on('typing:stop', (chatId: string) => {
      socket.to(`chat:${chatId}`).emit('typing:stop', {
        chatId,
        userId: user.id
      });
    });

    // Message Read Receipts
    socket.on('message:seen', async ({ chatId, messageIds }: { chatId: string; messageIds: string[] }) => {
      try {
        await Message.updateMany(
          { _id: { $in: messageIds } },
          {
            $set: { status: 'seen' },
            $addToSet: { seenBy: { userId: user.id as any, seenAt: new Date() } }
          }
        );

        socket.to(`chat:${chatId}`).emit('message:seen', {
          chatId,
          messageIds,
          seenByUserId: user.id,
          seenAt: new Date()
        });
      } catch (err: any) {
        logger.error(`Error marking messages as seen: ${err.message}`);
      }
    });

    // WebRTC Calling Signaling
    socket.on('call:initiate', ({ receiverId, callId, type, offer }) => {
      logger.info(`Call initiated by ${user.id} to ${receiverId} for call ${callId}`);
      socket.to(`user:${receiverId}`).emit('call:incoming', {
        callerId: user.id,
        callerName: user.username,
        callId,
        type,
        offer
      });
    });

    socket.on('call:accept', ({ callerId, answer }) => {
      logger.info(`Call accepted by ${user.id} for caller ${callerId}`);
      socket.to(`user:${callerId}`).emit('call:accepted', {
        receiverId: user.id,
        answer
      });
    });

    socket.on('call:reject', ({ callerId, reason }) => {
      logger.info(`Call rejected by ${user.id} for caller ${callerId}. Reason: ${reason}`);
      socket.to(`user:${callerId}`).emit('call:rejected', {
        receiverId: user.id,
        reason
      });
    });

    socket.on('call:candidate', ({ targetId, candidate }) => {
      socket.to(`user:${targetId}`).emit('call:candidate', {
        senderId: user.id,
        candidate
      });
    });

    socket.on('call:end', ({ targetId }) => {
      logger.info(`Call ended by ${user.id} targeting ${targetId}`);
      socket.to(`user:${targetId}`).emit('call:ended', {
        senderId: user.id
      });
    });

    // Handle user disconnect
    socket.on('disconnect', async () => {
      logger.info(`User disconnected from socket: ${user.username} (${socket.id})`);

      try {
        const lastSeen = new Date();
        await User.findByIdAndUpdate(user.id, { status: 'offline', lastSeen });

        // Broadcast offline status to all user's chats
        const userChats = await Chat.find({ participants: user.id });
        userChats.forEach((chat) => {
          socket.to(`chat:${chat._id}`).emit('presence:update', {
            userId: user.id,
            status: 'offline',
            lastSeen
          });
        });
      } catch (e: any) {
        logger.error(`Error updating presence on disconnect: ${e.message}`);
      }
    });
  });
};
