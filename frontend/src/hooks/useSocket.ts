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
  
  const { optimisticAddMessage, updateMessageStatus, setTypingUser, chats, fetchChats, localDeleteMessage, localUpdatePoll, localUpdatePinnedMessages, localUpdateReactions, localUpdateUserPresence, incrementUnread } = useChatStore();
  const { setIncomingCall, resetCallStore } = useCallStore();

  const chatsRef = useRef(chats);
  const joinedRoomsRef = useRef<Set<string>>(new Set());

  // Keep chatsRef up-to-date
  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  // Dynamically join new chat rooms without reconnecting the socket
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) return;

    chats.forEach((chat) => {
      if (!joinedRoomsRef.current.has(chat._id)) {
        socket.emit('chat:join', chat._id);
        joinedRoomsRef.current.add(chat._id);
        console.log(`Joined new chat room dynamically: ${chat._id}`);
      }
    });
  }, [chats]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        joinedRoomsRef.current.clear();
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
      joinedRoomsRef.current.clear();
      chatsRef.current.forEach((chat) => {
        socket.emit('chat:join', chat._id);
        joinedRoomsRef.current.add(chat._id);
      });
    });

    // Handle receiving messages
    socket.on('message:receive', (message) => {
      const currentChats = useChatStore.getState().chats;
      const chatExists = currentChats.some((c) => c._id === message.chatId);

      if (!chatExists) {
        // Dynamically fetch chats to pull the new chat metadata
        useChatStore.getState().fetchChats();
      } else {
        optimisticAddMessage(message.chatId, message);
      }

      // Check if this chat is currently active
      const { activeChat } = useChatStore.getState();
      const isActiveChatMessage = activeChat && activeChat._id === message.chatId;

      if (isActiveChatMessage) {
        // User is currently viewing this chat — mark as seen immediately
        socket.emit('message:seen', {
          chatId: message.chatId,
          messageIds: [message._id],
        });
      } else {
        // Chat is in the background — increment unread badge
        incrementUnread(message.chatId);
      }
      
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

    socket.on('message:reaction', ({ chatId, messageId, reactions }) => {
      localUpdateReactions(chatId, messageId, reactions);
    });

    // Presence Toggles
    socket.on('presence:update', ({ userId, status, lastSeen }) => {
      localUpdateUserPresence(userId, status, lastSeen);
    });

    // Chat created trigger
    socket.on('chat:created', (newChat) => {
      fetchChats();
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
  }, [isAuthenticated, user?.id || user?._id]);

  const emitEvent = (event: string, data: any) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data);
    }
  };

  return { socket: socketRef.current, emitEvent };
};
