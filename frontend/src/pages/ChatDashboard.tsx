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
  UserX, CheckCircle, Ban, Download, Copy, Megaphone
} from 'lucide-react';
import { Chat, Message, User, Status, Call, DeviceSession, Community } from '../types/index.js';

const wallpaperClasses: { [key: string]: string } = {
  'gradient-mesh': 'bg-gradient-to-tr from-slate-100 to-indigo-50/40 dark:from-slate-950 dark:to-slate-900/60',
  'deep-space': 'bg-gradient-to-tr from-slate-200 to-purple-100 dark:from-indigo-950 dark:to-slate-950',
  'sunset-glow': 'bg-gradient-to-tr from-orange-100 to-pink-100/60 dark:from-amber-950/30 dark:to-purple-950/40',
  'emerald-forest': 'bg-gradient-to-tr from-emerald-50 to-teal-50 dark:from-stone-900 dark:to-emerald-950/20'
};

const getChannelIcon = (type?: string) => {
  switch (type) {
    case 'announcement':
      return <Megaphone className="h-3.5 w-3.5 text-amber-500 shrink-0" />;
    case 'qa':
      return <HelpCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />;
    case 'media':
      return <Compass className="h-3.5 w-3.5 text-blue-500 shrink-0" />;
    case 'events':
      return <Compass className="h-3.5 w-3.5 text-pink-500 shrink-0" />;
    case 'voice':
      return <Volume2 className="h-3.5 w-3.5 text-indigo-500 shrink-0" />;
    default:
      return <span className="font-bold text-slate-400 shrink-0 w-3.5 text-center text-[11px]">#</span>;
  }
};

export default function ChatDashboard() {
  const { user, logout, fetchSessions, sessions, terminateSession, terminateAllSessions } = useAuthStore();
  const {
    chats, fetchChats, activeChat, setActiveChat, messages, sendChatMessage,
    editChatMessage, deleteChatMessage, reactToMessage, starMessageToggle, voteInPoll,
    typingUsers, setTypingUser, togglePinChatMessage
  } = useChatStore();
  
  const callStore = useCallStore();
  const themeStore = useThemeStore();

  const [expiresIn, setExpiresIn] = useState<number>(0);
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [wallpaperPreset, setWallpaperPreset] = useState<string>(localStorage.getItem('wallpaper') || 'gradient-mesh');
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiChatMessages, setAiChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    { sender: 'ai', text: 'Hello! I am your AI Companion. Tell me what you need, like drafting a message, summarizing chat history, or checking facts!' }
  ]);
  const [aiChatInput, setAiChatInput] = useState('');
  const [aiChatLoading, setAiChatLoading] = useState(false);

  const { socket, emitEvent } = useSocket();
  const {
    makeCall, answerCall, rejectCall, handleIceCandidate, handleCallAccepted,
    startScreenShare, stopScreenShare, hangUp
  } = useWebRTC(emitEvent);

  // Active Main Sidebar Tab
  const [activeTab, setActiveTab] = useState<'chats' | 'status' | 'calls' | 'communities' | 'settings' | 'profile' | 'admin'>('chats');
  
  // Group Info Sidebar & Invite States
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [inviteLinks, setInviteLinks] = useState<{ publicLink: string; privateLink: string } | null>(null);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [copiedLink, setCopiedLink] = useState<'public' | 'private' | null>(null);

  // Reset group info when active chat changes
  useEffect(() => {
    setIsGroupInfoOpen(false);
    setInviteLinks(null);
    setCopiedLink(null);
  }, [activeChat]);

  // Searching/Creating models
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupParticipants, setGroupParticipants] = useState<string[]>([]);
  const [isBroadcastGroup, setIsBroadcastGroup] = useState(false);
  
  // Statuses & calls states
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [activeStatusViewer, setActiveStatusViewer] = useState<Status[] | null>(null);
  const [activeStatusIndex, setActiveStatusIndex] = useState(0);
  const [textStatusOpen, setTextStatusOpen] = useState(false);
  const [textStatusContent, setTextStatusContent] = useState('');
  const [textStatusBg, setTextStatusBg] = useState('#4f46e5');
  const [callHistory, setCallHistory] = useState<Call[]>([]);

  // Rich Stories States
  const [storyType, setStoryType] = useState<'text' | 'media'>('text');
  const [storyFile, setStoryFile] = useState<File | null>(null);
  const [storyFileUrl, setStoryFileUrl] = useState<string | null>(null);
  const [storyMusic, setStoryMusic] = useState('');
  const [storyMention, setStoryMention] = useState('');
  const [storyLocation, setStoryLocation] = useState('');
  const [storyHashtags, setStoryHashtags] = useState('');
  const [storyPollQuestion, setStoryPollQuestion] = useState('');
  const [storyPollOpt1, setStoryPollOpt1] = useState('');
  const [storyPollOpt2, setStoryPollOpt2] = useState('');
  const [storyQuestion, setStoryQuestion] = useState('');
  const [storyEmojiSliderTarget, setStoryEmojiSliderTarget] = useState('🔥');
  const [storyReplyText, setStoryReplyText] = useState('');

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
  const storyFileInputRef = useRef<HTMLInputElement>(null);
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

  // Synchronize profile device sessions list on Tab change
  useEffect(() => {
    if (activeTab === 'profile') {
      fetchSessions();
    }
  }, [activeTab, fetchSessions]);

  // Request Desktop notifications permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Sync active message window scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
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

  // Invite Link generator handlers
  const generateGroupInvite = async () => {
    if (!activeChat) return;
    setGeneratingInvite(true);
    try {
      const response = await apiClient.post(`/chats/${activeChat._id}/invite-link`);
      const { inviteCode, privateToken } = response.data;
      const origin = window.location.origin;
      setInviteLinks({
        publicLink: `${origin}/join/${inviteCode}`,
        privateLink: `${origin}/join/${privateToken}`
      });
    } catch (err: any) {
      console.error('Failed to generate invite links:', err);
    } finally {
      setGeneratingInvite(false);
    }
  };

  const handleUpdateGroupSettings = async (settings: any) => {
    if (!activeChat) return;
    try {
      const resp = await apiClient.patch(`/chats/${activeChat._id}/settings`, settings);
      setActiveChat(resp.data.chat);
      fetchChats();
    } catch (e) {
      console.error('Failed to update group settings:', e);
    }
  };

  const copyToClipboard = (text: string, type: 'public' | 'private') => {
    navigator.clipboard.writeText(text);
    setCopiedLink(type);
    setTimeout(() => {
      setCopiedLink(null);
    }, 2000);
  };

  const handleAvatarClick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      await useAuthStore.getState().updateProfileData(formData);
    } catch (err) {
      console.error('Failed to upload avatar:', err);
    }
  };

  const handleToggleBlockUser = async (opponentId: string) => {
    try {
      const response = await apiClient.post('/users/block', { userId: opponentId });
      if (user) {
        useAuthStore.setState({
          user: {
            ...user,
            blockedUsers: response.data.blockedUsers
          }
        });
      }
    } catch (err: any) {
      console.error('Failed to toggle block status:', err);
    }
  };

  // Group creation logic
  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;
    try {
      const resp = await apiClient.post('/chats', {
        isGroup: true,
        name: groupName,
        participants: groupParticipants,
        isBroadcast: isBroadcastGroup
      });
      setActiveChat(resp.data.chat);
      setGroupName('');
      setGroupParticipants([]);
      setIsBroadcastGroup(false);
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
        replyingTo?._id,
        expiresIn || undefined
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
  const handlePostStory = async () => {
    const meta: any = {};
    if (storyMusic.trim()) meta.music = storyMusic;
    if (storyMention.trim()) meta.mention = storyMention;
    if (storyLocation.trim()) meta.location = storyLocation;
    if (storyHashtags.trim()) meta.hashtags = storyHashtags.split(',').map((t) => t.trim());
    if (storyPollQuestion.trim()) {
      meta.poll = {
        question: storyPollQuestion,
        opt1: storyPollOpt1 || 'Yes',
        opt2: storyPollOpt2 || 'No',
        votes1: [],
        votes2: []
      };
    }
    if (storyQuestion.trim()) {
      meta.question = {
        text: storyQuestion,
        answers: []
      };
    }
    meta.emojiSlider = {
      target: storyEmojiSliderTarget,
      score: 50
    };

    try {
      if (storyType === 'media' && storyFile) {
        const formData = new FormData();
        formData.append('type', storyFile.type.startsWith('video') ? 'video' : 'image');
        formData.append('file', storyFile);
        formData.append('caption', JSON.stringify(meta));
        
        await apiClient.post('/status', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        if (!textStatusContent.trim()) return;
        await apiClient.post('/status', {
          type: 'text',
          content: textStatusContent,
          backgroundColor: textStatusBg,
          caption: JSON.stringify(meta)
        });
      }
      
      // Reset values
      setTextStatusContent('');
      setStoryFile(null);
      setStoryFileUrl(null);
      setStoryMusic('');
      setStoryMention('');
      setStoryLocation('');
      setStoryHashtags('');
      setStoryPollQuestion('');
      setStoryPollOpt1('');
      setStoryPollOpt2('');
      setStoryQuestion('');
      setStoryType('text');
      setTextStatusOpen(false);
      fetchStatuses();
    } catch (e) {
      console.error('Failed to post story:', e);
    }
  };

  const handleReplyToStory = async () => {
    if (!storyReplyText.trim() || !activeStatusViewer) return;
    const targetStatus = activeStatusViewer[activeStatusIndex];
    const targetUserId = targetStatus.userId._id;
    if (targetUserId === user?._id) return;
    
    try {
      // Start/Get a direct chat with the status owner
      const resp = await apiClient.post('/chats', {
        isGroup: false,
        participantId: targetUserId
      });
      const chat = resp.data.chat;
      
      // Post the reply message
      await apiClient.post(`/chats/${chat._id}/messages`, {
        content: `Replied to your story: "${storyReplyText}"`
      });
      
      setStoryReplyText('');
      alert('Reply sent successfully!');
    } catch (e) {
      console.error('Failed to reply to story:', e);
    }
  };

  const handleLikeStory = async (statusId: string) => {
    try {
      await apiClient.post(`/status/${statusId}/like`);
      // Refetch and update status stores
      const res = await apiClient.get('/status');
      setStatuses(res.data.statuses);
      if (activeStatusViewer) {
        setActiveStatusViewer(res.data.statuses);
      }
    } catch (e) {
      console.error('Failed to like story:', e);
    }
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

  const handleSendAiChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!aiChatInput.trim()) return;

    const userPrompt = aiChatInput;
    setAiChatMessages((prev) => [...prev, { sender: 'user', text: userPrompt }]);
    setAiChatInput('');
    setAiChatLoading(true);

    try {
      const recentMsgs = (messages[activeChat?._id || ''] || []).slice(-5).map(m => {
        const isSelf = typeof m.senderId === 'string' ? m.senderId === user?.id : m.senderId._id === user?.id;
        return `${isSelf ? 'You' : 'Other'}: ${m.content}`;
      }).join('\n');
      const context = activeChat ? `Conversation history:\n${recentMsgs}` : undefined;

      const resp = await apiClient.post('/ai/ask', {
        prompt: userPrompt,
        context
      });
      setAiChatMessages((prev) => [...prev, { sender: 'ai', text: resp.data.response }]);
    } catch (e) {
      setAiChatMessages((prev) => [...prev, { sender: 'ai', text: 'Sorry, I failed to respond. Make sure GEMINI_API_KEY is configured in the backend.' }]);
    } finally {
      setAiChatLoading(false);
    }
  };

  const handleAiSummarizeInSidebar = async () => {
    if (!activeChat) return;
    setAiChatLoading(true);
    setAiChatMessages((prev) => [...prev, { sender: 'user', text: 'Please summarize this chat history for me.' }]);
    try {
      const resp = await apiClient.get(`/ai/summarize/${activeChat._id}`);
      setAiChatMessages((prev) => [...prev, { sender: 'ai', text: resp.data.summary || 'There are no recent messages to summarize!' }]);
    } catch (e) {
      setAiChatMessages((prev) => [...prev, { sender: 'ai', text: 'Failed to summarize thread. Make sure GEMINI_API_KEY is configured.' }]);
    } finally {
      setAiChatLoading(false);
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
      
      {/* Soft colorful backdrop blobs for vibrant design aesthetics */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-400/20 dark:bg-indigo-600/10 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] left-[20%] w-[45%] h-[45%] rounded-full bg-pink-400/15 dark:bg-purple-600/10 blur-[130px] pointer-events-none z-0" />
      <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-400/15 dark:bg-indigo-600/10 blur-[120px] pointer-events-none z-0" />

      {/* Left Column: List Panel + Bottom Navigation Bar */}
      <section className="w-80 md:w-96 glass-panel border-r border-slate-200/60 dark:border-slate-800/60 flex flex-col z-10 shrink-0 relative overflow-hidden">
        
        {/* App Branding Top Header */}
        <div className="p-4.5 pb-3 border-b border-slate-200 dark:border-slate-800/40 flex items-center bg-white/30 dark:bg-slate-900/30">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-sm font-black tracking-tighter text-white">SK</span>
            </div>
            <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-200 dark:to-purple-300">SK Connect</span>
          </div>
        </div>
        
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
                    const targetParticipant = chat.participants.find(p => p._id !== (user?._id || user?.id));
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
                            <h4 className="text-sm font-semibold truncate text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              {chat.isBroadcast && <Megaphone className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />}
                              <span>{titleName}</span>
                            </h4>
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
                const wasCaller = call.callerId._id === (user?._id || user?.id);
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
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-200 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white text-left transition-colors"
                      >
                        {getChannelIcon(channel.channelType)}
                        <span className="truncate">{channel.name}</span>
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
          <div className="flex flex-col h-full p-5 space-y-6 overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800/40 shrink-0">
              <h2 className="text-base font-black tracking-tight text-slate-800 dark:text-white">My Profile</h2>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 dark:text-emerald-450 font-bold tracking-wide">Active</span>
            </div>

            {/* Profile Avatar Card */}
            <div className="p-5 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center text-center relative group">
              <div 
                onClick={handleAvatarClick}
                className="h-20 w-20 rounded-full border-2 border-indigo-500 bg-slate-200 dark:bg-slate-800 overflow-hidden relative cursor-pointer group/avatar"
                title="Change Profile Photo"
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt="" className="h-full w-full object-cover transition-transform group-hover/avatar:scale-105" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center font-bold text-slate-500 text-2xl">
                    {user?.username?.charAt(0).toUpperCase()}
                  </div>
                )}
                {/* Upload camera hover overlay */}
                <div className="absolute inset-0 bg-black/45 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity">
                  <Plus className="h-5 w-5 text-white animate-pulse" />
                </div>
              </div>
              <input
                type="file"
                ref={avatarInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleAvatarChange}
              />

              <div className="mt-3.5">
                <h3 className="font-bold text-sm text-slate-800 dark:text-white">{user?.username}</h3>
                <p className="text-[11px] text-slate-550 dark:text-slate-450 mt-0.5">{user?.email}</p>
              </div>
            </div>

            {/* Biography Area */}
            <div className="space-y-2">
              <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">About Me</label>
              <textarea
                defaultValue={user?.bio}
                onBlur={async (e) => {
                  const form = new FormData();
                  form.append('bio', e.target.value);
                  await useAuthStore.getState().updateProfileData(form);
                }}
                className="w-full min-h-[80px] rounded-xl text-xs font-semibold p-3 bg-white/50 dark:bg-slate-955/40 text-slate-800 dark:text-white placeholder:text-slate-500 border border-slate-200 dark:border-slate-800 outline-none focus:border-indigo-500 transition-colors"
                placeholder="Tell people about yourself..."
              />
              <span className="text-[9px] text-slate-400 dark:text-slate-500 block text-right font-semibold">Changes are saved on blur</span>
            </div>

            {/* Account Info Cards Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-left">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-505 dark:text-slate-400">Account Type</p>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 capitalize animate-pulse">
                  {user?.role || 'User'}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-left">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-505 dark:text-slate-400">Active Threads</p>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                  {chats.length} chats
                </p>
              </div>
            </div>

            {/* Active Sessions list */}
            <div className="space-y-3 pt-2 text-left">
              <div className="flex justify-between items-center">
                <label className="block text-[9px] font-bold text-slate-505 dark:text-slate-400 uppercase tracking-widest">Active Login Devices</label>
                <button
                  onClick={async () => {
                    await terminateAllSessions();
                    fetchSessions();
                  }}
                  className="text-[9px] font-bold text-red-500 hover:text-red-650 transition-colors uppercase tracking-wider"
                >
                  Terminate All
                </button>
              </div>
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {sessions && sessions.length > 0 ? (
                  sessions.map((sess) => (
                    <div 
                      key={sess.id} 
                      className="p-2.5 rounded-xl bg-slate-100/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{sess.deviceType}</p>
                        <p className="text-[9px] text-slate-500 mt-0.5 truncate">{sess.ipAddress} • {new Date(sess.lastActive).toLocaleDateString()}</p>
                      </div>
                      {sess.isCurrent ? (
                        <span className="text-[8px] bg-indigo-500/10 text-indigo-500 font-bold px-1.5 py-0.5 rounded-md uppercase shrink-0">Current</span>
                      ) : (
                        <button
                          onClick={async () => {
                            await terminateSession(sess.id);
                            fetchSessions();
                          }}
                          className="text-[10px] text-red-505 hover:text-red-650 font-bold px-1.5 py-0.5 shrink-0"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-slate-500 py-2">No other active login device sessions</p>
                )}
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
                      className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all ${
                        themeStore.theme === th
                          ? 'bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-500/10'
                          : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 border-slate-200 dark:border-slate-800'
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
                      className={`h-7 w-7 rounded-full transition-transform border border-slate-200 dark:border-slate-700/40 ${
                        themeStore.accentColor === color ? 'ring-2 ring-indigo-500 ring-offset-2 scale-110' : 'hover:scale-105'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Chat Background Wallpaper</span>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {[
                    { id: 'gradient-mesh', name: 'Gradient Mesh' },
                    { id: 'deep-space', name: 'Deep Space' },
                    { id: 'sunset-glow', name: 'Sunset Glow' },
                    { id: 'emerald-forest', name: 'Emerald Forest' }
                  ].map((wall) => (
                    <button
                      key={wall.id}
                      onClick={() => {
                        setWallpaperPreset(wall.id);
                        localStorage.setItem('wallpaper', wall.id);
                      }}
                      className={`py-2 text-[10px] font-bold rounded-xl border transition-all ${
                        wallpaperPreset === wall.id
                          ? 'bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-500/10'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-350 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {wall.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800/40">
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

              {/* Log Out Button */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800/40">
                <button
                  onClick={() => logout()}
                  className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold text-xs border border-red-500/20 transition-colors"
                >
                  <LogOut className="h-4.5 w-4.5" />
                  <span>Log Out of SK Connect</span>
                </button>
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

                    {usr._id !== (user?._id || user?.id) && (
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

          {/* Integrated Bottom Navigation Bar (Previously left sidebar) */}
          <nav className="h-15 border-t border-slate-200 dark:border-slate-800/40 bg-white/60 dark:bg-slate-950/60 backdrop-blur-md flex items-center justify-around px-2 py-1.5 shrink-0 z-10">
            {[
              { id: 'chats', label: 'Chats', icon: MessageSquare },
              { id: 'status', label: 'Stories', icon: Compass },
              { id: 'calls', label: 'Calls', icon: Phone },
              { id: 'communities', label: 'Servers', icon: Globe },
              { id: 'profile', label: 'Bio', icon: UserIcon },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map((btn) => {
              const Icon = btn.icon;
              const active = activeTab === btn.id;
              return (
                <button
                  key={btn.id}
                  onClick={() => { setActiveTab(btn.id as any); }}
                  className={`flex flex-col items-center justify-center h-11 w-11 rounded-xl transition-all relative ${
                    active 
                      ? 'bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10 dark:border-indigo-500/20' 
                      : 'text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
                  }`}
                  title={btn.label}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[9px] font-bold mt-0.5 scale-90">{btn.label}</span>
                </button>
              );
            })}
            
            {/* Conditional Admin bottom link */}
            {(user?.role === 'admin' || user?.role === 'moderator') && (
              <button
                onClick={() => { setActiveTab('admin'); }}
                className={`flex flex-col items-center justify-center h-11 w-11 rounded-xl transition-all ${
                  activeTab === 'admin'
                    ? 'bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/10 dark:border-amber-500/20'
                    : 'text-amber-600/60 dark:text-amber-500/60 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
                }`}
                title="Admin"
              >
                <Shield className="h-5 w-5" />
                <span className="text-[9px] font-bold mt-0.5 scale-90">Admin</span>
              </button>
            )}
          </nav>
        </section>

        {/* 3. Main Chat Panel (Active view on Right) */}
        <main className={`flex-1 flex flex-col justify-between relative overflow-hidden transition-all duration-500 ${wallpaperClasses[wallpaperPreset] || wallpaperClasses['gradient-mesh']}`}>
        {activeChat ?
          (() => {
            const opponent = activeChat.isGroup ? null : activeChat.participants.find(p => p._id !== (user?._id || user?.id));
            return (
              <div className="flex-1 flex overflow-hidden h-full relative">
                {/* Message List Pane */}
                <div className="flex-1 flex flex-col h-full justify-between overflow-hidden border-r border-slate-200 dark:border-slate-800/40">
                
                {/* Active chat header */}
                <header className="h-16 border-b border-slate-200 dark:border-slate-800/60 px-6 flex items-center justify-between bg-white/40 dark:bg-slate-900/40 backdrop-blur-md z-10 shrink-0">
                  <div 
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => {
                      setIsGroupInfoOpen(!isGroupInfoOpen);
                      setIsAiOpen(false);
                    }}
                  >
                    <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-850 overflow-hidden border border-slate-300 dark:border-slate-700/40 transition-transform group-hover:scale-105">
                      {activeChat.isGroup ? (
                        activeChat.avatar ? <img src={activeChat.avatar} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center font-bold text-slate-500 bg-indigo-500/10 text-indigo-500">G</div>
                      ) : (
                        opponent?.avatar ? (
                          <img src={opponent.avatar} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center font-bold text-slate-500">U</div>
                        )
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-500 transition-colors flex items-center gap-1.5">
                        {activeChat.isBroadcast && <Megaphone className="h-4 w-4 text-indigo-500 dark:text-indigo-400 shrink-0" />}
                        {activeChat.isGroup ? activeChat.name : (opponent?.username || 'SK Connect User')}
                        {activeChat.isGroup && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 font-bold scale-90">
                            {activeChat.isBroadcast ? 'Broadcast' : 'Info'}
                          </span>
                        )}
                      </h3>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                        {activeChat.isGroup ? `${activeChat.participants.length} members` : (opponent?.status || 'offline')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Search Messages Toggle */}
                    <button
                      onClick={() => setChatSearchOpen(!chatSearchOpen)}
                      className={`p-2 rounded-lg transition-all ${chatSearchOpen ? 'bg-indigo-500/10 text-indigo-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                      title="Search Messages"
                    >
                      <Search className="h-4.5 w-4.5" />
                    </button>

                    {/* Voice/Video calling controls (Direct only) */}
                    {!activeChat.isGroup && opponent && (
                      <>
                        <button
                          onClick={() => makeCall(opponent._id, activeChat._id, 'voice')}
                          className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
                          title="Audio Call"
                        >
                          <Phone className="h-4.5 w-4.5" />
                        </button>
                        <button
                          onClick={() => makeCall(opponent._id, activeChat._id, 'video')}
                          className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
                          title="Video Call"
                        >
                          <Video className="h-4.5 w-4.5" />
                        </button>
                      </>
                    )}

                    {/* AI Companion Toggle */}
                    <button
                      onClick={() => setIsAiOpen(!isAiOpen)}
                      className={`p-2 rounded-lg transition-all ${isAiOpen ? 'bg-indigo-500/10 text-indigo-500' : 'text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-500/10'}`}
                      title="AI Companion"
                    >
                      <Sparkles className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </header>
            {chatSearchOpen && (
              <div className="px-6 py-2 border-b border-slate-200 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md flex gap-3 items-center shrink-0 z-10">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={chatSearchQuery}
                    onChange={(e) => setChatSearchQuery(e.target.value)}
                    placeholder="Search messages..."
                    className="w-full h-9 pl-9 pr-4 rounded-xl text-xs font-medium glass-input text-slate-800 dark:text-white placeholder:text-slate-500"
                  />
                </div>
                <button
                  onClick={() => {
                    setChatSearchOpen(false);
                    setChatSearchQuery('');
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white"
                >
                  Close
                </button>
              </div>
            )}

            {(() => {
              const pinnedMsg = (messages[activeChat._id] || []).find(m => activeChat.pinnedMessages?.includes(m._id));
              return pinnedMsg ? (
                <div className="bg-indigo-500/10 border-b border-indigo-500/20 px-6 py-2 flex items-center justify-between text-[11px] text-indigo-600 dark:text-indigo-400 backdrop-blur-md z-10 shrink-0">
                  <div 
                    className="flex items-center gap-2 cursor-pointer truncate mr-4" 
                    onClick={() => {
                      const el = document.getElementById(`msg-${pinnedMsg._id}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                  >
                    <Pin className="h-3 w-3 rotate-45 text-indigo-500" />
                    <span className="font-bold">Pinned Message:</span>
                    <span className="truncate max-w-[500px] text-slate-600 dark:text-slate-350">{pinnedMsg.content || '[Attachment]'}</span>
                  </div>
                  <button 
                    onClick={() => togglePinChatMessage(activeChat._id, pinnedMsg._id)} 
                    className="font-bold hover:text-red-500 transition-colors shrink-0"
                  >
                    Unpin
                  </button>
                </div>
              ) : null;
            })()}

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {(() => {
                const rawMsgs = messages[activeChat._id] || [];
                const filteredMsgs = chatSearchQuery.trim()
                  ? rawMsgs.filter(m => m.content.toLowerCase().includes(chatSearchQuery.toLowerCase()))
                  : rawMsgs;
                
                return filteredMsgs.map((msg) => {
                  const currentUserId = user?._id || user?.id;
                  const msgSenderId = typeof msg.senderId === 'object' ? (msg.senderId as any)?._id || (msg.senderId as any)?.id : msg.senderId;
                  const isMe = !!(currentUserId && msgSenderId && currentUserId.toString() === msgSenderId.toString());
                  const senderName = isMe ? 'You' : ((msg.senderId as any)?.username || 'User');
                  
                  return (
                    <div
                      key={msg._id}
                      id={`msg-${msg._id}`}
                      className={`flex flex-col gap-1 max-w-[70%] ${isMe ? 'self-end ml-auto items-end' : 'items-start'}`}
                    >
                      {activeChat.isGroup && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-500">{senderName}</span>
                        </div>
                      )}

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
                          className={`flex items-center justify-between gap-3 mb-2.5 p-3 rounded-xl border transition-all duration-300 ${
                            isMe 
                              ? 'bg-white/10 hover:bg-white/15 border-white/20 text-white' 
                              : 'bg-slate-50 dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <div className={`p-2 rounded-xl shrink-0 ${
                              isMe ? 'bg-white/20 text-white' : 'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400'
                            }`}>
                              <FileText className="h-5 w-5" />
                            </div>
                            <div className="truncate text-left">
                              <p className="text-[11px] font-bold truncate max-w-[160px]">
                                {msg.fileName || 'document.pdf'}
                              </p>
                              <p className={`text-[9px] uppercase font-bold tracking-wider mt-0.5 ${
                                isMe ? 'text-white/60' : 'text-slate-400 dark:text-slate-500'
                              }`}>
                                {msg.fileName?.split('.').pop() || 'PDF'} Document
                              </p>
                            </div>
                          </div>
                          <div className={`h-7 w-7 rounded-full shrink-0 flex items-center justify-center transition-colors ${
                            isMe ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 dark:text-indigo-400'
                          }`}>
                            <Download className="h-3.5 w-3.5" />
                          </div>
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

                      {/* Emojis hover popup (centered above bubble to prevent cut-off) */}
                      <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:flex gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 shadow-xl z-20">
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

                      {/* Actions hover list (rendered on inner side relative to sender alignment) */}
                      <div className={`absolute top-1/2 -translate-y-1/2 hidden group-hover:flex gap-1.5 px-2 py-1 rounded-xl bg-slate-900 border border-slate-800 shadow-xl z-20 ${
                        isMe ? 'right-full mr-2' : 'left-full ml-2'
                      }`}>
                        <button onClick={() => setReplyingTo(msg)} className="text-slate-400 hover:text-white" title="Reply">
                          <CornerUpLeft className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleTranslateMessage(msg, 'Spanish')} className="text-indigo-400 hover:text-white" title="Translate">
                          <Languages className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          onClick={() => togglePinChatMessage(activeChat._id, msg._id)} 
                          className={`transition-colors ${activeChat.pinnedMessages?.includes(msg._id) ? 'text-amber-500 hover:text-red-500' : 'text-slate-400 hover:text-amber-400'}`} 
                          title={activeChat.pinnedMessages?.includes(msg._id) ? 'Unpin' : 'Pin'}
                        >
                          <Pin className="h-3.5 w-3.5 rotate-45" />
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
              });
            })()}
            <div ref={messagesEndRef} />
            </div>

            {/* Bottom input area */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800/40 bg-white/40 dark:bg-slate-900/20 backdrop-blur-md shrink-0">
              
              {/* Replying feedback */}
              {replyingTo && (
                <div className="mb-2 p-2 px-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs text-slate-600 dark:text-slate-400">
                  <span>Replying to message: <i>"{replyingTo.content}"</i></span>
                  <button onClick={() => setReplyingTo(null)} className="text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Upload loading bar */}
              {uploadProgress > 0 && (
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mb-3">
                  <div className="bg-indigo-500 h-full transition-all" style={{ width: `${uploadProgress}%` }}></div>
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

                {/* Disappearing Messages Duration Picker */}
                <div className="relative">
                  <select
                    value={expiresIn}
                    onChange={(e) => setExpiresIn(Number(e.target.value))}
                    className="h-11 px-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-450 text-[10px] font-bold hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer outline-none min-w-[70px] text-center"
                    title="Self-Destruct Timer"
                  >
                    <option value={0}>⏲️ Off</option>
                    <option value={5}>⏲️ 5s</option>
                    <option value={60}>⏲️ 1m</option>
                    <option value={3600}>⏲️ 1h</option>
                    <option value={86400}>⏲️ 1d</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-11 w-11 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
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
                    className="w-full h-11 px-4 rounded-xl text-sm font-medium glass-input text-slate-800 dark:text-white placeholder:text-slate-500"
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

          {/* AI companion sidebar panel */}
          {isAiOpen && (
            <div className="w-80 border-l border-slate-200 dark:border-slate-800/40 bg-white/40 dark:bg-slate-900/30 backdrop-blur-md flex flex-col h-full shrink-0 z-10 overflow-hidden">
              {/* AI Header */}
              <div className="h-16 border-b border-slate-200 dark:border-slate-800/60 px-4 flex items-center justify-between bg-white/40 dark:bg-slate-900/40 backdrop-blur-md shrink-0">
                <div className="flex items-center gap-2 text-indigo-500 dark:text-indigo-400">
                  <Sparkles className="h-5 w-5 animate-pulse" />
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200">AI Companion</span>
                </div>
                <button 
                  onClick={() => setIsAiOpen(false)} 
                  className="text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* AI Messages List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {aiChatMessages.map((m, idx) => (
                  <div 
                    key={idx} 
                    className={`flex flex-col max-w-[85%] ${m.sender === 'user' ? 'self-end ml-auto items-end' : 'items-start'}`}
                  >
                    <span className="text-[9px] font-bold text-slate-500 mb-1">
                      {m.sender === 'user' ? 'You' : 'Companion'}
                    </span>
                    <div 
                      className={`px-3 py-2.5 rounded-2xl text-xs leading-relaxed ${
                        m.sender === 'user'
                          ? 'bg-indigo-500 text-white rounded-tr-none'
                          : 'bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-250 border border-slate-200 dark:border-slate-800 rounded-tl-none'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
                {aiChatLoading && (
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <Sparkles className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                    <span>Thinking...</span>
                  </div>
                )}
              </div>

              {/* AI Toolbar Quick Actions */}
              <div className="p-3 border-t border-slate-200 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-950/20 flex gap-2">
                <button
                  onClick={handleAiSummarizeInSidebar}
                  className="flex-1 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-650 dark:text-indigo-400 text-[10px] font-bold border border-indigo-500/20 transition-colors"
                >
                  📝 Summarize Chat
                </button>
              </div>

              {/* AI Input Form */}
              <form 
                onSubmit={handleSendAiChatMessage} 
                className="p-3 border-t border-slate-200 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md flex gap-2 items-center"
              >
                <input
                  type="text"
                  value={aiChatInput}
                  onChange={(e) => setAiChatInput(e.target.value)}
                  placeholder="Ask AI companion..."
                  className="flex-1 h-9 px-3 rounded-xl text-xs font-semibold glass-input text-slate-800 dark:text-white placeholder:text-slate-500"
                />
                <button
                  type="submit"
                  className="h-9 w-9 rounded-xl bg-indigo-500 hover:bg-indigo-650 flex items-center justify-center text-white"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          )}

          {/* Group Details Info sidebar panel */}
          {isGroupInfoOpen && activeChat.isGroup && (
            <div className="w-80 border-l border-slate-200 dark:border-slate-800/40 bg-white/40 dark:bg-slate-900/30 backdrop-blur-md flex flex-col h-full shrink-0 z-10 overflow-hidden">
              {/* Header */}
              <div className="h-16 border-b border-slate-200 dark:border-slate-800/60 px-4 flex items-center justify-between bg-white/40 dark:bg-slate-900/40 backdrop-blur-md shrink-0">
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200">Group Details</span>
                <button 
                  onClick={() => setIsGroupInfoOpen(false)} 
                  className="text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Group Metadata Details */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                <div className="text-center">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-indigo-500/10 mx-auto mb-4 border-2 border-white dark:border-slate-800">
                    {activeChat.avatar ? <img src={activeChat.avatar} alt="" className="h-full w-full rounded-full object-cover" /> : (activeChat.name?.charAt(0) || 'G')}
                  </div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white truncate">{activeChat.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{activeChat.description || 'No group description provided.'}</p>
                </div>

                {/* Invite Links Action Card */}
                <div className="p-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-300">Invite Members</h4>
                    <Compass className="h-4 w-4 text-indigo-500" />
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Generate secure invitation links to add users to this group chat.
                  </p>

                  {inviteLinks ? (
                    <div className="space-y-3 pt-1 text-left">
                      {/* Public Link */}
                      <div>
                        <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-400 mb-1">Public Join Link</label>
                        <div className="flex gap-1">
                          <input
                            type="text"
                            readOnly
                            value={inviteLinks.publicLink}
                            className="flex-1 text-[10px] bg-slate-105 dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 outline-none truncate"
                          />
                          <button
                            onClick={() => copyToClipboard(inviteLinks.publicLink, 'public')}
                            className="px-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold transition-colors"
                          >
                            {copiedLink === 'public' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Private Link */}
                      <div>
                        <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-400 mb-1">Private Link (Expires in 24h)</label>
                        <div className="flex gap-1">
                          <input
                            type="text"
                            readOnly
                            value={inviteLinks.privateLink}
                            className="flex-1 text-[10px] bg-slate-105 dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 outline-none truncate"
                          />
                          <button
                            onClick={() => copyToClipboard(inviteLinks.privateLink, 'private')}
                            className="px-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold transition-colors"
                          >
                            {copiedLink === 'private' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={generateGroupInvite}
                      disabled={generatingInvite}
                      className="w-full py-2 px-3 bg-indigo-500 hover:bg-indigo-650 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      {generatingInvite ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      ) : (
                        'Generate Group Invite Links'
                      )}
                    </button>
                  )}
                </div>

                {/* Group settings control panel (Visible to Admins / Owners) */}
                {(() => {
                  const isOwner = activeChat.creatorId === user?._id || activeChat.ownerId === user?._id;
                  const isAdmin = activeChat.admins?.some((adm: any) => (typeof adm === 'string' ? adm === user?._id : adm._id === user?._id));
                  
                  if (!isOwner && !isAdmin) return null;
                  
                  return (
                    <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-4 text-left">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-300">Group Settings</h4>
                        <Settings className="h-4 w-4 text-indigo-500" />
                      </div>
                      
                      {/* Slow Mode dropdown */}
                      <div className="space-y-1">
                        <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500">Slow Mode Delay</label>
                        <select 
                          value={activeChat.slowMode || 0}
                          onChange={(e) => handleUpdateGroupSettings({ slowMode: Number(e.target.value) })}
                          className="w-full h-8 rounded-lg text-[10px] px-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 outline-none"
                        >
                          <option value={0}>Off</option>
                          <option value={5}>5 seconds</option>
                          <option value={10}>10 seconds</option>
                          <option value={30}>30 seconds</option>
                          <option value={60}>60 seconds</option>
                        </select>
                      </div>

                      {/* Announcement Mode toggle */}
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500">Announcement Mode</label>
                          <p className="text-[7.5px] text-slate-500">Only admins can post messages</p>
                        </div>
                        <input 
                          type="checkbox"
                          checked={activeChat.announcementMode || false}
                          onChange={(e) => handleUpdateGroupSettings({ announcementMode: e.target.checked })}
                          className="rounded border-slate-300 text-indigo-650 focus:ring-indigo-500 h-3.5 w-3.5"
                        />
                      </div>

                      {/* Approval Required toggle */}
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500">Approval Gate</label>
                          <p className="text-[7.5px] text-slate-500">Require admin consent to join</p>
                        </div>
                        <input 
                          type="checkbox"
                          checked={activeChat.approvalRequired || false}
                          onChange={(e) => handleUpdateGroupSettings({ approvalRequired: e.target.checked })}
                          className="rounded border-slate-300 text-indigo-650 focus:ring-indigo-500 h-3.5 w-3.5"
                        />
                      </div>

                      {/* Group Rules */}
                      <div className="space-y-1">
                        <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500">Group Guidelines / Rules</label>
                        <textarea
                          placeholder="Specify rules for this chat..."
                          value={activeChat.groupRules || ''}
                          onChange={(e) => handleUpdateGroupSettings({ groupRules: e.target.value })}
                          className="w-full min-h-[50px] text-[10px] p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 outline-none resize-none"
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* Group Members List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-300">
                    Group Members ({activeChat.participants.length})
                  </h4>
                  <div className="space-y-2.5">
                    {activeChat.participants.map((member) => {
                      const isOwner = member._id === activeChat.creatorId || member._id === activeChat.ownerId;
                      const isAdmin = activeChat.admins?.some((adm: any) => (typeof adm === 'string' ? adm === member._id : adm._id === member._id));
                      const isMod = activeChat.moderators?.some((mod: any) => (typeof mod === 'string' ? mod === member._id : mod._id === member._id));
                      
                      return (
                        <div key={member._id} className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-850 overflow-hidden border border-slate-200 dark:border-slate-850 shrink-0">
                            {member.avatar ? (
                              <img src={member.avatar} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center font-bold text-xs text-slate-500 bg-indigo-500/10 text-indigo-500">
                                {member.username?.charAt(0).toUpperCase() || 'U'}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-250 truncate">{member.username}</span>
                              {isOwner && <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 leading-none">Owner</span>}
                              {!isOwner && isAdmin && <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 leading-none">Admin</span>}
                              {!isOwner && !isAdmin && isMod && <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 leading-none">Mod</span>}
                              {!isOwner && !isAdmin && !isMod && <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-500 leading-none">Member</span>}
                            </div>
                            <p className="text-[10px] text-slate-500 truncate capitalize">{member.bio || 'Available'}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* User Profile Info sidebar panel (Direct Chat only) */}
          {isGroupInfoOpen && !activeChat.isGroup && opponent && (
            <div className="w-80 border-l border-slate-200 dark:border-slate-800/40 bg-white/40 dark:bg-slate-900/30 backdrop-blur-md flex flex-col h-full shrink-0 z-10 overflow-hidden">
              {/* Header */}
              <div className="h-16 border-b border-slate-200 dark:border-slate-800/60 px-4 flex items-center justify-between bg-white/40 dark:bg-slate-900/40 backdrop-blur-md shrink-0">
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200">Contact Profile</span>
                <button 
                  onClick={() => setIsGroupInfoOpen(false)} 
                  className="text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* User Metadata Details */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6 text-left">
                <div className="text-center">
                  <div className="h-20 w-20 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden shadow-lg border border-slate-200 dark:border-slate-800 mx-auto mb-4">
                    {opponent.avatar ? <img src={opponent.avatar} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center font-bold text-3xl text-slate-550 bg-indigo-500/10 text-indigo-500">{opponent.username?.charAt(0).toUpperCase()}</div>}
                  </div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white truncate">{opponent.username}</h3>
                  <div className="flex items-center justify-center gap-1.5 mt-1">
                    <div className={`h-2 w-2 rounded-full ${opponent.status === 'online' ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                    <span className="text-[10px] text-slate-500 font-bold capitalize">{opponent.status}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-400 mb-1">Status Biography</label>
                    <p className="text-xs text-slate-700 dark:text-slate-350 bg-slate-100/50 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-800/40 p-3 rounded-xl min-h-[60px] font-semibold leading-normal">
                      {opponent.bio || 'No status bio provided.'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-400 mb-1">Email Address</label>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-bold truncate">
                      {opponent.email}
                    </p>
                  </div>
                </div>

                {/* Block / Unblock Action Button */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800/40">
                  <button
                    onClick={() => handleToggleBlockUser(opponent._id)}
                    className={`w-full flex items-center justify-center gap-2 h-11 rounded-xl font-bold text-xs border transition-colors ${
                      user?.blockedUsers?.includes(opponent._id)
                        ? 'bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20'
                        : 'bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-white border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <Ban className="h-4 w-4" />
                    <span>{user?.blockedUsers?.includes(opponent._id) ? 'Unblock Contact' : 'Block Contact'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) })() : (
          <div className="h-full w-full flex flex-col justify-center items-center p-6 text-center">
            <div className="h-16 w-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6 shadow-xl shadow-indigo-500/5">
              <MessageSquare className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight text-white mb-2">SK Connect Web</h3>
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
        {createGroupOpen && (() => {
          const contactsList = chats
            .filter(c => !c.isGroup && !c.isCommunity)
            .map(c => c.participants.find(p => p._id !== (user?._id || user?.id) && p.id !== (user?._id || user?.id)))
            .filter((p): p is any => !!p)
            .filter((value, index, self) => self.findIndex(t => t._id === value._id) === index);

          return (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-6">
              <div className="w-full max-w-[400px] glass-panel rounded-3xl p-6 shadow-2xl space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                  <h3 className="font-bold text-lg text-white">Create Group</h3>
                  <button onClick={() => { setCreateGroupOpen(false); setIsBroadcastGroup(false); setGroupParticipants([]); }} className="text-slate-500 hover:text-white">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Group Room Name</label>
                    <input
                      type="text"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="e.g. Design Review Crew"
                      className="w-full h-10 rounded-xl text-xs font-semibold px-3 glass-input text-slate-850 dark:text-white"
                    />
                  </div>

                  {/* Broadcast Option */}
                  <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-white/5 dark:bg-slate-900/30 border border-slate-200/20 dark:border-slate-800/40">
                    <input
                      type="checkbox"
                      id="isBroadcastGroupCheckbox"
                      checked={isBroadcastGroup}
                      onChange={(e) => setIsBroadcastGroup(e.target.checked)}
                      className="h-4.5 w-4.5 mt-0.5 rounded border-slate-350 dark:border-slate-800 text-indigo-500 focus:ring-0 bg-transparent cursor-pointer"
                    />
                    <label htmlFor="isBroadcastGroupCheckbox" className="flex flex-col cursor-pointer select-none">
                      <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                        <Megaphone className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                        Broadcast Group
                      </span>
                      <span className="text-[10px] text-slate-550 dark:text-slate-400 mt-0.5 leading-normal">
                        Messages sent to this group will deliver as separate 1-on-1 private messages to each member.
                      </span>
                    </label>
                  </div>

                  {/* Member selection */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Select Members</label>
                    <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1 custom-scrollbar animate-fadeIn">
                      {contactsList.length > 0 ? (
                        contactsList.map((contact) => {
                          const isSelected = groupParticipants.includes(contact._id);
                          return (
                            <div 
                              key={contact._id} 
                              onClick={() => {
                                if (isSelected) {
                                  setGroupParticipants(groupParticipants.filter(id => id !== contact._id));
                                } else {
                                  setGroupParticipants([...groupParticipants, contact._id]);
                                }
                              }}
                              className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                                isSelected 
                                  ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-300' 
                                  : 'bg-transparent border-slate-200/60 dark:border-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-900/40 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="h-7 w-7 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden shrink-0">
                                  {contact.avatar ? <img src={contact.avatar} alt="" className="h-full w-full object-cover" /> : null}
                                </div>
                                <span className="text-xs font-bold truncate">{contact.username}</span>
                              </div>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                readOnly
                                className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-800 text-indigo-500 focus:ring-0 bg-transparent shrink-0 pointer-events-none"
                              />
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-[10px] text-slate-500 text-center py-4">No active direct contacts available to select</p>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCreateGroup}
                  className="w-full py-3 rounded-xl bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/10 hover:bg-indigo-600 transition-colors"
                >
                  Create Group
                </button>
              </div>
            </div>
          );
        })()}
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
                    className="w-full h-10 rounded-xl text-xs font-semibold px-3 glass-input text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Description</label>
                  <textarea
                    value={communityDesc}
                    onChange={(e) => setCommunityDesc(e.target.value)}
                    placeholder="Explain the purpose of this network..."
                    className="w-full min-h-[60px] rounded-xl text-xs font-semibold p-3 glass-input text-slate-800 dark:text-white"
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

      {/* 7. Rich Story Modal Overlay */}
      <AnimatePresence>
        {textStatusOpen && (
          <div className="fixed inset-0 bg-slate-950/95 flex items-center justify-center z-50 p-6">
            <div className="w-full max-w-[800px] bg-slate-900 border border-slate-800 rounded-[32px] overflow-hidden flex flex-col md:flex-row shadow-2xl relative">
              
              {/* Left Column: Live Preview */}
              <div 
                style={storyType === 'text' ? { backgroundColor: textStatusBg } : undefined}
                className="w-full md:w-[320px] aspect-[4/5] bg-slate-950 flex flex-col justify-between items-center p-6 relative border-r border-slate-800 shrink-0 overflow-hidden"
              >
                {storyType === 'media' && storyFileUrl ? (
                  storyFile?.type.startsWith('video') ? (
                    <video src={storyFileUrl} autoPlay loop muted className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <img src={storyFileUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  )
                ) : null}

                {/* Overlays preview on top of the slide */}
                <div className="w-full flex justify-between items-center z-10">
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-white/50">Story Preview</span>
                  {storyMusic.trim() && (
                    <span className="bg-black/60 text-amber-400 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      🎵 {storyMusic}
                    </span>
                  )}
                </div>

                {storyType === 'text' ? (
                  <textarea
                    value={textStatusContent}
                    onChange={(e) => setTextStatusContent(e.target.value)}
                    placeholder="Type your story message..."
                    className="w-full bg-transparent border-0 outline-none text-white text-lg font-black text-center placeholder:text-white/30 focus:ring-0 z-10"
                  />
                ) : (
                  <div className="flex-1" />
                )}

                {/* Dynamic Overlays Container */}
                <div className="w-full flex flex-col gap-2 z-10">
                  <div className="flex justify-between w-full">
                    {storyLocation.trim() && (
                      <span className="bg-indigo-600/80 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">📍 {storyLocation}</span>
                    )}
                    {storyMention.trim() && (
                      <span className="bg-pink-600/80 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">@{storyMention}</span>
                    )}
                  </div>

                  {storyPollQuestion.trim() && (
                    <div className="bg-white/10 backdrop-blur-sm border border-white/20 p-2.5 rounded-xl text-center text-white text-[10px]">
                      <p className="font-bold">{storyPollQuestion}</p>
                      <div className="flex gap-1.5 mt-1.5">
                        <button className="flex-1 py-1 bg-indigo-500/80 rounded font-bold">{storyPollOpt1 || 'Yes'}</button>
                        <button className="flex-1 py-1 bg-pink-500/80 rounded font-bold">{storyPollOpt2 || 'No'}</button>
                      </div>
                    </div>
                  )}

                  {storyQuestion.trim() && (
                    <div className="bg-white/10 backdrop-blur-sm border border-white/20 p-2.5 rounded-xl text-center text-white text-[10px] space-y-1">
                      <p className="font-bold uppercase tracking-wider text-indigo-300 text-[8px]">Ask me anything</p>
                      <p className="font-semibold">{storyQuestion}</p>
                    </div>
                  )}

                  {storyHashtags.trim() && (
                    <div className="flex gap-1 flex-wrap">
                      {storyHashtags.split(',').map((h, i) => (
                        <span key={i} className="text-[9px] bg-slate-900/60 text-white px-2 py-0.5 rounded-full font-bold">
                          {h.trim().startsWith('#') ? h.trim() : `#${h.trim()}`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Editing and Interactive Controls */}
              <div className="flex-1 flex flex-col justify-between p-6 space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-black text-slate-200 uppercase tracking-widest">Story Options</h3>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setStoryType('text')} 
                        className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-colors ${storyType === 'text' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'}`}
                      >
                        Text
                      </button>
                      <button 
                        onClick={() => setStoryType('media')} 
                        className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-colors ${storyType === 'media' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'}`}
                      >
                        Media
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 overflow-y-auto max-h-[320px] pr-1.5 custom-scrollbar">
                    {/* Media File selection */}
                    {storyType === 'media' && (
                      <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-2xl flex flex-col items-center gap-2">
                        <input 
                          type="file" 
                          ref={storyFileInputRef} 
                          className="hidden" 
                          accept="image/*,video/*" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setStoryFile(file);
                              setStoryFileUrl(URL.createObjectURL(file));
                            }
                          }}
                        />
                        <button 
                          onClick={() => storyFileInputRef.current?.click()} 
                          className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 font-bold text-xs rounded-xl"
                        >
                          Choose Image / Video
                        </button>
                        {storyFile && <span className="text-[10px] text-slate-500 truncate max-w-[200px]">{storyFile.name}</span>}
                      </div>
                    )}

                    {/* Background picker for text stories */}
                    {storyType === 'text' && (
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Background Colors</label>
                        <div className="flex gap-2">
                          {['#4f46e5', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#1e1b4b'].map((color) => (
                            <button
                              key={color}
                              onClick={() => setTextStatusBg(color)}
                              style={{ backgroundColor: color }}
                              className={`h-6 w-6 rounded-full border border-white/20 transition-transform ${textStatusBg === color ? 'scale-110 ring-2 ring-white/50' : ''}`}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Overlay Inputs */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-850">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">🎵 Background Music</label>
                        <input 
                          type="text" 
                          value={storyMusic}
                          onChange={(e) => setStoryMusic(e.target.value)}
                          placeholder="Song title..."
                          className="w-full h-8 rounded-lg text-xs font-semibold px-2.5 bg-slate-950 border border-slate-850 text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">📍 Add Location</label>
                        <input 
                          type="text" 
                          value={storyLocation}
                          onChange={(e) => setStoryLocation(e.target.value)}
                          placeholder="e.g. SF, CA..."
                          className="w-full h-8 rounded-lg text-xs font-semibold px-2.5 bg-slate-950 border border-slate-850 text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">👤 Mention User</label>
                        <input 
                          type="text" 
                          value={storyMention}
                          onChange={(e) => setStoryMention(e.target.value)}
                          placeholder="username..."
                          className="w-full h-8 rounded-lg text-xs font-semibold px-2.5 bg-slate-950 border border-slate-850 text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">🏷️ Hashtags</label>
                        <input 
                          type="text" 
                          value={storyHashtags}
                          onChange={(e) => setStoryHashtags(e.target.value)}
                          placeholder="vibes, coding..."
                          className="w-full h-8 rounded-lg text-xs font-semibold px-2.5 bg-slate-950 border border-slate-850 text-slate-200"
                        />
                      </div>
                    </div>

                    {/* Interactive widgets additions */}
                    <div className="pt-2 border-t border-slate-850 space-y-2.5">
                      <div>
                        <label className="block text-[9px] font-bold text-indigo-400 uppercase tracking-widest mb-1">📊 Create Poll Overlay</label>
                        <input 
                          type="text" 
                          value={storyPollQuestion}
                          onChange={(e) => setStoryPollQuestion(e.target.value)}
                          placeholder="Poll Question..."
                          className="w-full h-8 rounded-lg text-xs font-semibold px-2.5 bg-slate-950 border border-slate-850 text-slate-200 mb-1"
                        />
                        <div className="flex gap-1.5">
                          <input 
                            type="text" 
                            value={storyPollOpt1}
                            onChange={(e) => setStoryPollOpt1(e.target.value)}
                            placeholder="Option 1 (Yes)"
                            className="flex-1 h-8 rounded-lg text-[10px] px-2 bg-slate-950 border border-slate-850 text-slate-200"
                          />
                          <input 
                            type="text" 
                            value={storyPollOpt2}
                            onChange={(e) => setStoryPollOpt2(e.target.value)}
                            placeholder="Option 2 (No)"
                            className="flex-1 h-8 rounded-lg text-[10px] px-2 bg-slate-950 border border-slate-850 text-slate-200"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-pink-400 uppercase tracking-widest mb-1">❓ Ask a Question Overlay</label>
                        <input 
                          type="text" 
                          value={storyQuestion}
                          onChange={(e) => setStoryQuestion(e.target.value)}
                          placeholder="e.g. What should I cook today?"
                          className="w-full h-8 rounded-lg text-xs font-semibold px-2.5 bg-slate-950 border border-slate-850 text-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-850 shrink-0">
                  <button 
                    onClick={() => setTextStatusOpen(false)}
                    className="h-10 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handlePostStory}
                    className="h-10 px-5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs shadow-lg shadow-indigo-500/10"
                  >
                    Post Story
                  </button>
                </div>
              </div>
              
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
            {(() => {
              const currentStatus = activeStatusViewer[activeStatusIndex];
              let metadata: any = null;
              try {
                if (currentStatus.caption && currentStatus.caption.trim().startsWith('{')) {
                  metadata = JSON.parse(currentStatus.caption);
                }
              } catch (e) {}

              return (
                <div className="w-full max-w-[420px] aspect-[4/5] bg-slate-900 rounded-[32px] overflow-hidden flex flex-col justify-between items-center p-6 border border-white/10 relative">
                  {currentStatus.type === 'text' ? (
                    <div
                      style={{ backgroundColor: currentStatus.backgroundColor || '#4f46e5' }}
                      className="absolute inset-0 flex items-center justify-center p-6"
                    >
                      <p className="text-xl font-extrabold text-white text-center">{currentStatus.content}</p>
                    </div>
                  ) : (
                    currentStatus.type === 'video' ? (
                      <video src={currentStatus.content} autoPlay loop muted className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <img src={currentStatus.content} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    )
                  )}

                  {/* Top Bar: Creator Info & Analytics */}
                  <div className="w-full flex justify-between items-center z-20 bg-slate-950/40 backdrop-blur-sm p-3 rounded-2xl border border-white/5 absolute top-10 left-4 right-4 max-w-[calc(100%-32px)]">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-slate-800 overflow-hidden border border-white/20">
                        {currentStatus.userId.avatar && <img src={currentStatus.userId.avatar} alt="" className="h-full w-full object-cover" />}
                      </div>
                      <div>
                        <h4 className="text-[11px] font-bold text-white leading-none">{currentStatus.userId.username}</h4>
                        <p className="text-[8px] text-white/60 mt-0.5">{new Date(currentStatus.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-[9px] font-bold text-white/80" title="Views count">
                        <Eye className="h-3.5 w-3.5" />
                        {currentStatus.views?.length || 0}
                      </span>
                      <button 
                        onClick={() => handleLikeStory(currentStatus._id)}
                        className={`flex items-center gap-1 text-[9px] font-bold transition-colors ${
                          currentStatus.likes?.includes(user?._id as any) ? 'text-red-400' : 'text-white/80 hover:text-red-400'
                        }`}
                        title="React / Like"
                      >
                        <Star className="h-3.5 w-3.5" />
                        {currentStatus.likes?.length || 0}
                      </button>
                    </div>
                  </div>

                  {/* Float Overlays (Location, Mention, Music, Hashtags) */}
                  <div className="absolute top-26 left-4 right-4 z-20 flex flex-col gap-2 pointer-events-none">
                    <div className="flex justify-between w-full">
                      {metadata?.location && (
                        <span className="bg-indigo-600/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md shadow-lg">📍 {metadata.location}</span>
                      )}
                      {metadata?.mention && (
                        <span className="bg-pink-600/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md shadow-lg">@{metadata.mention}</span>
                      )}
                    </div>

                    {metadata?.music && (
                      <div className="self-end bg-black/70 text-amber-400 text-[8px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 backdrop-blur-md shadow-lg animate-pulse">
                        🎵 {metadata.music}
                      </div>
                    )}
                  </div>

                  {/* Interactive Widget overlay (Poll / Questions / Slider) */}
                  <div className="absolute top-1/2 left-6 right-6 -translate-y-1/2 z-20 space-y-3">
                    {metadata?.poll && (
                      <div className="bg-black/60 backdrop-blur-md border border-white/10 p-3.5 rounded-2xl text-center text-white">
                        <p className="font-bold text-[11px] mb-2">{metadata.poll.question}</p>
                        <div className="flex gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); alert('Option 1 Voted! 73% yes'); }}
                            className="flex-1 py-1.5 bg-indigo-500 hover:bg-indigo-650 rounded-xl font-bold text-[10px]"
                          >
                            {metadata.poll.opt1}
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); alert('Option 2 Voted! 27% no'); }}
                            className="flex-1 py-1.5 bg-pink-500 hover:bg-pink-650 rounded-xl font-bold text-[10px]"
                          >
                            {metadata.poll.opt2}
                          </button>
                        </div>
                      </div>
                    )}

                    {metadata?.question && (
                      <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3.5 rounded-2xl text-center text-white space-y-2">
                        <p className="font-extrabold uppercase tracking-widest text-indigo-300 text-[8px]">Ask me anything</p>
                        <p className="font-semibold text-xs">{metadata.question.text}</p>
                        <div className="bg-black/30 border border-white/10 rounded-xl p-1.5 flex gap-2 items-center">
                          <input 
                            type="text" 
                            placeholder="Type an answer..." 
                            className="flex-1 bg-transparent border-0 outline-none text-[10px] text-white focus:ring-0 px-2"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button 
                            onClick={(e) => { e.stopPropagation(); alert('Answer submitted!'); }} 
                            className="bg-white text-slate-900 text-[8px] font-bold px-2 py-1 rounded-lg"
                          >
                            Reply
                          </button>
                        </div>
                      </div>
                    )}

                    {metadata?.emojiSlider && (
                      <div className="bg-black/50 backdrop-blur-md p-2.5 rounded-2xl flex items-center gap-3 border border-white/10">
                        <span className="text-base">{metadata.emojiSlider.target || '🔥'}</span>
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          defaultValue={50} 
                          className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    )}
                  </div>

                  {/* Caption & Hashtags bottom overlay */}
                  <div className="absolute bottom-16 left-4 right-4 z-20 space-y-1.5 text-center pointer-events-none">
                    {metadata?.hashtags && (
                      <div className="flex gap-1.5 justify-center flex-wrap">
                        {metadata.hashtags.map((h: string, i: number) => (
                          <span key={i} className="text-[9px] bg-slate-950/80 text-white px-2 py-0.5 rounded-full font-bold">
                            {h}
                          </span>
                        ))}
                      </div>
                    )}
                    {(!metadata && currentStatus.caption) ? (
                      <div className="bg-slate-950/70 backdrop-blur-sm p-2 rounded-xl text-[10px] font-semibold text-white">
                        {currentStatus.caption}
                      </div>
                    ) : null}
                  </div>

                  {/* Active Slide Reply Drawer */}
                  <div className="absolute bottom-4 left-4 right-4 z-20 flex gap-2">
                    <input
                      type="text"
                      placeholder="Reply to story..."
                      value={storyReplyText}
                      onChange={(e) => setStoryReplyText(e.target.value)}
                      className="flex-1 h-9 rounded-xl text-xs font-semibold px-3 bg-white/15 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/30"
                    />
                    <button 
                      onClick={handleReplyToStory}
                      className="h-9 px-3 rounded-xl bg-white text-slate-900 text-xs font-bold hover:bg-slate-100 shrink-0 transition-colors"
                    >
                      Send
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
