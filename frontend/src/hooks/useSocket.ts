import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore.js';
import { useChatStore } from '../store/chatStore.js';
import { useCallStore } from '../store/callStore.js';
import { getAccessTokenInMemory } from '../api/client.js';

const SOCKET_SERVER_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  
  const { optimisticAddMessage, updateMessageStatus, setTypingUser, chats, fetchChats, localDeleteMessage, localUpdatePoll, localUpdatePinnedMessages } = useChatStore();
  const { setIncomingCall, resetCallStore } = useCallStore();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const token = getAccessTokenInMemory();
    if (!token) return;

    // Connect socket with token handshake
    const socket = io(SOCKET_SERVER_URL, {
      auth: { token },
      transports: ['websocket']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected successfully');
      
      // Auto rejoin active rooms from our chats list
      chats.forEach((chat) => {
        socket.emit('chat:join', chat._id);
      });
    });

    // Handle receiving messages
    socket.on('message:receive', (message) => {
      optimisticAddMessage(message.chatId, message);
      
      // Request browser notification if tab not focused
      if (document.hidden && Notification.permission === 'granted') {
        new Notification(`New message from ${message.senderId.username || 'Connect'}`, {
          body: message.messageType === 'text' ? message.content : `Sent an attachment: [${message.messageType}]`,
          icon: message.senderId.avatar || '/icon.png'
        });
      }

      // Automatically send delivered receipt back
      socket.emit('message:delivered', {
        chatId: message.chatId,
        messageId: message._id,
        receiverId: user.id
      });
    });

    // Handle read receipts
    socket.on('message:seen', ({ chatId, messageIds }) => {
      messageIds.forEach((msgId: string) => {
        updateMessageStatus(chatId, msgId, 'seen');
      });
    });

    socket.on('message:delivered', ({ chatId, messageId }) => {
      updateMessageStatus(chatId, messageId, 'delivered');
    });

    // Typing Indicators
    socket.on('typing:start', ({ chatId, userId, username }) => {
      setTypingUser(chatId, userId, username);
    });

    socket.on('typing:stop', ({ chatId, userId }) => {
      setTypingUser(chatId, userId, null);
    });

    socket.on('message:deleted', ({ messageId }) => {
      localDeleteMessage(messageId);
    });

    socket.on('poll:updated', ({ messageId, pollData }) => {
      localUpdatePoll(messageId, pollData);
    });

    socket.on('chat:pinned-updated', ({ chatId, pinnedMessages }) => {
      localUpdatePinnedMessages(chatId, pinnedMessages);
    });

    // Presence Toggles
    socket.on('presence:update', ({ userId, status, lastSeen }) => {
      // Re-trigger chats fetch or dynamically adjust local participants online status in Zustand
      // For simplicity, we can reload chats or trigger state refreshes
      // We will refresh chat participants statuses
    });

    // WebRTC Signaling
    socket.on('call:incoming', ({ callerId, callerName, callId, type, offer }) => {
      setIncomingCall(callerId, callerName, callId, type);
    });

    socket.on('call:ended', () => {
      resetCallStore();
    });

    // Cleanups
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, user, chats]);

  const emitEvent = (event: string, data: any) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data);
    }
  };

  return { socket: socketRef.current, emitEvent };
};
