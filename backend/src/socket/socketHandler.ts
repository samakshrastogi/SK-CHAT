import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Chat } from '../models/Chat.js';
import { Message } from '../models/Message.js';
import { logger } from '../utils/logger.js';
import { initNotificationService, createNotification } from '../services/notificationService.js';

interface SocketUser {
  id: string;
  email: string;
  username: string;
}

export const socketHandler = (io: Server) => {
  // Wire the notification service so it can emit real-time events
  initNotificationService(io);

  // ── Authentication middleware ────────────────────────────────────────────
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) return next(new Error('Authentication error: Token required'));

      const accessSecret = process.env.JWT_ACCESS_SECRET || 'supersecretaccesskeyconnect123!@#';
      const decoded = jwt.verify(token as string, accessSecret) as SocketUser;
      socket.data.user = decoded;
      next();
    } catch (err) {
      logger.error(`Socket auth failed: ${(err as Error).message}`);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // ── Connection ───────────────────────────────────────────────────────────
  io.on('connection', async (socket: Socket) => {
    const user = socket.data.user as SocketUser;
    logger.info(`User connected to socket: ${user.username} (${socket.id})`);

    // Join personal room for targeted events & notifications
    socket.join(`user:${user.id}`);

    // Update presence → online
    try {
      await User.findByIdAndUpdate(user.id, { status: 'online', lastSeen: new Date() });
      const userChats = await Chat.find({ participants: user.id });
      userChats.forEach((chat) => {
        socket.to(`chat:${chat._id}`).emit('presence:update', {
          userId: user.id,
          status: 'online',
          lastSeen: new Date(),
        });
      });
    } catch (e: any) {
      logger.error(`Error updating presence on connect: ${e.message}`);
    }

    // ── Chat rooms ─────────────────────────────────────────────────────────
    socket.on('chat:join', (chatId: string) => {
      socket.join(`chat:${chatId}`);
      logger.debug(`Socket ${socket.id} joined room chat:${chatId}`);
    });

    socket.on('chat:leave', (chatId: string) => {
      socket.leave(`chat:${chatId}`);
      logger.debug(`Socket ${socket.id} left room chat:${chatId}`);
    });

    // ── Typing indicators ──────────────────────────────────────────────────
    socket.on('typing:start', (chatId: string) => {
      socket.to(`chat:${chatId}`).emit('typing:start', {
        chatId,
        userId: user.id,
        username: user.username,
      });
    });

    socket.on('typing:stop', (chatId: string) => {
      socket.to(`chat:${chatId}`).emit('typing:stop', { chatId, userId: user.id });
    });

    // ── Read receipts ──────────────────────────────────────────────────────
    socket.on('message:seen', async ({ chatId, messageIds }: { chatId: string; messageIds: string[] }) => {
      try {
        await Message.updateMany(
          { _id: { $in: messageIds } },
          {
            $set: { status: 'seen' },
            $addToSet: { seenBy: { userId: user.id as any, seenAt: new Date() } },
          }
        );
        socket.to(`chat:${chatId}`).emit('message:seen', {
          chatId,
          messageIds,
          seenByUserId: user.id,
          seenAt: new Date(),
        });
      } catch (err: any) {
        logger.error(`Error marking messages as seen: ${err.message}`);
      }
    });

    // ── Message-sent notification (emitted by chat controller after save) ──
    // Clients re-emit 'message:notify' after successfully POSTing a message so the
    // socket layer can fan-out notifications to offline participants.
    socket.on(
      'message:notify',
      async ({
        chatId,
        recipientIds,
        senderName,
        preview,
        messageId,
      }: {
        chatId: string;
        recipientIds: string[];
        senderName: string;
        preview: string;
        messageId: string;
      }) => {
        for (const rid of recipientIds) {
          if (rid === user.id) continue; // don't notify sender
          await createNotification({
            recipientId:   rid,
            actorId:       user.id,
            type:          'new_message',
            title:         senderName,
            body:          preview.slice(0, 120),
            referenceId:   chatId,
            referenceType: 'chat',
            expiresInHours: 72,
          });
        }
      }
    );

    // ── Mention notification ───────────────────────────────────────────────
    socket.on(
      'mention:notify',
      async ({ recipientId, chatId, messageId, preview }: { recipientId: string; chatId: string; messageId: string; preview: string }) => {
        await createNotification({
          recipientId,
          actorId:       user.id,
          type:          'mention',
          title:         `${user.username} mentioned you`,
          body:          preview.slice(0, 120),
          referenceId:   messageId,
          referenceType: 'message',
          expiresInHours: 72,
        });
      }
    );

    // ── Friend request notification ────────────────────────────────────────
    socket.on('friend_request:send', async ({ recipientId }: { recipientId: string }) => {
      await createNotification({
        recipientId,
        actorId:       user.id,
        type:          'friend_request',
        title:         'New friend request',
        body:          `${user.username} sent you a friend request`,
        referenceId:   user.id,
        referenceType: 'user',
        expiresInHours: 168, // 1 week
      });
      socket.to(`user:${recipientId}`).emit('friend_request:incoming', { senderId: user.id, senderName: user.username });
    });

    socket.on('friend_request:accept', async ({ requesterId }: { requesterId: string }) => {
      await createNotification({
        recipientId:   requesterId,
        actorId:       user.id,
        type:          'friend_request_accepted',
        title:         'Friend request accepted',
        body:          `${user.username} accepted your friend request`,
        referenceId:   user.id,
        referenceType: 'user',
        expiresInHours: 72,
      });
    });

    // ── Community invitation ───────────────────────────────────────────────
    socket.on(
      'community:invite',
      async ({ recipientId, communityId, communityName }: { recipientId: string; communityId: string; communityName: string }) => {
        await createNotification({
          recipientId,
          actorId:       user.id,
          type:          'community_invitation',
          title:         'Community invitation',
          body:          `${user.username} invited you to join "${communityName}"`,
          referenceId:   communityId,
          referenceType: 'community',
          expiresInHours: 168,
        });
        socket.to(`user:${recipientId}`).emit('community:invitation', { communityId, communityName, inviterId: user.id });
      }
    );

    // ── Event reminder (scheduled server-side but also emittable via socket) ──
    socket.on(
      'event:remind',
      async ({ recipientIds, eventTitle, communityId }: { recipientIds: string[]; eventTitle: string; communityId: string }) => {
        for (const rid of recipientIds) {
          await createNotification({
            recipientId:   rid,
            actorId:       user.id,
            type:          'event_reminder',
            title:         'Event starting soon',
            body:          `"${eventTitle}" is about to begin`,
            referenceId:   communityId,
            referenceType: 'community',
            expiresInHours: 24,
          });
        }
      }
    );

    // ── Client acknowledges a notification as read ─────────────────────────
    socket.on('notification:read', async ({ notificationId }: { notificationId: string }) => {
      const { Notification } = await import('../models/Notification.js');
      await Notification.findOneAndUpdate(
        { _id: notificationId, recipientId: user.id },
        { isRead: true }
      );
    });

    // ── WebRTC Calling Signaling ───────────────────────────────────────────
    socket.on('call:initiate', async ({ receiverId, callId, type, offer }) => {
      logger.info(`Call initiated by ${user.id} to ${receiverId} for call ${callId}`);
      socket.to(`user:${receiverId}`).emit('call:incoming', {
        callerId: user.id,
        callerName: user.username,
        callId,
        type,
        offer,
      });
    });

    socket.on('call:accept', ({ callerId, answer }) => {
      logger.info(`Call accepted by ${user.id} for caller ${callerId}`);
      socket.to(`user:${callerId}`).emit('call:accepted', { receiverId: user.id, answer });
    });

    socket.on('call:reject', async ({ callerId, reason }) => {
      logger.info(`Call rejected by ${user.id} for caller ${callerId}`);
      socket.to(`user:${callerId}`).emit('call:rejected', { receiverId: user.id, reason });
      // Notify caller of missed call
      await createNotification({
        recipientId:   callerId,
        actorId:       user.id,
        type:          'call_missed',
        title:         'Missed call',
        body:          `${user.username} declined your call`,
        referenceId:   callerId,
        referenceType: 'call',
        expiresInHours: 48,
      });
    });

    socket.on('call:candidate', ({ targetId, candidate }) => {
      socket.to(`user:${targetId}`).emit('call:candidate', { senderId: user.id, candidate });
    });

    socket.on('call:end', async ({ targetId }) => {
      logger.info(`Call ended by ${user.id} targeting ${targetId}`);
      socket.to(`user:${targetId}`).emit('call:ended', { senderId: user.id });
    });

    // ── Disconnect ─────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      logger.info(`User disconnected: ${user.username} (${socket.id})`);
      try {
        const lastSeen = new Date();
        await User.findByIdAndUpdate(user.id, { status: 'offline', lastSeen });
        const userChats = await Chat.find({ participants: user.id });
        userChats.forEach((chat) => {
          socket.to(`chat:${chat._id}`).emit('presence:update', {
            userId: user.id,
            status: 'offline',
            lastSeen,
          });
        });
      } catch (e: any) {
        logger.error(`Error updating presence on disconnect: ${e.message}`);
      }
    });
  });
};
