import { create } from 'zustand';
import { Chat, Message, User } from '../types/index.js';
import { apiClient } from '../api/client.js';
import { useAuthStore } from './authStore.js';

interface ChatState {
  chats: Chat[];
  activeChat: Chat | null;
  messages: { [chatId: string]: Message[] };
  typingUsers: { [chatId: string]: { [userId: string]: string } }; // tracks username mapping
  isLoadingChats: boolean;
  isLoadingMessages: boolean;
  hasMoreMessages: { [chatId: string]: boolean };
  unreadCounts: { [chatId: string]: number };
  
  fetchChats: () => Promise<void>;
  fetchMessages: (chatId: string, refresh?: boolean) => Promise<void>;
  setActiveChat: (chat: Chat | null) => void;
  sendChatMessage: (
    chatId: string,
    content: string,
    file?: File,
    type?: string,
    replyToId?: string,
    expiresIn?: number,
    isEncrypted?: boolean,
    ciphertext?: string,
    iv?: string
  ) => Promise<void>;
  optimisticAddMessage: (chatId: string, message: Message) => void;
  updateMessageStatus: (chatId: string, messageId: string, status: 'delivered' | 'seen') => void;
  editChatMessage: (messageId: string, content: string) => Promise<void>;
  deleteChatMessage: (messageId: string, forEveryone: boolean) => Promise<void>;
  reactToMessage: (messageId: string, emoji: string) => Promise<void>;
  starMessageToggle: (messageId: string) => Promise<void>;
  voteInPoll: (messageId: string, optionId: string) => Promise<void>;
  togglePinChatMessage: (chatId: string, messageId: string) => Promise<void>;
  localDeleteMessage: (messageId: string) => void;
  localUpdatePoll: (messageId: string, pollData: any) => void;
  localUpdatePinnedMessages: (chatId: string, pinnedMessages: any[]) => void;
  localUpdateReactions: (chatId: string, messageId: string, reactions: any[]) => void;
  localUpdateUserPresence: (userId: string, status: 'online' | 'offline', lastSeen?: string) => void;
  setTypingUser: (chatId: string, userId: string, username: string | null) => void;
  incrementUnread: (chatId: string) => void;
  clearUnread: (chatId: string) => void;
  upsertChat: (chat: Chat) => void;
  removeChat: (chatId: string) => void;
  replaceChat: (chat: Chat) => void;
  localUpdateMessage: (chatId: string, message: Message) => void;
  localMarkMessageDeleted: (chatId: string | undefined, messageId: string, isDeletedForEveryone?: boolean) => void;
  localAddChatMember: (chatId: string, user: User, message?: Message) => void;
  localRemoveChatMember: (chatId: string, userId: string, message?: Message) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  activeChat: null,
  messages: {},
  typingUsers: {},
  isLoadingChats: false,
  isLoadingMessages: false,
  hasMoreMessages: {},
  unreadCounts: {},

  fetchChats: async () => {
    set({ isLoadingChats: true });
    try {
      const response = await apiClient.get('/chats');
      const chats = response.data.chats || [];
      const unreadCounts: { [chatId: string]: number } = {};
      chats.forEach((chat: any) => {
        unreadCounts[chat._id] = chat.unreadCount || 0;
      });
      set({ chats, unreadCounts, isLoadingChats: false });
    } catch (error) {
      set({ isLoadingChats: false });
      throw error;
    }
  },

  fetchMessages: async (chatId, refresh = false) => {
    const currentMessages = get().messages[chatId] || [];
    const skip = refresh ? 0 : currentMessages.length;
    
    set({ isLoadingMessages: true });
    try {
      const response = await apiClient.get(`/chats/${chatId}/messages`, {
        params: { limit: 30, skip }
      });
      const newMessages = response.data.messages;
      
      set((state) => {
        const merged = refresh 
          ? newMessages 
          : [...newMessages, ...currentMessages].filter((msg, idx, self) => 
              self.findIndex(m => m._id === msg._id) === idx
            );

        return {
          messages: {
            ...state.messages,
            [chatId]: merged
          },
          hasMoreMessages: {
            ...state.hasMoreMessages,
            [chatId]: response.data.hasMore
          },
          isLoadingMessages: false
        };
      });
    } catch (error) {
      set({ isLoadingMessages: false });
      throw error;
    }
  },

  setActiveChat: (chat) => {
    set({ activeChat: chat });
    if (chat) {
      // Clear unread count when chat becomes active
      set((state) => ({
        unreadCounts: { ...state.unreadCounts, [chat._id]: 0 }
      }));
      if (!get().messages[chat._id] || get().messages[chat._id].length === 0) {
        get().fetchMessages(chat._id, true);
      }
    }
  },

  incrementUnread: (chatId) => {
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [chatId]: (state.unreadCounts[chatId] || 0) + 1
      }
    }));
  },

  clearUnread: (chatId) => {
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [chatId]: 0 }
    }));
  },

  upsertChat: (chat) => {
    set((state) => {
      const existing = state.chats.find((c) => c._id === chat._id);
      const mergedChat = existing
        ? { ...existing, ...chat, unreadCount: chat.unreadCount ?? existing.unreadCount }
        : chat;

      return {
        chats: [
          mergedChat,
          ...state.chats.filter((c) => c._id !== chat._id)
        ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
        unreadCounts: {
          ...state.unreadCounts,
          [chat._id]: chat.unreadCount ?? state.unreadCounts[chat._id] ?? 0
        },
        activeChat: state.activeChat?._id === chat._id
          ? { ...state.activeChat, ...chat }
          : state.activeChat
      };
    });
  },

  replaceChat: (chat) => {
    set((state) => ({
      chats: state.chats.map((c) => (c._id === chat._id ? { ...c, ...chat } : c)),
      activeChat: state.activeChat?._id === chat._id ? { ...state.activeChat, ...chat } : state.activeChat
    }));
  },

  removeChat: (chatId) => {
    set((state) => {
      const { [chatId]: _removedMessages, ...messages } = state.messages;
      const { [chatId]: _removedUnread, ...unreadCounts } = state.unreadCounts;
      const { [chatId]: _removedTyping, ...typingUsers } = state.typingUsers;
      return {
        chats: state.chats.filter((c) => c._id !== chatId),
        activeChat: state.activeChat?._id === chatId ? null : state.activeChat,
        messages,
        unreadCounts,
        typingUsers
      };
    });
  },

  sendChatMessage: async (chatId, content, file, type = 'text', replyToId, expiresIn, isEncrypted, ciphertext, iv) => {
    try {
      const formData = new FormData();
      formData.append('content', content);
      formData.append('messageType', type);
      if (file) {
        formData.append('file', file);
      }
      if (replyToId) {
        formData.append('replyTo', replyToId);
      }
      if (expiresIn) {
        formData.append('expiresIn', String(expiresIn));
      }
      if (isEncrypted) {
        formData.append('isEncrypted', 'true');
      }
      if (ciphertext) {
        formData.append('ciphertext', ciphertext);
      }
      if (iv) {
        formData.append('iv', iv);
      }

      const response = await apiClient.post(`/chats/${chatId}/messages`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const newMsg = response.data.message;

      // Optimistically append the message to chat if not already added by socket
      set((state) => {
        const chatMsgs = state.messages[chatId] || [];
        if (chatMsgs.some((m) => m._id === newMsg._id)) {
          return {};
        }
        return {
          messages: {
            ...state.messages,
            [chatId]: [...chatMsgs, newMsg]
          },
          // Bump chat to top of list and update lastMessage
          chats: state.chats.map((c) => {
            if (c._id === chatId) {
              return { ...c, lastMessage: newMsg, updatedAt: new Date().toISOString() };
            }
            return c;
          }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        };
      });
    } catch (error) {
      throw error;
    }
  },

  optimisticAddMessage: (chatId, message) => {
    set((state) => {
      const chatMsgs = state.messages[chatId] || [];
      // Prevent duplicates from multiple event streams
      if (chatMsgs.some(m => m._id === message._id)) return {};
      
      return {
        messages: {
          ...state.messages,
          [chatId]: [...chatMsgs, message]
        },
        chats: state.chats.map((c) => {
          if (c._id === chatId) {
            return { ...c, lastMessage: message, updatedAt: new Date().toISOString() };
          }
          return c;
        }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      };
    });
  },

  updateMessageStatus: (chatId, messageId, status) => {
    set((state) => {
      const chatMsgs = state.messages[chatId] || [];
      
      // Update status in messages list
      const updatedMessages = chatMsgs.map((m) => {
        if (m._id === messageId) {
          return { ...m, status };
        }
        return m;
      });

      // Update status in chats list (lastMessage)
      const updatedChats = state.chats.map((c) => {
        if (c._id === chatId && c.lastMessage && c.lastMessage._id === messageId) {
          return {
            ...c,
            lastMessage: { ...c.lastMessage, status }
          };
        }
        return c;
      });

      // Recalculate or decrement unread count if an incoming message was marked seen
      let currentUnread = state.unreadCounts[chatId] || 0;
      if (status === 'seen') {
        const msg = chatMsgs.find(m => m._id === messageId);
        if (msg) {
          const myId = useAuthStore.getState().user?.id || useAuthStore.getState().user?._id;
          const senderIdStr = typeof msg.senderId === 'string' ? msg.senderId : (msg.senderId as any)?._id;
          if (senderIdStr !== myId && msg.status !== 'seen') {
            currentUnread = Math.max(0, currentUnread - 1);
          }
        }
      }

      return {
        messages: {
          ...state.messages,
          [chatId]: updatedMessages
        },
        chats: updatedChats,
        unreadCounts: {
          ...state.unreadCounts,
          [chatId]: currentUnread
        }
      };
    });
  },

  editChatMessage: async (messageId, content) => {
    try {
      const response = await apiClient.put(`/chats/messages/${messageId}`, { content });
      const updatedMsg = response.data.message;
      const chatId = updatedMsg.chatId;

      set((state) => {
        const chatMsgs = state.messages[chatId] || [];
        return {
          messages: {
            ...state.messages,
            [chatId]: chatMsgs.map((m) => (m._id === messageId ? updatedMsg : m))
          }
        };
      });
    } catch (error) {
      throw error;
    }
  },

  deleteChatMessage: async (messageId, forEveryone) => {
    try {
      await apiClient.delete(`/chats/messages/${messageId}`, { data: { deleteForEveryone: forEveryone } });
      
      set((state) => {
        // Find chat with this message and update it
        const newMessages = { ...state.messages };
        for (const chatId in newMessages) {
          newMessages[chatId] = newMessages[chatId].map((m) => {
            if (m._id === messageId) {
              if (forEveryone) {
                return {
                  ...m,
                  content: 'This message was deleted',
                  isDeleted: true,
                  mediaUrl: undefined,
                  pollData: undefined,
                  locationData: undefined,
                  contactData: undefined
                };
              }
              return null; // Local delete removes it
            }
            return m;
          }).filter(Boolean) as Message[];
        }
        return { messages: newMessages };
      });
    } catch (error) {
      throw error;
    }
  },

  reactToMessage: async (messageId, emoji) => {
    try {
      const response = await apiClient.post(`/chats/messages/${messageId}/react`, { emoji });
      const reactions = response.data.reactions;

      set((state) => {
        const newMessages = { ...state.messages };
        for (const chatId in newMessages) {
          newMessages[chatId] = newMessages[chatId].map((m) => {
            if (m._id === messageId) {
              return { ...m, reactions };
            }
            return m;
          });
        }
        return { messages: newMessages };
      });
    } catch (error) {
      throw error;
    }
  },

  starMessageToggle: async (messageId) => {
    try {
      await apiClient.post(`/chats/messages/${messageId}/star`);
    } catch (error) {
      throw error;
    }
  },

  voteInPoll: async (messageId, optionId) => {
    try {
      const response = await apiClient.post(`/chats/messages/${messageId}/vote`, { optionId });
      const pollData = response.data.pollData;

      set((state) => {
        const newMessages = { ...state.messages };
        for (const chatId in newMessages) {
          newMessages[chatId] = newMessages[chatId].map((m) => {
            if (m._id === messageId) {
              return { ...m, pollData };
            }
            return m;
          });
        }
        return { messages: newMessages };
      });
    } catch (error) {
      throw error;
    }
  },

  togglePinChatMessage: async (chatId, messageId) => {
    try {
      const response = await apiClient.post(`/chats/${chatId}/pin`, { messageId });
      const pinnedMessages = response.data.pinnedMessages;
      
      set((state) => {
        const updatedChats = state.chats.map((c) =>
          c._id === chatId ? { ...c, pinnedMessages } : c
        );
        const updatedActiveChat = state.activeChat?._id === chatId
          ? { ...state.activeChat, pinnedMessages }
          : state.activeChat;
        return { chats: updatedChats, activeChat: updatedActiveChat };
      });
    } catch (error) {
      throw error;
    }
  },

  localDeleteMessage: (messageId) => {
    set((state) => {
      const newMessages = { ...state.messages };
      for (const chatId in newMessages) {
        newMessages[chatId] = newMessages[chatId].filter((m) => m._id !== messageId);
      }
      return { messages: newMessages };
    });
  },

  localUpdateMessage: (chatId, message) => {
    set((state) => {
      const chatMsgs = state.messages[chatId] || [];
      const updatedMessages = chatMsgs.some((m) => m._id === message._id)
        ? chatMsgs.map((m) => (m._id === message._id ? message : m))
        : [...chatMsgs, message];

      return {
        messages: {
          ...state.messages,
          [chatId]: updatedMessages
        },
        chats: state.chats.map((c) => {
          if (c._id === chatId && c.lastMessage?._id === message._id) {
            return { ...c, lastMessage: message, updatedAt: message.updatedAt || c.updatedAt };
          }
          return c;
        })
      };
    });
  },

  localMarkMessageDeleted: (chatId, messageId, isDeletedForEveryone = true) => {
    set((state) => {
      const newMessages = { ...state.messages };
      const updateMessage = (m: Message) => {
        if (m._id !== messageId) return m;
        return isDeletedForEveryone
          ? {
              ...m,
              content: 'This message was deleted',
              isDeleted: true,
              mediaUrl: undefined,
              pollData: undefined,
              locationData: undefined,
              contactData: undefined
            }
          : null;
      };

      const targetChatIds = chatId ? [chatId] : Object.keys(newMessages);
      targetChatIds.forEach((targetChatId) => {
        newMessages[targetChatId] = (newMessages[targetChatId] || [])
          .map(updateMessage)
          .filter(Boolean) as Message[];
      });

      return {
        messages: newMessages,
        chats: state.chats.map((c) => {
          if ((chatId ? c._id === chatId : true) && c.lastMessage?._id === messageId) {
            return {
              ...c,
              lastMessage: isDeletedForEveryone
                ? { ...c.lastMessage, content: 'This message was deleted', isDeleted: true }
                : undefined
            };
          }
          return c;
        })
      };
    });
  },

  localAddChatMember: (chatId, user, message) => {
    set((state) => {
      const appendUser = (participants: User[]) =>
        participants.some((p) => p._id === user._id)
          ? participants
          : [...participants, user];

      return {
        chats: state.chats.map((c) => c._id === chatId ? { ...c, participants: appendUser(c.participants) } : c),
        activeChat: state.activeChat?._id === chatId
          ? { ...state.activeChat, participants: appendUser(state.activeChat.participants) }
          : state.activeChat,
        messages: message
          ? {
              ...state.messages,
              [chatId]: [...(state.messages[chatId] || []), message].filter((msg, idx, self) =>
                self.findIndex((m) => m._id === msg._id) === idx
              )
            }
          : state.messages
      };
    });
  },

  localRemoveChatMember: (chatId, userId, message) => {
    set((state) => {
      const removeUser = (participants: User[]) =>
        participants.filter((p) => p._id !== userId && p.id !== userId);

      return {
        chats: state.chats.map((c) => c._id === chatId ? { ...c, participants: removeUser(c.participants) } : c),
        activeChat: state.activeChat?._id === chatId
          ? { ...state.activeChat, participants: removeUser(state.activeChat.participants) }
          : state.activeChat,
        messages: message
          ? {
              ...state.messages,
              [chatId]: [...(state.messages[chatId] || []), message].filter((msg, idx, self) =>
                self.findIndex((m) => m._id === msg._id) === idx
              )
            }
          : state.messages
      };
    });
  },

  localUpdatePoll: (messageId, pollData) => {
    set((state) => {
      const newMessages = { ...state.messages };
      for (const chatId in newMessages) {
        newMessages[chatId] = newMessages[chatId].map((m) =>
          m._id === messageId ? { ...m, pollData } : m
        );
      }
      return { messages: newMessages };
    });
  },

  localUpdatePinnedMessages: (chatId, pinnedMessages) => {
    set((state) => {
      const updatedChats = state.chats.map((c) =>
        c._id === chatId ? { ...c, pinnedMessages } : c
      );
      const updatedActiveChat = state.activeChat?._id === chatId
        ? { ...state.activeChat, pinnedMessages }
        : state.activeChat;
      return { chats: updatedChats, activeChat: updatedActiveChat };
    });
  },

  localUpdateReactions: (chatId, messageId, reactions) => {
    set((state) => {
      const chatMsgs = state.messages[chatId] || [];
      const updated = chatMsgs.map((m) => {
        if (m._id === messageId) {
          return { ...m, reactions };
        }
        return m;
      });
      return {
        messages: {
          ...state.messages,
          [chatId]: updated
        }
      };
    });
  },

  localUpdateUserPresence: (userId, status, lastSeen) => {
    set((state) => {
      const updatedChats = state.chats.map((chat) => {
        const updatedParticipants = chat.participants.map((p) => {
          const pId = typeof p === 'string' ? p : p._id;
          if (pId === userId) {
            return {
              ...p,
              status,
              ...(lastSeen ? { lastSeen } : {})
            };
          }
          return p;
        });
        return { ...chat, participants: updatedParticipants };
      });

      let updatedActiveChat = state.activeChat;
      if (state.activeChat) {
        const updatedParticipants = state.activeChat.participants.map((p) => {
          const pId = typeof p === 'string' ? p : p._id;
          if (pId === userId) {
            return {
              ...p,
              status,
              ...(lastSeen ? { lastSeen } : {})
            };
          }
          return p;
        });
        updatedActiveChat = { ...state.activeChat, participants: updatedParticipants };
      }

      return {
        chats: updatedChats,
        activeChat: updatedActiveChat
      };
    });
  },

  setTypingUser: (chatId, userId, username) => {
    set((state) => {
      const chatTyping = { ...(state.typingUsers[chatId] || {}) };
      if (username) {
        chatTyping[userId] = username;
      } else {
        delete chatTyping[userId];
      }
      return {
        typingUsers: {
          ...state.typingUsers,
          [chatId]: chatTyping
        }
      };
    });
  }
}));
