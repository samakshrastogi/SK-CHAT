import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Chat } from '../models/Chat.js';
import { Message } from '../models/Message.js';
import { Call } from '../models/Call.js';
import { logger } from '../utils/logger.js';
import { initNotificationService, createNotification } from '../services/notificationService.js';
import { getJwtAccessSecret } from '../config/env.js';

interface SocketUser {
  id: string;
  email: string;
  username: string;
}

export const socketHandler = (io: Server) => {
  // Wire the notification service so it can emit real-time events
  initNotificationService(io);
  const activeSocketsByUser = new Map<string, Set<string>>();
  const activeGroupCalls = new Map<string, Set<string>>();

  // ── Authentication middleware ────────────────────────────────────────────
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) return next(new Error('Authentication error: Token required'));

      const accessSecret = getJwtAccessSecret();
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

    const activeSockets = activeSocketsByUser.get(user.id) || new Set<string>();
    activeSockets.add(socket.id);
    activeSocketsByUser.set(user.id, activeSockets);

    // Update presence → online
    try {
      const connectedUserSockets = await io.in(`user:${user.id}`).fetchSockets();
      const wasAlreadyOnline = connectedUserSockets.length > 1;
      if (!wasAlreadyOnline) {
        await User.findByIdAndUpdate(user.id, { status: 'online', lastSeen: new Date() });
        const userChats = await Chat.find({ participants: user.id });
        userChats.forEach((chat) => {
          socket.to(`chat:${chat._id}`).emit('presence:update', {
            userId: user.id,
            status: 'online',
            lastSeen: new Date(),
          });
        });
      }
    } catch (e: any) {
      logger.error(`Error updating presence on connect: ${e.message}`);
    }

    // ── Chat rooms ─────────────────────────────────────────────────────────
    const isChatMember = async (chatId: string) => Boolean(await Chat.exists({ _id: chatId, participants: user.id }));
    socket.on('chat:join', async (chatId: string, acknowledge?: (result: { ok: boolean; error?: string }) => void) => {
      try {
        if (!await isChatMember(chatId)) {
          acknowledge?.({ ok: false, error: 'Chat access denied' });
          return;
        }
        await socket.join(`chat:${chatId}`);
        acknowledge?.({ ok: true });
        logger.debug(`Socket ${socket.id} joined room chat:${chatId}`);
      } catch {
        acknowledge?.({ ok: false, error: 'Unable to join chat' });
      }
    });

    socket.on('chat:leave', (chatId: string) => {
      socket.leave(`chat:${chatId}`);
      logger.debug(`Socket ${socket.id} left room chat:${chatId}`);
    });

    // ── Typing indicators ──────────────────────────────────────────────────
    socket.on('typing:start', async (chatId: string) => {
      if (!await isChatMember(chatId)) return;
      socket.to(`chat:${chatId}`).emit('typing:start', {
        chatId,
        userId: user.id,
        username: user.username,
      });
    });

    socket.on('typing:stop', async (chatId: string) => {
      if (!await isChatMember(chatId)) return;
      socket.to(`chat:${chatId}`).emit('typing:stop', { chatId, userId: user.id });
    });

    // ── Read receipts ──────────────────────────────────────────────────────
    socket.on('message:seen', async ({ chatId, messageIds }: { chatId: string; messageIds: string[] }) => {
      try {
        if (!await isChatMember(chatId)) return;
        await Message.updateMany(
          { _id: { $in: messageIds }, chatId, senderId: { $ne: user.id } },
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

    // ── Delivery receipts ──────────────────────────────────────────────────
    socket.on('message:delivered', async ({ chatId, messageId }: { chatId: string; messageId: string }) => {
      try {
        if (!await isChatMember(chatId)) return;
        await Message.updateOne(
          { _id: messageId, chatId, senderId: { $ne: user.id }, status: 'sent' },
          { $set: { status: 'delivered' } }
        );
        socket.to(`chat:${chatId}`).emit('message:delivered', {
          chatId,
          messageId,
          status: 'delivered'
        });
      } catch (err: any) {
        logger.error(`Error marking message as delivered: ${err.message}`);
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
        if (!await isChatMember(chatId)) return;
        const chat = await Chat.findOne({ _id: chatId, participants: user.id }).select('participants').lean();
        const allowedRecipients = new Set((chat?.participants || []).map(String));
        for (const rid of recipientIds) {
          if (!allowedRecipients.has(rid)) continue;
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
        if (!await isChatMember(chatId)) return;
        const recipientAllowed = await Chat.exists({ _id: chatId, participants: { $all: [user.id, recipientId] } });
        if (!recipientAllowed) return;
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
      io.to(`user:${user.id}`).emit('notification:read', { notificationId });
    });

    // ── WebRTC Calling Signaling ───────────────────────────────────────────
    // Authorized mesh group-call signaling.
    socket.on('call:initiate-group', async ({ chatId, callId, type }) => {
      const call = await Call.findOne({ _id: callId, chatId, callerId: user.id, participants: user.id }).lean();
      if (!call) return;
      const room = `call:${callId}`;
      socket.join(room);
      activeGroupCalls.set(callId, new Set([user.id]));
      await Call.findByIdAndUpdate(callId, { status: 'ringing' });
      for (const participant of call.participants || []) {
        const participantId = participant.toString();
        if (participantId !== user.id) io.to(`user:${participantId}`).emit('call:incoming', {
          callerId: user.id, callerName: user.username, callId, chatId, type, isGroupCall: true,
        });
      }
    });

    socket.on('call:join-group', async ({ callId }) => {
      if (!await Call.exists({ _id: callId, participants: user.id })) return;
      const room = `call:${callId}`;
      const joined = activeGroupCalls.get(callId) || new Set<string>();
      socket.join(room);
      socket.to(room).emit('call:participant-joined', { userId: user.id, username: user.username });
      joined.add(user.id); activeGroupCalls.set(callId, joined);
      await Call.findByIdAndUpdate(callId, { status: 'connected' });
    });

    const relayGroupSignal = async (event: string, targetId: string, callId: string, payload: Record<string, unknown>) => {
      const room = `call:${callId}`;
      const roomSockets = await io.in(room).fetchSockets();
      const joinedUsers = new Set(roomSockets.map((joinedSocket) => joinedSocket.data.user?.id).filter(Boolean));
      if (!joinedUsers.has(user.id) || !joinedUsers.has(targetId)) return;
      if (await Call.exists({ _id: callId, participants: { $all: [user.id, targetId] } })) {
        io.to(`user:${targetId}`).emit(event, { senderId: user.id, senderName: user.username, ...payload });
      }
    };
    socket.on('call:peer-offer', ({ targetId, callId, offer }) => relayGroupSignal('call:peer-offer', targetId, callId, { offer }));
    socket.on('call:peer-answer', ({ targetId, callId, answer }) => relayGroupSignal('call:peer-answer', targetId, callId, { answer }));
    socket.on('call:peer-candidate', ({ targetId, callId, candidate }) => relayGroupSignal('call:peer-candidate', targetId, callId, { candidate }));

    socket.on('call:leave-group', async ({ callId }) => {
      const joined = activeGroupCalls.get(callId);
      if (!joined?.has(user.id)) return;
      joined.delete(user.id); socket.leave(`call:${callId}`);
      socket.to(`call:${callId}`).emit('call:participant-left', { userId: user.id });
      if (joined.size === 0) activeGroupCalls.delete(callId); else activeGroupCalls.set(callId, joined);
      const call = await Call.findById(callId);
      if (call && call.callerId.toString() === user.id) {
        call.status = 'completed'; call.endedAt = new Date(); await call.save();
        io.to(`call:${callId}`).emit('call:ended', { senderId: user.id }); activeGroupCalls.delete(callId);
      }
    });
    socket.on('call:initiate', async ({ receiverId, callId, type, offer }) => {
      const call = await Call.findOne({ _id: callId, callerId: user.id, receiverId });
      if (!call) return;
      call.status = 'ringing';
      await call.save();
      logger.info(`Call initiated by ${user.id} to ${receiverId} for call ${callId}`);
      const receiverRoom = `user:${receiverId}`;
      const receiverSockets = await io.in(receiverRoom).fetchSockets();
      if (receiverSockets.length === 0) {
        call.status = 'missed';
        call.endedAt = new Date();
        await call.save();
        io.to(`user:${user.id}`).emit('call:unavailable', { receiverId, reason: 'User is offline' });
        return;
      }
      io.to(receiverRoom).emit('call:incoming', {
        callerId: user.id,
        callerName: user.username,
        callId,
        type,
        offer,
      });
    });

    socket.on('call:accept', async ({ callerId, callId, answer }) => {
      const call = await Call.findOne({ _id: callId, callerId, receiverId: user.id });
      if (!call) return;
      call.status = 'connected';
      await call.save();
      logger.info(`Call accepted by ${user.id} for caller ${callerId}`);
      io.to(`user:${callerId}`).emit('call:accepted', { receiverId: user.id, callId, answer });
    });

    socket.on('call:reject', async ({ callerId, callId, reason }) => {
      const call = await Call.findOne({ _id: callId, callerId, receiverId: user.id });
      if (!call) return;
      call.status = 'rejected';
      call.endedAt = new Date();
      await call.save();
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

    socket.on('call:candidate', async ({ targetId, callId, candidate }) => {
      if (!await Call.exists({ _id: callId, $or: [{ callerId: user.id, receiverId: targetId }, { callerId: targetId, receiverId: user.id }] })) return;
      io.to(`user:${targetId}`).emit('call:candidate', { senderId: user.id, candidate });
    });

    socket.on('call:restart-offer', async ({ targetId, callId, offer }) => {
      const authorized = await Call.exists({ _id: callId, status: 'connected', $or: [
        { callerId: user.id, receiverId: targetId },
        { callerId: targetId, receiverId: user.id },
      ] });
      if (authorized) io.to(`user:${targetId}`).emit('call:restart-offer', { senderId: user.id, offer });
    });

    socket.on('call:restart-answer', async ({ targetId, callId, answer }) => {
      const authorized = await Call.exists({ _id: callId, status: 'connected', $or: [
        { callerId: user.id, receiverId: targetId },
        { callerId: targetId, receiverId: user.id },
      ] });
      if (authorized) io.to(`user:${targetId}`).emit('call:restart-answer', { senderId: user.id, answer });
    });
    socket.on('call:end', async ({ targetId, callId }) => {
      const call = await Call.findOne({ _id: callId, $or: [{ callerId: user.id, receiverId: targetId }, { callerId: targetId, receiverId: user.id }] });
      if (!call) return;
      call.status = call.status === 'ringing' ? 'missed' : 'completed';
      call.endedAt = new Date();
      call.duration = Math.max(0, Math.round((call.endedAt.getTime() - (call.startedAt || call.createdAt).getTime()) / 1000));
      await call.save();
      logger.info(`Call ended by ${user.id} targeting ${targetId}`);
      socket.to(`user:${targetId}`).emit('call:ended', { senderId: user.id });
    });

    // ── Whiteboard Canvas Sync ─────────────────────────────────────────────
    socket.on('canvas:draw', async ({ chatId, drawData }: { chatId: string; drawData: any }) => {
      if (!await isChatMember(chatId)) return;
      socket.to(`chat:${chatId}`).emit('canvas:draw', { drawData, userId: user.id });
    });

    socket.on('canvas:clear', async ({ chatId }: { chatId: string }) => {
      if (!await isChatMember(chatId)) return;
      socket.to(`chat:${chatId}`).emit('canvas:clear');
    });

    // ── E2EE Key Exchange ──────────────────────────────────────────────────
    socket.on('e2ee:key_exchange', async ({
      targetUserId,
      chatId,
      keyData,
    }: { targetUserId: string; chatId: string; keyData: any }) => {
      const authorized = await Chat.exists({
        _id: chatId,
        isGroup: false,
        participants: { $all: [user.id, targetUserId] },
      });
      if (!authorized) return;
      socket.to(`user:${targetUserId}`).emit('e2ee:key_exchange', {
        senderId: user.id,
        chatId,
        keyData,
      });
    });

    // ── In-Chat Typing state ───────────────────────────────────────────────
    socket.on('typing:state', async ({ chatId, isTyping }: { chatId: string; isTyping: boolean }) => {
      if (!await isChatMember(chatId)) return;
      socket.to(`chat:${chatId}`).emit('typing:state', { chatId, userId: user.id, username: user.username, isTyping });
    });

    // ── Disconnect ─────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      logger.info(`User disconnected: ${user.username} (${socket.id})`);
      try {
        const activeSockets = activeSocketsByUser.get(user.id);
        if (activeSockets) {
          activeSockets.delete(socket.id);
          if (activeSockets.size > 0) return;
          activeSocketsByUser.delete(user.id);
        }

        const connectedUserSockets = await io.in(`user:${user.id}`).fetchSockets();
        if (connectedUserSockets.length > 0) return;

        for (const [callId, joined] of activeGroupCalls) {
          if (!joined.delete(user.id)) continue;
          io.to(`call:${callId}`).emit('call:participant-left', { userId: user.id });
          const call = await Call.findById(callId);
          if (call?.callerId.toString() === user.id) {
            call.status = 'completed'; call.endedAt = new Date(); await call.save();
            io.to(`call:${callId}`).emit('call:ended', { senderId: user.id });
            activeGroupCalls.delete(callId);
          } else if (joined.size === 0) activeGroupCalls.delete(callId);
        }
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
