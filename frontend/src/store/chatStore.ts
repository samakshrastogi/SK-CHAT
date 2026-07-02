import { create } from 'zustand';
import { Chat, Message, User } from '../types/index.js';
import { apiClient } from '../api/client.js';

interface ChatState {
  chats: Chat[];
  activeChat: Chat | null;
  messages: { [chatId: string]: Message[] };
  typingUsers: { [chatId: string]: { [userId: string]: string } }; // tracks username mapping
  isLoadingChats: boolean;
  isLoadingMessages: boolean;
  hasMoreMessages: { [chatId: string]: boolean };
  
  fetchChats: () => Promise<void>;
  fetchMessages: (chatId: string, refresh?: boolean) => Promise<void>;
  setActiveChat: (chat: Chat | null) => void;
  sendChatMessage: (chatId: string, content: string, file?: File, type?: string, replyToId?: string) => Promise<void>;
  optimisticAddMessage: (chatId: string, message: Message) => void;
  updateMessageStatus: (chatId: string, messageId: string, status: 'delivered' | 'seen') => void;
  editChatMessage: (messageId: string, content: string) => Promise<void>;
  deleteChatMessage: (messageId: string, forEveryone: boolean) => Promise<void>;
  reactToMessage: (messageId: string, emoji: string) => Promise<void>;
  starMessageToggle: (messageId: string) => Promise<void>;
  voteInPoll: (messageId: string, optionId: string) => Promise<void>;
  setTypingUser: (chatId: string, userId: string, username: string | null) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  activeChat: null,
  messages: {},
  typingUsers: {},
  isLoadingChats: false,
  isLoadingMessages: false,
  hasMoreMessages: {},

  fetchChats: async () => {
    set({ isLoadingChats: true });
    try {
      const response = await apiClient.get('/chats');
      set({ chats: response.data.chats, isLoadingChats: false });
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
    if (chat && (!get().messages[chat._id] || get().messages[chat._id].length === 0)) {
      get().fetchMessages(chat._id, true);
    }
  },

  sendChatMessage: async (chatId, content, file, type = 'text', replyToId) => {
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

      const response = await apiClient.post(`/chats/${chatId}/messages`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const newMsg = response.data.message;

      // Optimistically append the message to chat
      set((state) => {
        const chatMsgs = state.messages[chatId] || [];
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
      const updated = chatMsgs.map((m) => {
        if (m._id === messageId) {
          return { ...m, status };
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
