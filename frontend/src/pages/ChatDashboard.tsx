import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { useChatStore } from '../store/chatStore.js';
import { useCallStore } from '../store/callStore.js';
import { useThemeStore } from '../store/themeStore.js';
import { useSocket } from '../hooks/useSocket.js';
import { useWebRTC } from '../hooks/useWebRTC.js';
import { apiClient } from '../api/client.js';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Video, Phone, Settings, User as UserIcon, LogOut, Search, Plus, Send,
  Paperclip, MoreVertical, X, Check, CheckCheck, Smile, Star, Trash2, Edit2, CornerUpLeft,
  Pin, Shield, Mic, HelpCircle, Share2, BarChart2, ShieldAlert, Trash, PlusCircle, Globe,
  Compass, Eye, Play, Sparkles, Languages, FileText, MapPin, PhoneMissed, Volume2, VideoOff,
  UserX, CheckCircle, Ban
} from 'lucide-react';
import { Chat, Message, User, Status, Call, DeviceSession, Community } from '../types/index.js';

export default function ChatDashboard() {
  const { user, logout, fetchSessions, sessions, terminateSession, terminateAllSessions } = useAuthStore();
  const {
    chats, fetchChats, activeChat, setActiveChat, messages, sendChatMessage,
    editChatMessage, deleteChatMessage, reactToMessage, starMessageToggle, voteInPoll,
    typingUsers, setTypingUser
  } = useChatStore();
  
  const callStore = useCallStore();
  const themeStore = useThemeStore();

  const { socket, emitEvent } = useSocket();
  const {
    makeCall, answerCall, rejectCall, handleIceCandidate, handleCallAccepted,
    startScreenShare, stopScreenShare, hangUp
  } = useWebRTC(emitEvent);

  // Active Main Sidebar Tab
  const [activeTab, setActiveTab] = useState<'chats' | 'status' | 'calls' | 'communities' | 'settings' | 'profile' | 'admin'>('chats');
  
  // Searching/Creating models
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupParticipants, setGroupParticipants] = useState<string[]>([]);
  
  // Statuses & calls states
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [activeStatusViewer, setActiveStatusViewer] = useState<Status[] | null>(null);
  const [activeStatusIndex, setActiveStatusIndex] = useState(0);
  const [textStatusOpen, setTextStatusOpen] = useState(false);
  const [textStatusContent, setTextStatusContent] = useState('');
  const [textStatusBg, setTextStatusBg] = useState('#4f46e5');
  const [callHistory, setCallHistory] = useState<Call[]>([]);

  // Communities state
  const [communities, setCommunities] = useState<Community[]>([]);
  const [createCommunityOpen, setCreateCommunityOpen] = useState(false);
  const [communityName, setCommunityName] = useState('');
  const [communityDesc, setCommunityDesc] = useState('');
  const [joinCommunityCode, setJoinCommunityCode] = useState('');

  // AI assistant options
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [smartReplies, setSmartReplies] = useState<string[]>([]);

  // Text inputs & attachments
  const [messageText, setMessageText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Voice Recording details
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [voiceChunks, setVoiceChunks] = useState<Blob[]>([]);

  // Admin analytical panel details
  const [adminStats, setAdminStats] = useState<any>(null);
  const [adminUsers, setAdminUsers] = useState<User[]>([]);

  // Refs for auto-scroll
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Load Initial Tabs state
  useEffect(() => {
    fetchChats();
    fetchStatuses();
    fetchCallHistory();
    fetchCommunities();
    if (user?.role === 'admin' || user?.role === 'moderator') {
      fetchAdminData();
    }
  }, [fetchChats]);

  // Request Desktop notifications permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Sync active message window scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    
    // Fetch smart replies when active chat changes
    if (activeChat) {
      fetchSmartReplies(activeChat._id);
    }
  }, [activeChat, messages]);

  // Bind WebRTC socket triggers
  useEffect(() => {
    if (socket) {
      socket.on('call:accepted', ({ answer }) => {
        handleCallAccepted(answer);
      });
      socket.on('call:candidate', ({ candidate }) => {
        handleIceCandidate(candidate);
      });
      socket.on('call:rejected', ({ reason }) => {
        alert(`Call rejected: ${reason}`);
        callStore.resetCallStore();
      });
    }
  }, [socket]);

  // Bind RTC HTML video outputs
  useEffect(() => {
    if (callStore.callStatus === 'connected' && callStore.remoteStream) {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = callStore.remoteStream;
      }
    }
    if (callStore.localStream) {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = callStore.localStream;
      }
    }
  }, [callStore.callStatus, callStore.remoteStream, callStore.localStream]);

  // Fetch helper lists
  const fetchStatuses = async () => {
    try {
      const resp = await apiClient.get('/status');
      setStatuses(resp.data.statuses);
    } catch (e) {}
  };

  const fetchCallHistory = async () => {
    try {
      const resp = await apiClient.get('/calls/history');
      setCallHistory(resp.data.calls);
    } catch (e) {}
  };

  const fetchCommunities = async () => {
    try {
      const resp = await apiClient.get('/community');
      setCommunities(resp.data.communities);
    } catch (e) {}
  };

  const fetchSmartReplies = async (cId: string) => {
    try {
      const resp = await apiClient.get(`/ai/replies/${cId}`);
      setSmartReplies(resp.data.replies);
    } catch (e) {}
  };

  const fetchAdminData = async () => {
    try {
      const statsResp = await apiClient.get('/admin/stats');
      setAdminStats(statsResp.data.stats);
      const usersResp = await apiClient.get('/admin/users');
      setAdminUsers(usersResp.data.users);
    } catch (e) {}
  };

  // Searching Users
  const handleUserSearch = async (val: string) => {
    setSearchQuery(val);
    if (val.trim().length === 0) {
      setSearchResults([]);
      return;
    }
    try {
      const resp = await apiClient.get(`/users/search?q=${val}`);
      setSearchResults(resp.data.users);
    } catch (e) {}
  };

  // Starting a direct chat
  const handleStartDirectChat = async (targetUser: User) => {
    try {
      const resp = await apiClient.post('/chats', {
        isGroup: false,
        participantId: targetUser._id
      });
      setActiveChat(resp.data.chat);
      fetchChats();
      setSearchQuery('');
      setSearchResults([]);
    } catch (e) {}
  };

  // Group creation logic
  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;
    try {
      const resp = await apiClient.post('/chats', {
        isGroup: true,
        name: groupName,
        participants: groupParticipants
      });
      setActiveChat(resp.data.chat);
      setGroupName('');
      setGroupParticipants([]);
      setCreateGroupOpen(false);
      fetchChats();
    } catch (e) {}
  };

  // Communities actions
  const handleCreateCommunity = async () => {
    if (!communityName.trim()) return;
    try {
      await apiClient.post('/community', {
        name: communityName,
        description: communityDesc
      });
      setCommunityName('');
      setCommunityDesc('');
      setCreateCommunityOpen(false);
      fetchCommunities();
    } catch (e) {}
  };

  const handleJoinCommunity = async () => {
    if (!joinCommunityCode.trim()) return;
    try {
      const resp = await apiClient.post('/community/join', {
        inviteCode: joinCommunityCode
      });
      setJoinCommunityCode('');
      fetchCommunities();
      alert(`Successfully joined community: ${resp.data.community.name}`);
    } catch (e: any) {
      alert(e.response?.data?.message || 'Could not join community.');
    }
  };

  // Message uploads & submissions
  const handleSendMessageSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageText.trim() && !selectedFile) return;

    const activeChatId = activeChat?._id;
    if (!activeChatId) return;

    try {
      // Simulate file upload loading bar
      if (selectedFile) {
        setUploadProgress(20);
        let interval = setInterval(() => {
          setUploadProgress((p) => {
            if (p >= 90) {
              clearInterval(interval);
              return p;
            }
            return p + 10;
          });
        }, 100);
      }

      await sendChatMessage(
        activeChatId,
        messageText,
        selectedFile || undefined,
        selectedFile ? getMessageTypeFromFile(selectedFile) : 'text',
        replyingTo?._id
      );

      setMessageText('');
      setSelectedFile(null);
      setReplyingTo(null);
      setUploadProgress(0);
      
      // Notify active sockets of new message
      if (socket) {
        socket.emit('typing:stop', activeChatId);
      }
    } catch (err) {
      setUploadProgress(0);
      alert('Failed to send message.');
    }
  };

  const getMessageTypeFromFile = (file: File): string => {
    const mime = file.type;
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('audio/')) return 'audio';
    return 'document';
  };

  // Voice Note Recorder triggers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunks.push(ev.data);
      };

      recorder.onstop = async () => {
        const voiceBlob = new Blob(chunks, { type: 'audio/webm' });
        const voiceFile = new File([voiceBlob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });

        if (activeChat) {
          await sendChatMessage(activeChat._id, '', voiceFile, 'voice');
        }
        setVoiceChunks([]);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      alert('Could not record voice. Check microphone authorizations.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
    }
  };

  // Status/Story posting
  const handlePostTextStatus = async () => {
    if (!textStatusContent.trim()) return;
    try {
      await apiClient.post('/status', {
        type: 'text',
        content: textStatusContent,
        backgroundColor: textStatusBg
      });
      setTextStatusContent('');
      setTextStatusOpen(false);
      fetchStatuses();
    } catch (e) {}
  };

  // AI assistant handlers
  const handleAskAIAssistant = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiResponse('');
    try {
      // Gather active chat messages if open as context
      let context = '';
      if (activeChat) {
        const msgs = messages[activeChat._id] || [];
        context = msgs.slice(-15).map((m: any) => `${m.senderId?.username || 'user'}: ${m.content}`).join('\n');
      }

      const resp = await apiClient.post('/ai/ask', {
        prompt: aiPrompt,
        context
      });
      setAiResponse(resp.data.response);
    } catch (e) {
      setAiResponse('AI service failed to respond. Check API parameters.');
    } finally {
      setAiLoading(false);
    }
  };

  // Action helpers: translation, summaries, and tone-shifts
  const handleSummarizeThread = async () => {
    if (!activeChat) return;
    setAiAssistantOpen(true);
    setAiLoading(true);
    try {
      const resp = await apiClient.get(`/ai/summarize/${activeChat._id}`);
      setAiPrompt(`Summarize this chat thread.`);
      setAiResponse(resp.data.summary);
    } catch (e) {
      setAiResponse('Failed to summarize thread.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleTranslateMessage = async (msg: Message, lang: string) => {
    try {
      const resp = await apiClient.post('/ai/translate', {
        text: msg.content,
        targetLanguage: lang
      });
      alert(`Translation [${lang}]:\n"${resp.data.translated}"`);
    } catch (e) {
      alert('Translation failed.');
    }
  };

  const handleToneRewrite = async (msg: Message, tone: string) => {
    try {
      const resp = await apiClient.post('/ai/rewrite', {
        text: msg.content,
        tone
      });
      alert(`Tone Rewrite [${tone}]:\n"${resp.data.rewritten}"`);
    } catch (e) {
      alert('Rewrite failed.');
    }
  };

  // Moderator actions
  const handleToggleBanUser = async (uId: string) => {
    try {
      const resp = await apiClient.post(`/admin/users/${uId}/ban`);
      alert(resp.data.message);
      fetchAdminData();
    } catch (e) {}
  };

  return (
    <div className="h-screen w-screen flex bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 overflow-hidden relative font-sans">
      
      {/* 1. Main Left Sidebar (Compact Navigation) */}
      <aside className="w-16 md:w-20 bg-white/80 dark:bg-slate-950/80 border-r border-slate-200/60 dark:border-slate-800/60 flex flex-col justify-between items-center py-6 z-20">
        <div className="flex flex-col gap-6 items-center w-full">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="text-xl font-extrabold tracking-tighter text-white">C</span>
          </div>

          <div className="flex flex-col gap-3 w-full px-2">
            {[
              { id: 'chats', label: 'Chats', icon: MessageSquare },
              { id: 'status', label: 'Stories', icon: Compass },
              { id: 'calls', label: 'Calls', icon: Phone },
              { id: 'communities', label: 'Servers', icon: Globe },
              { id: 'profile', label: 'My Bio', icon: UserIcon },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map((btn) => {
              const Icon = btn.icon;
              const active = activeTab === btn.id;
              return (
                <button
                  key={btn.id}
                  onClick={() => { setActiveTab(btn.id as any); }}
                  className={`h-11 w-full rounded-xl flex items-center justify-center transition-all ${
                    active 
                      ? 'bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 dark:border-indigo-500/30' 
                      : 'text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900/60'
                  }`}
                  title={btn.label}
                >
                  <Icon className="h-5.5 w-5.5" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-4 items-center w-full px-2">
          {/* Admin tab (conditional) */}
          {(user?.role === 'admin' || user?.role === 'moderator') && (
            <button
              onClick={() => { setActiveTab('admin'); }}
              className={`h-11 w-full rounded-xl flex items-center justify-center transition-all ${
                activeTab === 'admin'
                  ? 'bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 dark:border-amber-500/30'
                  : 'text-amber-600/60 dark:text-amber-500/60 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-900/60'
              }`}
              title="Admin Dashboard"
            >
              <ShieldAlert className="h-5.5 w-5.5" />
            </button>
          )}

          <button
            onClick={() => { logout(); }}
            className="h-11 w-full rounded-xl flex items-center justify-center text-red-600/60 dark:text-red-500/60 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/5 dark:hover:bg-red-500/10 transition-colors"
            title="Log Out"
          >
            <LogOut className="h-5.5 w-5.5" />
          </button>
        </div>
      </aside>

      {/* 2. Middle Panel Listing (Sub-Menus) */}
      <section className="w-80 md:w-96 bg-white/70 dark:bg-slate-900/80 border-r border-slate-200/60 dark:border-slate-800/60 flex flex-col z-10 shrink-0">
        
        {/* Tab 1: Chats */}
        {activeTab === 'chats' && (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800/40">
              <h2 className="text-xl font-bold mb-3 tracking-tight">Conversations</h2>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search users or rooms..."
                  value={searchQuery}
                  onChange={(e) => handleUserSearch(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 rounded-xl text-xs font-medium glass-input text-slate-800 dark:text-white placeholder:text-slate-500"
                />
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
              </div>
            </div>

            {/* List Results or Active Threads */}
            <div className="flex-1 overflow-y-auto">
              {searchResults.length > 0 ? (
                <div className="p-2">
                  <p className="text-xs text-slate-500 font-semibold px-3 mb-2">Search Results</p>
                  {searchResults.map((usr) => (
                    <button
                      key={usr._id}
                      onClick={() => handleStartDirectChat(usr)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-2xl transition-colors text-left"
                    >
                      <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0 overflow-hidden">
                        {usr.avatar ? <img src={usr.avatar} alt="" className="h-full w-full object-cover" /> : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate text-slate-800 dark:text-white">{usr.username}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{usr.bio}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-xs text-slate-500 font-semibold">Active Chats</span>
                    <button 
                      onClick={() => setCreateGroupOpen(true)}
                      className="text-xs font-bold text-indigo-550 dark:text-indigo-400 hover:text-indigo-500 flex items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" /> Group
                    </button>
                  </div>
                  {chats.map((chat) => {
                    const active = activeChat?._id === chat._id;
                    const isGroup = chat.isGroup;
                    const targetParticipant = chat.participants.find(p => p._id !== user?.id);
                    const titleName = isGroup ? chat.name : (targetParticipant?.username || 'Chat room');
                    const subtitle = chat.lastMessage?.isDeleted 
                      ? 'Deleted message' 
                      : (chat.lastMessage?.content || chat.description || 'No messages yet');

                    return (
                      <button
                        key={chat._id}
                        onClick={() => { setActiveChat(chat); }}
                        className={`w-full flex items-center gap-3.5 p-3 rounded-2xl transition-all text-left ${
                          active 
                            ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400' 
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800/30'
                        }`}
                      >
                        <div className="relative flex-shrink-0">
                          <div className="h-11 w-11 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700/50 overflow-hidden">
                            {isGroup ? (
                              chat.avatar ? <img src={chat.avatar} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center font-bold text-slate-500">G</div>
                            ) : (
                              targetParticipant?.avatar ? <img src={targetParticipant.avatar} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center font-bold text-slate-500">U</div>
                            )}
                          </div>
                          {!isGroup && targetParticipant?.status === 'online' && (
                            <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-0.5">
                            <h4 className="text-sm font-semibold truncate text-slate-800 dark:text-slate-200">{titleName}</h4>
                            <span className="text-[10px] text-slate-500 font-medium">
                              {chat.lastMessage ? new Date(chat.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-medium">{subtitle}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Stories (Status updates) */}
        {activeTab === 'status' && (
          <div className="flex flex-col h-full p-4 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold tracking-tight">Recent Stories</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setTextStatusOpen(true)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  title="Post text status"
                >
                  <PlusCircle className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* List user stories */}
            <div className="space-y-4 overflow-y-auto flex-1">
              <div>
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">All Status Updates</span>
                <div className="mt-3 space-y-2">
                  {statuses.map((stat, idx) => (
                    <button
                      key={stat._id}
                      onClick={() => {
                        setActiveStatusViewer(statuses);
                        setActiveStatusIndex(idx);
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/40 text-left transition-colors"
                    >
                      <div className="h-11 w-11 rounded-full p-0.5 border-2 border-indigo-500 bg-slate-200 dark:bg-slate-900 flex overflow-hidden">
                        {stat.userId.avatar ? <img src={stat.userId.avatar} alt="" className="rounded-full h-full w-full object-cover" /> : null}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{stat.userId.username}</h4>
                        <p className="text-[11px] text-slate-500">{new Date(stat.createdAt).toLocaleTimeString()}</p>
                      </div>
                    </button>
                  ))}
                  {statuses.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-8">No status updates in the last 24 hours.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Calls History */}
        {activeTab === 'calls' && (
          <div className="flex flex-col h-full p-4">
            <h2 className="text-xl font-bold tracking-tight mb-4">Calling History</h2>
            <div className="flex-1 overflow-y-auto space-y-2">
              {callHistory.map((call) => {
                const wasCaller = call.callerId._id === user?.id;
                const displayUser = wasCaller ? call.receiverId : call.callerId;
                const missed = call.status === 'missed';
                return (
                  <div key={call._id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/30">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        {displayUser?.avatar ? <img src={displayUser.avatar} alt="" className="h-full w-full object-cover" /> : null}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{displayUser?.username || 'Unknown Contact'}</h4>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          {missed ? <PhoneMissed className="h-3 w-3 text-red-500" /> : <Volume2 className="h-3 w-3" />}
                          <span>{new Date(call.createdAt).toLocaleDateString()} {new Date(call.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-slate-500">{call.type}</span>
                  </div>
                );
              })}
              {callHistory.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-8">No call history logs found.</p>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Communities */}
        {activeTab === 'communities' && (
          <div className="flex flex-col h-full p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold tracking-tight">Communities</h2>
              <button
                onClick={() => setCreateCommunityOpen(true)}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 flex items-center gap-1"
              >
                <Plus className="h-4 w-4" /> Create
              </button>
            </div>

            {/* Join input */}
            <div className="mb-4 flex gap-2">
              <input
                type="text"
                placeholder="Enter community invite code..."
                value={joinCommunityCode}
                onChange={(e) => setJoinCommunityCode(e.target.value)}
                className="flex-1 h-9 rounded-lg text-xs font-medium glass-input px-3 text-slate-800 dark:text-white"
              />
              <button
                onClick={handleJoinCommunity}
                className="h-9 px-3 rounded-lg bg-indigo-500 text-xs font-bold hover:bg-indigo-600 text-white"
              >
                Join
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
              {communities.map((comm) => (
                <div key={comm._id} className="p-3 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      {comm.avatar ? <img src={comm.avatar} alt="" className="h-full w-full object-cover" /> : null}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{comm.name}</h4>
                      <p className="text-[10px] text-slate-500">Invite Code: {comm.inviteCode}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{comm.description}</p>
                  
                  {/* Community groups navigation */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800/40 space-y-1">
                    {comm.groupIds.map((channel: any) => (
                      <button
                        key={channel._id}
                        onClick={() => { setActiveChat(channel); }}
                        className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-200 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white text-left"
                      >
                        <span>#</span> {channel.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {communities.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-8">Join communities to view announcement channels.</p>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Profile Info */}
        {activeTab === 'profile' && (
          <div className="flex flex-col h-full p-4 space-y-6 overflow-y-auto">
            <h2 className="text-xl font-bold tracking-tight">Edit Bio</h2>
            
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="h-24 w-24 rounded-full border-2 border-indigo-500 bg-slate-800 overflow-hidden relative">
                {user?.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover" /> : null}
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">{user?.username}</h3>
                <p className="text-xs text-slate-500">{user?.email}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">My Status Bio</label>
                <textarea
                  defaultValue={user?.bio}
                  onBlur={async (e) => {
                    const form = new FormData();
                    form.append('bio', e.target.value);
                    await useAuthStore.getState().updateProfileData(form);
                  }}
                  className="w-full min-h-[80px] rounded-xl text-xs font-medium p-3.5 glass-input text-white"
                  placeholder="Tell people about yourself..."
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Settings */}
        {activeTab === 'settings' && (
          <div className="flex flex-col h-full p-4 space-y-6 overflow-y-auto">
            <h2 className="text-xl font-bold tracking-tight">Settings</h2>
            
            {/* Customization items */}
            <div className="space-y-4">
              <div>
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Appearance Mode</span>
                <div className="flex gap-2 mt-2">
                  {['light', 'dark', 'system'].map((th) => (
                    <button
                      key={th}
                      onClick={() => themeStore.setTheme(th as any)}
                      className={`flex-1 py-2 text-xs font-semibold rounded-xl border border-slate-800 ${
                        themeStore.theme === th ? 'bg-indigo-500 text-white' : 'bg-slate-900 hover:bg-slate-800'
                      }`}
                    >
                      {th}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Accent Theme Color</span>
                <div className="flex gap-2 mt-2">
                  {['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'].map((color) => (
                    <button
                      key={color}
                      onClick={() => themeStore.setAccentColor(color)}
                      style={{ backgroundColor: color }}
                      className={`h-7 w-7 rounded-full transition-transform ${
                        themeStore.accentColor === color ? 'ring-2 ring-white scale-110' : ''
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/40">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Device Logins</span>
                  <button
                    onClick={() => { fetchSessions(); }}
                    className="text-[10px] font-bold text-indigo-400"
                  >
                    Refresh
                  </button>
                </div>
                
                <div className="space-y-2">
                  {sessions.map((sess) => (
                    <div key={sess.id} className="p-2.5 bg-slate-900 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-slate-200">{sess.deviceType}</p>
                        <p className="text-[10px] text-slate-500">{sess.ipAddress} {sess.isCurrent ? '(current)' : ''}</p>
                      </div>
                      {!sess.isCurrent && (
                        <button
                          onClick={() => terminateSession(sess.id)}
                          className="text-[10px] text-red-400 font-bold hover:text-red-300"
                        >
                          Log out
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 7: Admin Panel */}
        {activeTab === 'admin' && (
          <div className="flex flex-col h-full p-4 space-y-6 overflow-y-auto">
            <h2 className="text-xl font-bold tracking-tight text-amber-400">Admin Dashboard</h2>
            
            {/* Stats blocks */}
            {adminStats && (
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 bg-slate-850 rounded-xl border border-slate-800">
                  <p className="text-[10px] text-slate-500 font-bold">Total Users</p>
                  <p className="text-xl font-extrabold text-white">{adminStats.users?.total}</p>
                </div>
                <div className="p-3 bg-slate-850 rounded-xl border border-slate-800">
                  <p className="text-[10px] text-slate-500 font-bold">Online Users</p>
                  <p className="text-xl font-extrabold text-emerald-400">{adminStats.users?.online}</p>
                </div>
                <div className="p-3 bg-slate-850 rounded-xl border border-slate-800">
                  <p className="text-[10px] text-slate-500 font-bold">Total Chats</p>
                  <p className="text-xl font-extrabold text-white">{adminStats.chats?.total}</p>
                </div>
                <div className="p-3 bg-slate-850 rounded-xl border border-slate-800">
                  <p className="text-[10px] text-slate-500 font-bold">Total Messages</p>
                  <p className="text-xl font-extrabold text-indigo-400">{adminStats.messages?.total}</p>
                </div>
              </div>
            )}

            {/* Users listing */}
            <div className="space-y-3">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Moderate Users</span>
              <div className="space-y-2">
                {adminUsers.map((usr) => (
                  <div key={usr._id} className="p-3 bg-slate-900 border border-slate-800/80 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-slate-700 overflow-hidden">
                        {usr.avatar ? <img src={usr.avatar} alt="" className="h-full w-full object-cover" /> : null}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-200">{usr.username}</p>
                        <p className="text-[10px] text-slate-500">{usr.email}</p>
                      </div>
                    </div>

                    {usr._id !== user?.id && (
                      <button
                        onClick={() => handleToggleBanUser(usr._id)}
                        className={`p-1.5 rounded-lg border ${
                          usr.bio === '[Banned]'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-red-500/10 border-red-500/20 text-red-400'
                        }`}
                        title={usr.bio === '[Banned]' ? 'Unban User' : 'Ban User'}
                      >
                        <Ban className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </section>

      {/* 3. Main Chat Panel (Active view on Right) */}
      <main className="flex-1 bg-slate-100 dark:bg-slate-950 flex flex-col justify-between relative">
        {activeChat ? (
          <div className="flex flex-col h-full">
            
            {/* Active chat header */}
            <header className="h-16 border-b border-slate-200 dark:border-slate-800/60 px-6 flex items-center justify-between bg-white/40 dark:bg-slate-900/40 backdrop-blur-md z-10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-850 overflow-hidden border border-slate-300 dark:border-slate-700/40">
                  {activeChat.isGroup ? (
                    activeChat.avatar ? <img src={activeChat.avatar} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center font-bold text-slate-500">G</div>
                  ) : (
                    activeChat.participants.find(p => p._id !== user?.id)?.avatar ? (
                      <img src={activeChat.participants.find(p => p._id !== user?.id)?.avatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center font-bold text-slate-500">U</div>
                    )
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {activeChat.isGroup ? activeChat.name : (activeChat.participants.find(p => p._id !== user?.id)?.username || 'Connect User')}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-semibold">
                    {activeChat.isGroup ? `${activeChat.participants.length} members` : (activeChat.participants.find(p => p._id !== user?.id)?.status || 'offline')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Voice/Video calling controls (Direct only) */}
                {!activeChat.isGroup && (
                  <>
                    <button
                      onClick={() => makeCall(activeChat.participants.find(p => p._id !== user?.id)!._id, activeChat._id, 'voice')}
                      className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
                      title="Audio Call"
                    >
                      <Phone className="h-4.5 w-4.5" />
                    </button>
                    <button
                      onClick={() => makeCall(activeChat.participants.find(p => p._id !== user?.id)!._id, activeChat._id, 'video')}
                      className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
                      title="Video Call"
                    >
                      <Video className="h-4.5 w-4.5" />
                    </button>
                  </>
                )}

                <button
                  onClick={handleSummarizeThread}
                  className="p-2 text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 rounded-lg hover:bg-indigo-500/10 transition-all"
                  title="Summarize Recent Thread"
                >
                  <Sparkles className="h-4.5 w-4.5" />
                </button>
              </div>
            </header>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {(messages[activeChat._id] || []).map((msg) => {
                const isMe = msg.senderId === user?.id || (msg.senderId as any)?._id === user?.id;
                const senderName = isMe ? 'You' : ((msg.senderId as any)?.username || 'User');
                
                return (
                  <div
                    key={msg._id}
                    className={`flex flex-col gap-1 max-w-[70%] ${isMe ? 'self-end ml-auto items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-500">{senderName}</span>
                    </div>

                    <div
                      className={`px-4.5 py-3 rounded-2xl relative group ${
                        isMe 
                          ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-tr-none' 
                          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none'
                      }`}
                    >
                      {/* Replying indicator */}
                      {msg.replyTo && (
                        <div className="mb-2 p-2 rounded-lg bg-black/10 border-l-2 border-indigo-400 text-xs text-slate-300 truncate">
                          {msg.replyTo.content}
                        </div>
                      )}

                      {/* Document Attachment */}
                      {msg.messageType === 'document' && msg.mediaUrl && (
                        <a
                          href={msg.mediaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 mb-2 p-2 rounded-lg bg-black/15 hover:bg-black/25 text-xs font-semibold text-indigo-200"
                        >
                          <FileText className="h-5 w-5" />
                          <span>{msg.fileName || 'Download Document'}</span>
                        </a>
                      )}

                      {/* Image Attachment */}
                      {msg.messageType === 'image' && msg.mediaUrl && (
                        <div className="mb-2 max-w-sm rounded-lg overflow-hidden border border-black/10">
                          <img src={msg.mediaUrl} alt="" className="w-full object-cover" />
                        </div>
                      )}

                      {/* Video Attachment */}
                      {msg.messageType === 'video' && msg.mediaUrl && (
                        <video controls src={msg.mediaUrl} className="mb-2 max-w-sm rounded-lg border border-black/10" />
                      )}

                      {/* Audio / Voice Attachment */}
                      {msg.messageType === 'voice' && msg.mediaUrl && (
                        <audio controls src={msg.mediaUrl} className="mb-2" />
                      )}

                      {/* Poll View */}
                      {msg.messageType === 'poll' && msg.pollData && (
                        <div className="space-y-2 p-2 rounded-xl bg-black/10 text-xs">
                          <p className="font-bold">{msg.pollData.question}</p>
                          {msg.pollData.options.map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() => voteInPoll(msg._id, opt.id)}
                              className="w-full flex items-center justify-between p-2 rounded bg-slate-850 hover:bg-slate-800 text-left"
                            >
                              <span>{opt.text}</span>
                              <span className="font-bold text-[10px] text-indigo-400">{opt.votes.length} votes</span>
                            </button>
                          ))}
                        </div>
                      )}

                      <p className="text-sm font-medium leading-relaxed break-words">{msg.content}</p>

                      {/* Emojis hover popup */}
                      <div className="absolute top-1/2 -translate-y-1/2 hidden group-hover:flex gap-1.5 px-2 py-1 rounded-xl bg-slate-900 border border-slate-800 shadow-xl z-20 left-full ml-2">
                        {['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emo) => (
                          <button
                            key={emo}
                            onClick={() => reactToMessage(msg._id, emo)}
                            className="hover:scale-125 transition-transform"
                          >
                            {emo}
                          </button>
                        ))}
                      </div>

                      {/* Actions hover list */}
                      <div className="absolute top-1/2 -translate-y-1/2 hidden group-hover:flex gap-1.5 px-2 py-1 rounded-xl bg-slate-900 border border-slate-800 shadow-xl z-20 right-full mr-2">
                        <button onClick={() => setReplyingTo(msg)} className="text-slate-400 hover:text-white" title="Reply">
                          <CornerUpLeft className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleTranslateMessage(msg, 'Spanish')} className="text-indigo-400 hover:text-white" title="Translate">
                          <Languages className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2 items-center text-[9px] text-slate-500 font-semibold px-2">
                      <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {isMe && (
                        <span>
                          {msg.status === 'seen' ? (
                            <CheckCheck className="h-3.5 w-3.5 text-indigo-400" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Bottom input area */}
            <div className="p-4 border-t border-slate-800/40 bg-slate-900/20 backdrop-blur-md shrink-0">
              
              {/* Replying feedback */}
              {replyingTo && (
                <div className="mb-2 p-2 px-3.5 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center text-xs">
                  <span className="text-slate-400">Replying to message: <i>"{replyingTo.content}"</i></span>
                  <button onClick={() => setReplyingTo(null)} className="text-slate-500 hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Upload loading bar */}
              {uploadProgress > 0 && (
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-3">
                  <div className="bg-indigo-500 h-full transition-all" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              )}

              {/* Suggestions chips */}
              {smartReplies.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-3.5">
                  {smartReplies.map((reply) => (
                    <button
                      key={reply}
                      onClick={() => {
                        setMessageText(reply);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-semibold border border-indigo-500/20 shrink-0 transition-colors"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={handleSendMessageSubmit} className="flex gap-3 items-center">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-11 w-11 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
                  title="Attach file"
                >
                  <Paperclip className="h-5 w-5" />
                </button>

                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => {
                      setMessageText(e.target.value);
                      if (socket) {
                        socket.emit('typing:start', activeChat._id);
                      }
                    }}
                    onBlur={() => {
                      if (socket) {
                        socket.emit('typing:stop', activeChat._id);
                      }
                    }}
                    placeholder="Type a message..."
                    className="w-full h-11 px-4 rounded-xl text-sm font-medium glass-input text-white placeholder:text-slate-500"
                  />
                  
                  {/* Voice note triggers */}
                  <button
                    type="button"
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`absolute right-3 top-3 transition-colors ${isRecording ? 'text-red-500' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    <Mic className="h-5 w-5" />
                  </button>
                </div>

                <button
                  type="submit"
                  className="h-11 w-11 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20"
                >
                  <Send className="h-5 w-5" />
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="h-full w-full flex flex-col justify-center items-center p-6 text-center">
            <div className="h-16 w-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6 shadow-xl shadow-indigo-500/5">
              <MessageSquare className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight text-white mb-2">Connect Web</h3>
            <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
              Select a conversation thread from the sidebar list to exchange messages, calls, and share attachments.
            </p>
          </div>
        )}
      </main>

      {/* 4. Floating Calls Signaling Overlay Screen */}
      <AnimatePresence>
        {callStore.callStatus !== 'idle' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-50 p-6"
          >
            <div className="w-full max-w-3xl glass-panel rounded-[32px] overflow-hidden p-6 shadow-2xl relative flex flex-col items-center justify-center gap-6">
              
              {/* Outgoing Panel */}
              {callStore.callStatus === 'outgoing' && (
                <div className="text-center space-y-4">
                  <div className="h-24 w-24 rounded-full bg-slate-800 animate-pulse border-2 border-indigo-500 mx-auto" />
                  <h3 className="text-xl font-bold text-white">Calling...</h3>
                  <p className="text-slate-400 text-sm">Waiting for response...</p>
                  <button onClick={hangUp} className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-full text-sm font-bold shadow-lg shadow-red-500/20">
                    Cancel Call
                  </button>
                </div>
              )}

              {/* Incoming Panel */}
              {callStore.callStatus === 'incoming' && (
                <div className="text-center space-y-4">
                  <div className="h-24 w-24 rounded-full bg-slate-800 border-2 border-indigo-500 mx-auto" />
                  <h3 className="text-xl font-bold text-white">{callStore.callerName} calling you</h3>
                  <p className="text-slate-400 text-sm">Incoming WebRTC {callStore.callType} call</p>
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => answerCall(callStore.callerId!, callStore.localStream as any)}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-full text-sm font-bold shadow-lg shadow-emerald-500/20"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => rejectCall(callStore.callerId!)}
                      className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-full text-sm font-bold shadow-lg shadow-red-500/20"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              )}

              {/* Connected Video Layout */}
              {callStore.callStatus === 'connected' && (
                <div className="w-full aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 relative">
                  {/* Remote Video Stream */}
                  {callStore.callType === 'video' ? (
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-slate-900">
                      <Volume2 className="h-16 w-16 text-indigo-400" />
                    </div>
                  )}

                  {/* Local video thumbnail (PIP) */}
                  {callStore.callType === 'video' && (
                    <div className="absolute top-4 right-4 w-40 aspect-video rounded-lg overflow-hidden border border-slate-700 bg-slate-900 shadow-xl">
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}

                  {/* Calling bottom toolbar */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-950/65 backdrop-blur-md px-6 py-3 rounded-full border border-slate-800">
                    <button
                      onClick={() => callStore.toggleMute()}
                      className={`p-2.5 rounded-full ${callStore.isMuted ? 'bg-red-500 text-white' : 'hover:bg-slate-800 text-slate-300'}`}
                      title={callStore.isMuted ? 'Unmute' : 'Mute'}
                    >
                      <Mic className="h-5 w-5" />
                    </button>
                    {callStore.callType === 'video' && (
                      <>
                        <button
                          onClick={() => callStore.toggleCamera()}
                          className={`p-2.5 rounded-full ${callStore.isCameraOff ? 'bg-red-500 text-white' : 'hover:bg-slate-800 text-slate-300'}`}
                          title={callStore.isCameraOff ? 'Turn Cam On' : 'Turn Cam Off'}
                        >
                          <VideoOff className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => {
                            if (callStore.isScreenSharing) {
                              stopScreenShare();
                            } else {
                              startScreenShare();
                            }
                          }}
                          className={`p-2.5 rounded-full ${callStore.isScreenSharing ? 'bg-indigo-500 text-white' : 'hover:bg-slate-800 text-slate-300'}`}
                          title={callStore.isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
                        >
                          <Share2 className="h-5 w-5" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={hangUp}
                      className="p-2.5 rounded-full bg-red-500 text-white hover:bg-red-600 shadow shadow-red-500/25"
                      title="Hang up call"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Create Group Modal Overlay */}
      <AnimatePresence>
        {createGroupOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-6">
            <div className="w-full max-w-[400px] glass-panel rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <h3 className="font-bold text-lg text-white">Create Group</h3>
                <button onClick={() => setCreateGroupOpen(false)} className="text-slate-500 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Group Room Name</label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g. Design Review Crew"
                    className="w-full h-10 rounded-xl text-xs font-semibold px-3 glass-input text-white"
                  />
                </div>
              </div>

              <button
                onClick={handleCreateGroup}
                className="w-full py-3 rounded-xl bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/10 hover:bg-indigo-600"
              >
                Create Group
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. Create Community Modal Overlay */}
      <AnimatePresence>
        {createCommunityOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-6">
            <div className="w-full max-w-[400px] glass-panel rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <h3 className="font-bold text-lg text-white">New Community</h3>
                <button onClick={() => setCreateCommunityOpen(false)} className="text-slate-500 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Community Name</label>
                  <input
                    type="text"
                    value={communityName}
                    onChange={(e) => setCommunityName(e.target.value)}
                    placeholder="e.g. UI Designers Hub"
                    className="w-full h-10 rounded-xl text-xs font-semibold px-3 glass-input text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Description</label>
                  <textarea
                    value={communityDesc}
                    onChange={(e) => setCommunityDesc(e.target.value)}
                    placeholder="Explain the purpose of this network..."
                    className="w-full min-h-[60px] rounded-xl text-xs font-semibold p-3 glass-input text-white"
                  />
                </div>
              </div>

              <button
                onClick={handleCreateCommunity}
                className="w-full py-3 rounded-xl bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/10 hover:bg-indigo-600"
              >
                Assemble Community
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. Text Story Modal Overlay */}
      <AnimatePresence>
        {textStatusOpen && (
          <div className="fixed inset-0 bg-slate-950/90 flex items-center justify-center z-50 p-6">
            <div
              style={{ backgroundColor: textStatusBg }}
              className="w-full max-w-[400px] aspect-[4/5] rounded-[32px] p-6 shadow-2xl flex flex-col justify-between items-center border border-white/10"
            >
              <div className="w-full flex justify-between items-center">
                <button onClick={() => setTextStatusOpen(false)} className="text-white/60 hover:text-white font-bold text-sm">Cancel</button>
                <div className="flex gap-2">
                  {['#4f46e5', '#ec4899', '#10b981', '#f59e0b', '#ef4444'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setTextStatusBg(color)}
                      style={{ backgroundColor: color }}
                      className={`h-5 w-5 rounded-full border border-white/20 ${textStatusBg === color ? 'scale-110 ring-2 ring-white/50' : ''}`}
                    />
                  ))}
                </div>
              </div>

              <textarea
                value={textStatusContent}
                onChange={(e) => setTextStatusContent(e.target.value)}
                placeholder="What is on your mind?..."
                className="w-full bg-transparent border-0 outline-none text-white text-xl font-bold text-center placeholder:text-white/40 focus:ring-0"
              />

              <button
                onClick={handlePostTextStatus}
                className="bg-white text-slate-900 px-6 py-2.5 rounded-full text-xs font-bold hover:scale-105 transition-transform"
              >
                Post Story
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 8. Active Story Viewer Slides Overlay */}
      <AnimatePresence>
        {activeStatusViewer && (
          <div className="fixed inset-0 bg-black flex items-center justify-center z-50 p-6">
            {/* ProgressBar */}
            <div className="absolute top-6 left-6 right-6 flex gap-1 z-50">
              {activeStatusViewer.map((_, i) => (
                <div key={i} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className={`bg-indigo-500 h-full ${i === activeStatusIndex ? 'w-full transition-all duration-3000' : (i < activeStatusIndex ? 'w-full' : 'w-0')}`}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={() => setActiveStatusViewer(null)}
              className="absolute top-10 right-6 text-white/60 hover:text-white font-bold z-50"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Slide item content */}
            <div className="w-full max-w-[420px] aspect-[4/5] bg-slate-900 rounded-[32px] overflow-hidden flex flex-col justify-between items-center p-6 border border-white/10 relative">
              {activeStatusViewer[activeStatusIndex].type === 'text' ? (
                <div
                  style={{ backgroundColor: activeStatusViewer[activeStatusIndex].backgroundColor || '#4f46e5' }}
                  className="absolute inset-0 flex items-center justify-center p-6"
                >
                  <p className="text-xl font-extrabold text-white text-center">{activeStatusViewer[activeStatusIndex].content}</p>
                </div>
              ) : (
                <img src={activeStatusViewer[activeStatusIndex].content} alt="" className="absolute inset-0 h-full w-full object-cover" />
              )}

              {/* Caption or footer */}
              {activeStatusViewer[activeStatusIndex].caption && (
                <div className="absolute bottom-6 left-6 right-6 bg-slate-950/60 backdrop-blur-md p-4 rounded-2xl text-xs font-semibold text-center border border-white/10">
                  {activeStatusViewer[activeStatusIndex].caption}
                </div>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
