import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { useChatStore } from '../store/chatStore.js';
import { useCallStore } from '../store/callStore.js';
import { useThemeStore } from '../store/themeStore.js';
import { useNotificationStore } from '../store/notificationStore.js';
import { useConnectionsStore } from '../store/connectionsStore.js';
import { useSocket } from '../hooks/useSocket.js';
import { useWebRTC } from '../hooks/useWebRTC.js';
import { apiClient } from '../api/client.js';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Video, Phone, Settings, User as UserIcon, LogOut, Search, Plus, Send,
  Paperclip, MoreVertical, X, Check, CheckCheck, Smile, Star, Trash2, Edit2, CornerUpLeft,
  Pin, Shield, Mic, HelpCircle, Share2, BarChart2, ShieldAlert, Trash, PlusCircle, Globe,
  Compass, Eye, Play, Sparkles, Languages, FileText, MapPin, PhoneMissed, Volume2, VideoOff,
  UserX, CheckCircle, Ban, Download, Copy, Megaphone, Bell, Users, UserPlus, UserCheck, VolumeX
} from 'lucide-react';
import { Chat, Message, User, Status, Call, DeviceSession, Community } from '../types/index.js';
import { StoryCreatorModal } from '../components/StoryCreatorModal.tsx';
import { StoryViewerModal } from '../components/StoryViewerModal.tsx';
import { NotificationPanel, NotificationBell } from '../components/NotificationPanel.tsx';

const wallpaperClasses: { [key: string]: string } = {
  'gradient-mesh': 'bg-white dark:bg-slate-950',
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
  const { addIncomingNotification, requestBrowserPermission } = useNotificationStore();

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
  const [isNotifPanelOpen, setIsNotifPanelOpen] = useState(false);

  // Call Recording, Background Blur, Captions, Hand Raising, Waiting Room States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isBgBlurActive, setIsBgBlurActive] = useState(false);
  const [isNoiseCancellationActive, setIsNoiseCancellationActive] = useState(false);
  const [isCaptioningActive, setIsCaptioningActive] = useState(false);
  const [liveCaptions, setLiveCaptions] = useState<string[]>([]);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isWaitingRoom, setIsWaitingRoom] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);

  const startCallRecording = () => {
    const stream = callStore.localStream || callStore.remoteStream;
    if (!stream) return;
    recordedChunksRef.current = [];
    try {
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `call-recording-${Date.now()}.webm`;
        a.click();
      };
      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);
    } catch (err) {
      console.error('Recording failed:', err);
    }
  };

  const stopCallRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
  };

  const startSpeechTranscription = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result) => result.transcript)
        .join('');
      setLiveCaptions([transcript]);
    };
    
    recognition.start();
    setIsCaptioningActive(true);
  };

  const stopSpeechTranscription = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsCaptioningActive(false);
    setLiveCaptions([]);
  };

  const formatRecordingDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const { socket, emitEvent } = useSocket();
  const {
    makeCall, answerCall, rejectCall, handleIceCandidate, handleCallAccepted,
    startScreenShare, stopScreenShare, hangUp
  } = useWebRTC(emitEvent);

  // Active Main Sidebar Tab
  const [activeTab, setActiveTab] = useState<'chats' | 'status' | 'calls' | 'communities' | 'settings' | 'profile' | 'admin' | 'connections'>('chats');
  const [connectionsSubTab, setConnectionsSubTab] = useState<'friends' | 'requests' | 'discover' | 'privacy'>('friends');
  const [connectionsSearchQuery, setConnectionsSearchQuery] = useState('');
  const [connectionsSearchResults, setConnectionsSearchResults] = useState<any[]>([]);
  const [isSearchingConnections, setIsSearchingConnections] = useState(false);

  const handleConnectionsSearch = async (val: string) => {
    setConnectionsSearchQuery(val);
    if (!val.trim()) {
      setConnectionsSearchResults([]);
      return;
    }
    setIsSearchingConnections(true);
    try {
      const resp = await apiClient.get(`/users/search?q=${encodeURIComponent(val)}`);
      setConnectionsSearchResults(resp.data.users);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearchingConnections(false);
    }
  };

  const connStore = useConnectionsStore();
  
  // Group Info Sidebar & Invite States
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [isEditingGroupProfile, setIsEditingGroupProfile] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDesc, setEditGroupDesc] = useState('');
  const [editGroupFile, setEditGroupFile] = useState<File | null>(null);
  const [groupSharedMedia, setGroupSharedMedia] = useState<any[]>([]);
  const [groupSharedFiles, setGroupSharedFiles] = useState<any[]>([]);
  const [activeCommunity, setActiveCommunity] = useState<any>(null);
  const [communityRequests, setCommunityRequests] = useState<any[]>([]);
  const [isEditingCommunity, setIsEditingCommunity] = useState(false);
  const [editCommName, setEditCommName] = useState('');
  const [editCommDesc, setEditCommDesc] = useState('');
  const [editCommPrivacy, setEditCommPrivacy] = useState<'public' | 'private'>('public');
  const [editCommWelcome, setEditCommWelcome] = useState('');
  const [editCommRules, setEditCommRules] = useState('');
  const [inviteLinks, setInviteLinks] = useState<{ publicLink: string; privateLink: string } | null>(null);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [copiedLink, setCopiedLink] = useState<'public' | 'private' | null>(null);

  // Reset group info when active chat changes
  useEffect(() => {
    setIsGroupInfoOpen(false);
    setInviteLinks(null);
    setCopiedLink(null);
    setActiveCommunity(null);
    setCommunityRequests([]);
    setIsEditingCommunity(false);
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
  
  // Voice Message Recording details (separate from call recording)
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [voiceMediaRecorder, setVoiceMediaRecorder] = useState<MediaRecorder | null>(null);
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

  // Fetch group media/files when sidebar is opened
  useEffect(() => {
    if (isGroupInfoOpen && activeChat?.isGroup) {
      apiClient.get(`/chats/${activeChat._id}/media`)
        .then(res => setGroupSharedMedia(res.data.media))
        .catch(e => console.error(e));
      apiClient.get(`/chats/${activeChat._id}/files`)
        .then(res => setGroupSharedFiles(res.data.files))
        .catch(e => console.error(e));
    }
  }, [isGroupInfoOpen, activeChat]);

  // Fetch connections lists on Tab change
  useEffect(() => {
    if (activeTab === 'connections') {
      connStore.fetchFriends();
      connStore.fetchRequests();
      connStore.fetchDiscovery();
      connStore.fetchBlocked();
      connStore.fetchMuted();
    }
  }, [activeTab]);

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

  // Bind WebRTC socket triggers & real-time notification events
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
      // Real-time notification push
      socket.on('notification:new', (notif) => {
        addIncomingNotification(notif);
      });
    }
    // Request browser notification permission on first mount
    requestBrowserPermission();

    return () => {
      if (socket) {
        socket.off('notification:new');
      }
    };
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

  const handleLeaveGroup = async () => {
    if (!activeChat) return;
    if (!confirm('Are you sure you want to leave this group?')) return;
    try {
      await apiClient.post(`/chats/${activeChat._id}/leave`);
      setActiveChat(null);
      fetchChats();
      setIsGroupInfoOpen(false);
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to leave group');
    }
  };

  const handleRemoveGroupMember = async (userId: string) => {
    if (!activeChat) return;
    if (!confirm('Remove this member from the group?')) return;
    try {
      const resp = await apiClient.delete(`/chats/${activeChat._id}/members/${userId}`);
      setActiveChat(resp.data.chat);
      fetchChats();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleAddGroupMember = async (userId: string) => {
    if (!activeChat) return;
    try {
      const resp = await apiClient.post(`/chats/${activeChat._id}/members`, { userId });
      setActiveChat(resp.data.chat);
      fetchChats();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to add member');
    }
  };

  const handlePromoteMember = async (userId: string, targetRole: 'admin' | 'moderator' | 'member') => {
    if (!activeChat) return;
    try {
      let admins = activeChat.admins?.map((a: any) => typeof a === 'string' ? a : a._id) || [];
      let moderators = activeChat.moderators?.map((m: any) => typeof m === 'string' ? m : m._id) || [];

      if (targetRole === 'admin') {
        admins = [...new Set([...admins, userId])];
        moderators = moderators.filter((id: string) => id !== userId);
      } else if (targetRole === 'moderator') {
        moderators = [...new Set([...moderators, userId])];
        admins = admins.filter((id: string) => id !== userId);
      } else {
        admins = admins.filter((id: string) => id !== userId);
        moderators = moderators.filter((id: string) => id !== userId);
      }

      const resp = await apiClient.patch(`/chats/${activeChat._id}/settings`, { admins, moderators });
      setActiveChat(resp.data.chat);
      fetchChats();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to promote member');
    }
  };

  const handleUpdateGroupProfile = async (name: string, description: string, file?: File) => {
    if (!activeChat) return;
    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    if (file) {
      formData.append('avatar', file);
    }
    try {
      const resp = await apiClient.put(`/chats/${activeChat._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setActiveChat(resp.data.chat);
      fetchChats();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to update group profile');
    }
  };

  const fetchActiveCommunity = async () => {
    if (!activeChat?.communityId) return;
    try {
      const resp = await apiClient.get('/community');
      const commId = activeChat.communityId;
      const target = resp.data.communities.find((c: any) => c._id === commId);
      if (target) {
        setActiveCommunity(target);
        const isAdm = target.admins.some((a: any) => (typeof a === 'string' ? a === user?._id : a._id === user?._id));
        const isCre = target.creatorId === user?._id;
        if (isAdm || isCre) {
          const reqs = await apiClient.get(`/community/${target._id}/requests`);
          setCommunityRequests(reqs.data.requests);
        }
      }
    } catch (e) {
      console.error('Failed to fetch active community:', e);
    }
  };

  const handleUpdateCommunity = async (name: string, description: string, privacyType: string, welcomeMessage: string, guidelines: string, avatarFile?: File, bannerFile?: File) => {
    if (!activeCommunity) return;
    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('privacyType', privacyType);
    formData.append('welcomeMessage', welcomeMessage);
    formData.append('guidelines', guidelines);
    if (avatarFile) formData.append('avatar', avatarFile);
    if (bannerFile) formData.append('banner', bannerFile);

    try {
      const resp = await apiClient.put(`/community/${activeCommunity._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setActiveCommunity(resp.data.community);
      fetchCommunities();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to update community settings');
    }
  };

  const handleLeaveCommunity = async () => {
    if (!activeCommunity) return;
    if (!confirm('Are you sure you want to leave this community? All community channels will be removed.')) return;
    try {
      await apiClient.delete(`/community/${activeCommunity._id}/leave`);
      setActiveCommunity(null);
      setActiveChat(null);
      fetchCommunities();
      setIsGroupInfoOpen(false);
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to leave community');
    }
  };

  const handleActionJoinRequest = async (requestId: string, action: 'accept' | 'reject') => {
    if (!activeCommunity) return;
    try {
      await apiClient.post(`/community/requests/${requestId}`, { action });
      const reqs = await apiClient.get(`/community/${activeCommunity._id}/requests`);
      setCommunityRequests(reqs.data.requests);
      fetchActiveCommunity();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to process request');
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
      const resp = await apiClient.post('/community/join-request', {
        inviteCode: joinCommunityCode
      });
      setJoinCommunityCode('');
      fetchCommunities();
      alert(resp.data.message);
    } catch (e: any) {
      alert(e.response?.data?.message || 'Could not request to join community.');
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
      setVoiceMediaRecorder(recorder);
      setIsVoiceRecording(true);
    } catch (err) {
      alert('Could not record voice. Check microphone authorizations.');
    }
  };

  const stopRecording = () => {
    if (voiceMediaRecorder && isVoiceRecording) {
      voiceMediaRecorder.stop();
      setIsVoiceRecording(false);
      voiceMediaRecorder.stream.getTracks().forEach((track) => track.stop());
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
        <div className="p-4.5 pb-3 border-b border-slate-200 dark:border-slate-800/40 flex items-center justify-between bg-white/30 dark:bg-slate-900/30">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-sm font-black tracking-tighter text-white">SK</span>
            </div>
            <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-200 dark:to-purple-300">SK Connect</span>
          </div>
          <NotificationBell onClick={() => setIsNotifPanelOpen((p) => !p)} />
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

        {/* Tab 8: Connections Panel */}
        {activeTab === 'connections' && (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800/40">
              <h2 className="text-xl font-bold mb-3 tracking-tight">People</h2>
              
              {/* Sub tabs switches */}
              <div className="flex gap-1.5 p-1 bg-slate-100/80 dark:bg-slate-900/60 rounded-xl">
                {[
                  { id: 'friends', label: 'Friends' },
                  { id: 'requests', label: 'Requests' },
                  { id: 'discover', label: 'Discover' },
                  { id: 'privacy', label: 'Privacy' }
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setConnectionsSubTab(st.id as any)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      connectionsSubTab === st.id
                        ? 'bg-white dark:bg-slate-850 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/50 dark:border-slate-800/50'
                        : 'text-slate-500 dark:text-slate-450 hover:text-slate-800 dark:hover:text-slate-350'
                    }`}
                  >
                    {st.id === 'requests' && (connStore.incomingRequests.length > 0) ? (
                      <span className="flex items-center justify-center gap-1">
                        {st.label}
                        <span className="bg-indigo-600 text-white text-[9px] h-4 min-w-4 px-1 rounded-full flex items-center justify-center font-bold">
                          {connStore.incomingRequests.length}
                        </span>
                      </span>
                    ) : st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List area */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {connStore.isLoading && (
                <div className="flex items-center justify-center h-48">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
                </div>
              )}

              {!connStore.isLoading && (
                <>
                  {/* FRIENDS SUBTAB */}
                  {connectionsSubTab === 'friends' && (
                    <div className="space-y-3">
                      {connStore.friends.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 dark:text-slate-455">
                          <Users className="h-10 w-10 mx-auto mb-3 text-slate-400 dark:text-slate-500 opacity-60 animate-pulse-slow" />
                          <p className="text-sm font-semibold">No friends yet</p>
                          <p className="text-xs text-slate-500 mt-1">Explore the Discover tab to find new connections!</p>
                        </div>
                      ) : (
                        connStore.friends.map((friend: any) => (
                          <div
                            key={friend._id}
                            onClick={() => {
                              const existingChat = chats.find(c => !c.isGroup && !c.isCommunity && c.participants.some(p => p._id === friend._id));
                              if (existingChat) {
                                setActiveChat(existingChat);
                                setActiveTab('chats');
                              } else {
                                handleStartDirectChat(friend);
                              }
                            }}
                            className="p-3 bg-white/40 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/40 rounded-2xl hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-all flex items-center justify-between cursor-pointer group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                  {friend.avatar ? <img src={friend.avatar} alt="" className="h-full w-full object-cover" /> : null}
                                </div>
                                <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-900 ${friend.status === 'online' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{friend.username}</p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-450">{friend.mutualFriends || 0} mutual friends</p>
                              </div>
                            </div>

                            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => connStore.muteUserToggle(friend._id)}
                                className={`p-1.5 rounded-lg border transition-colors ${
                                  connStore.mutedUsers.some(m => m._id === friend._id)
                                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-450'
                                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-400'
                                }`}
                                title={connStore.mutedUsers.some(m => m._id === friend._id) ? 'Unmute User' : 'Mute User'}
                              >
                                <VolumeX className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => connStore.blockUserToggle(friend._id)}
                                className="p-1.5 rounded-lg hover:bg-red-500/10 border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-red-500 transition-colors"
                                title="Block User"
                              >
                                <Ban className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Are you sure you want to remove this friend?')) {
                                    connStore.removeFriend(friend._id);
                                  }
                                }}
                                className="p-1.5 rounded-lg hover:bg-red-500/10 border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-red-500 transition-colors"
                                title="Remove Friend"
                              >
                                <UserX className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* REQUESTS SUBTAB */}
                  {connectionsSubTab === 'requests' && (
                    <div className="space-y-4">
                      {/* Incoming Requests */}
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2 px-1">Incoming Requests ({connStore.incomingRequests.length})</span>
                        {connStore.incomingRequests.length === 0 ? (
                          <p className="text-xs text-slate-550 dark:text-slate-400 italic px-1">No incoming pending request</p>
                        ) : (
                          <div className="space-y-2">
                            {connStore.incomingRequests.map((req: any) => (
                              <div key={req._id} className="p-3 bg-white/40 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/40 rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                    {req.senderId?.avatar ? <img src={req.senderId.avatar} alt="" className="h-full w-full object-cover" /> : null}
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{req.senderId?.username}</p>
                                    <p className="text-[10px] text-slate-500">{req.senderId?.bio}</p>
                                  </div>
                                </div>
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => connStore.acceptRequest(req._id)}
                                    className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] rounded-lg shadow-sm transition-colors"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => connStore.rejectRequest(req._id)}
                                    className="px-2.5 py-1 bg-slate-200 dark:bg-slate-850 hover:bg-slate-300 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-350 font-bold text-[10px] rounded-lg transition-colors"
                                  >
                                    Ignore
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Outgoing Requests */}
                      <div className="pt-2">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2 px-1">Sent Requests ({connStore.outgoingRequests.length})</span>
                        {connStore.outgoingRequests.length === 0 ? (
                          <p className="text-xs text-slate-550 dark:text-slate-400 italic px-1">No sent request pending</p>
                        ) : (
                          <div className="space-y-2">
                            {connStore.outgoingRequests.map((req: any) => (
                              <div key={req._id} className="p-3 bg-white/40 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/40 rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                    {req.receiverId?.avatar ? <img src={req.receiverId.avatar} alt="" className="h-full w-full object-cover" /> : null}
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{req.receiverId?.username}</p>
                                    <p className="text-[10px] text-slate-500">{req.receiverId?.bio}</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => connStore.cancelRequest(req._id)}
                                  className="px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-500 font-bold text-[10px] rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* DISCOVER SUBTAB */}
                  {connectionsSubTab === 'discover' && (
                    <div className="space-y-4">
                      {/* Search box */}
                      <div className="relative mb-2">
                        <input
                          type="text"
                          placeholder="Search users to add..."
                          value={connectionsSearchQuery}
                          onChange={(e) => handleConnectionsSearch(e.target.value)}
                          className="w-full h-10 pl-10 pr-4 rounded-xl text-xs font-medium glass-input text-slate-800 dark:text-white placeholder:text-slate-500"
                        />
                        <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                      </div>

                      {connectionsSearchQuery ? (
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2 px-1">Search Results</span>
                          {isSearchingConnections ? (
                            <div className="flex justify-center py-6">
                              <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
                            </div>
                          ) : connectionsSearchResults.length === 0 ? (
                            <p className="text-xs text-slate-550 dark:text-slate-400 italic px-1">No users found matching "{connectionsSearchQuery}"</p>
                          ) : (
                            <div className="space-y-2">
                              {connectionsSearchResults.map((usr: any) => {
                                const isFriend = connStore.friends.some(f => f._id === usr._id);
                                const isPendingOutgoing = connStore.outgoingRequests.some(o => o.receiverId?._id === usr._id || o.receiverId === usr._id);
                                const incomingReq = connStore.incomingRequests.find(i => i.senderId?._id === usr._id || i.senderId === usr._id);

                                return (
                                  <div key={usr._id} className="p-3 bg-white/40 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/40 rounded-2xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                        {usr.avatar ? <img src={usr.avatar} alt="" className="h-full w-full object-cover" /> : null}
                                      </div>
                                      <div>
                                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{usr.username}</p>
                                        <p className="text-[10px] text-slate-555 dark:text-slate-450 truncate max-w-[150px]">{usr.bio || 'No bio yet'}</p>
                                      </div>
                                    </div>
                                    
                                    {isFriend ? (
                                      <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                        Friends
                                      </span>
                                    ) : isPendingOutgoing ? (
                                      <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400">
                                        Sent
                                      </span>
                                    ) : incomingReq ? (
                                      <button
                                        onClick={() => connStore.acceptRequest(incomingReq._id)}
                                        className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] rounded-lg shadow-sm transition-colors animate-pulse"
                                      >
                                        Accept
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => connStore.sendRequest(usr._id)}
                                        className="px-2.5 py-1 bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-[10px] rounded-lg shadow-sm shadow-indigo-500/10 transition-all flex items-center gap-1"
                                      >
                                        <UserPlus className="h-3 w-3" /> Connect
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          {/* Suggested */}
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2 px-1">Suggested Users</span>
                            {connStore.suggestedUsers.length === 0 ? (
                              <p className="text-xs text-slate-550 dark:text-slate-400 italic px-1">No suggestions available</p>
                            ) : (
                              <div className="space-y-2">
                                {connStore.suggestedUsers.map((su: any) => {
                                  const sent = connStore.outgoingRequests.some(o => o.receiverId?._id === su._id);
                                  return (
                                    <div key={su._id} className="p-3 bg-white/40 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/40 rounded-2xl flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                          {su.avatar ? <img src={su.avatar} alt="" className="h-full w-full object-cover" /> : null}
                                        </div>
                                        <div>
                                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{su.username}</p>
                                          <p className="text-[10px] text-slate-500">{su.mutualFriends || 0} mutual friends</p>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => !sent && connStore.sendRequest(su._id)}
                                        disabled={sent}
                                        className={`px-2.5 py-1 text-[10px] font-bold rounded-lg shadow-sm transition-all flex items-center gap-1 ${
                                          sent 
                                            ? 'bg-slate-105 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                            : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-indigo-500/10'
                                        }`}
                                      >
                                        {sent ? 'Sent' : <><UserPlus className="h-3 w-3" /> Connect</>}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Recently Joined */}
                          <div className="pt-2">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2 px-1">Recently Joined</span>
                            {connStore.recentlyJoined.length === 0 ? (
                              <p className="text-xs text-slate-550 dark:text-slate-400 italic px-1">No recently joined users</p>
                            ) : (
                              <div className="space-y-2">
                                {connStore.recentlyJoined.map((ru: any) => {
                                  const sent = connStore.outgoingRequests.some(o => o.receiverId?._id === ru._id);
                                  return (
                                    <div key={ru._id} className="p-3 bg-white/40 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/40 rounded-2xl flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                          {ru.avatar ? <img src={ru.avatar} alt="" className="h-full w-full object-cover" /> : null}
                                        </div>
                                        <div>
                                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{ru.username}</p>
                                          <p className="text-[10px] text-slate-500 dark:text-slate-450 truncate max-w-[150px]">{ru.bio}</p>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => !sent && connStore.sendRequest(ru._id)}
                                        disabled={sent}
                                        className={`px-2.5 py-1 text-[10px] font-bold rounded-lg shadow-sm transition-all flex items-center gap-1 ${
                                          sent 
                                            ? 'bg-slate-105 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                            : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-indigo-500/10'
                                        }`}
                                      >
                                        {sent ? 'Sent' : <><UserPlus className="h-3 w-3" /> Connect</>}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* PRIVACY SUBTAB */}
                  {connectionsSubTab === 'privacy' && (
                    <div className="space-y-4">
                      {/* Blocked Users list */}
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2 px-1">Blocked Users ({connStore.blockedUsers.length})</span>
                        {connStore.blockedUsers.length === 0 ? (
                          <p className="text-xs text-slate-550 dark:text-slate-400 italic px-1">No blocked user</p>
                        ) : (
                          <div className="space-y-2">
                            {connStore.blockedUsers.map((bu: any) => (
                              <div key={bu._id} className="p-3 bg-white/40 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/40 rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                    {bu.avatar ? <img src={bu.avatar} alt="" className="h-full w-full object-cover" /> : null}
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{bu.username}</p>
                                    <p className="text-[10px] text-slate-500">{bu.bio}</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => connStore.blockUserToggle(bu._id)}
                                  className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] rounded-lg hover:bg-emerald-500 hover:text-white transition-colors"
                                >
                                  Unblock
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Muted Users list */}
                      <div className="pt-2">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2 px-1">Muted Users ({connStore.mutedUsers.length})</span>
                        {connStore.mutedUsers.length === 0 ? (
                          <p className="text-xs text-slate-550 dark:text-slate-400 italic px-1">No muted user</p>
                        ) : (
                          <div className="space-y-2">
                            {connStore.mutedUsers.map((mu: any) => (
                              <div key={mu._id} className="p-3 bg-white/40 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/40 rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                    {mu.avatar ? <img src={mu.avatar} alt="" className="h-full w-full object-cover" /> : null}
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-slate-850 dark:text-slate-200">{mu.username}</p>
                                    <p className="text-[10px] text-slate-500">{mu.bio}</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => connStore.muteUserToggle(mu._id)}
                                  className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-[10px] rounded-lg hover:bg-amber-500 hover:text-white transition-colors"
                                >
                                  Unmute
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

          {/* Integrated Bottom Navigation Bar (Previously left sidebar) */}
          <nav className="h-15 border-t border-slate-200 dark:border-slate-800/40 bg-white/60 dark:bg-slate-950/60 backdrop-blur-md flex items-center justify-around px-2 py-1.5 shrink-0 z-10">
            {[
              { id: 'chats', label: 'Chats', icon: MessageSquare },
              { id: 'connections', label: 'People', icon: Users },
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
            <div className="flex-1 overflow-y-auto px-12 py-6 space-y-7 custom-scrollbar">
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
                      className={`flex flex-col gap-2 max-w-[82%] ${isMe ? 'self-end ml-auto items-end' : 'items-start'}`}
                    >
                      {activeChat.isGroup && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-500">{senderName}</span>
                        </div>
                      )}

                      <div
                        className={`pl-5 pr-14 pt-3.5 pb-4 rounded-2xl relative group shadow-sm transition-all duration-200 ${
                          isMe 
                            ? 'bg-slate-100 dark:bg-gradient-to-br dark:from-indigo-500 dark:to-indigo-650 text-slate-900 dark:text-white rounded-tr-none border border-slate-250 dark:border-transparent' 
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 rounded-tl-none'
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
                              ? 'bg-white dark:bg-white/10 hover:bg-slate-50 dark:hover:bg-white/15 border-slate-200 dark:border-white/20 text-slate-900 dark:text-white' 
                              : 'bg-slate-50 dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <div className={`p-2 rounded-xl shrink-0 ${
                              isMe ? 'bg-indigo-50 dark:bg-white/20 text-indigo-500 dark:text-white' : 'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400'
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
                      {/* Absolute inline timestamp inside bubble */}
                      <div className={`absolute bottom-1 right-2 flex gap-1 items-center text-[9px] font-semibold select-none leading-none opacity-80 ${
                        isMe ? 'text-slate-500 dark:text-slate-350' : 'text-slate-500 dark:text-slate-400'
                      }`}>
                        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                        {isMe && (
                          <span>
                            {msg.status === 'seen' ? (
                              <CheckCheck className="h-3 w-3 text-indigo-500 dark:text-indigo-400" />
                            ) : (
                              <Check className="h-3 w-3 text-slate-400 dark:text-slate-550" />
                            )}
                          </span>
                        )}
                      </div>
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
                    onClick={isVoiceRecording ? stopRecording : startRecording}
                    className={`absolute right-3 top-3 transition-colors ${isVoiceRecording ? 'text-red-500' : 'text-slate-500 hover:text-slate-300'}`}
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
          {isGroupInfoOpen && activeChat.isGroup && !activeChat.isCommunity && (
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
                {isEditingGroupProfile ? (
                  <div className="space-y-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-left">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Edit Group Details</h4>
                    <div className="space-y-2">
                      <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-400">Group Name</label>
                      <input
                        type="text"
                        value={editGroupName}
                        onChange={(e) => setEditGroupName(e.target.value)}
                        className="w-full h-9 rounded-lg text-xs px-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-400">Description</label>
                      <textarea
                        value={editGroupDesc}
                        onChange={(e) => setEditGroupDesc(e.target.value)}
                        className="w-full min-h-[60px] text-xs p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 outline-none resize-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-400">Group Icon</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setEditGroupFile(e.target.files?.[0] || null)}
                        className="text-xs text-slate-500"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={async () => {
                          await handleUpdateGroupProfile(editGroupName, editGroupDesc, editGroupFile || undefined);
                          setIsEditingGroupProfile(false);
                          setEditGroupFile(null);
                        }}
                        className="flex-1 py-1.5 bg-indigo-500 hover:bg-indigo-650 text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingGroupProfile(false);
                          setEditGroupFile(null);
                        }}
                        className="flex-1 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center relative group">
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-indigo-500/10 mx-auto mb-4 border-2 border-white dark:border-slate-800">
                      {activeChat.avatar ? <img src={activeChat.avatar} alt="" className="h-full w-full rounded-full object-cover" /> : (activeChat.name?.charAt(0) || 'G')}
                    </div>
                    <h3 className="text-base font-bold text-slate-850 dark:text-white truncate">{activeChat.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">{activeChat.description || 'No group description provided.'}</p>
                    
                    {(() => {
                      const isOwner = activeChat.creatorId === user?._id || activeChat.ownerId === user?._id;
                      const isAdmin = activeChat.admins?.some((adm: any) => (typeof adm === 'string' ? adm === user?._id : adm._id === user?._id));
                      if (isOwner || isAdmin) {
                        return (
                          <button
                            onClick={() => {
                              setEditGroupName(activeChat.name || '');
                              setEditGroupDesc(activeChat.description || '');
                              setIsEditingGroupProfile(true);
                            }}
                            className="mt-3 py-1 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold rounded-lg transition-colors border border-slate-200 dark:border-slate-800"
                          >
                            Edit Profile
                          </button>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}

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

                {/* Add Member Block */}
                {(() => {
                  const isOwner = activeChat.creatorId === user?._id || activeChat.ownerId === user?._id;
                  const isAdmin = activeChat.admins?.some((adm: any) => (typeof adm === 'string' ? adm === user?._id : adm._id === user?._id));
                  if (!isOwner && !isAdmin) return null;

                  const addableFriends = connStore.friends.filter(f => !activeChat.participants.some(p => p._id === f._id));
                  if (addableFriends.length === 0) return null;

                  return (
                    <div className="p-3 bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/10 dark:border-indigo-500/20 rounded-2xl text-left space-y-2">
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                        <UserPlus className="h-3.5 w-3.5" /> Add Direct Members
                      </span>
                      <div className="max-h-24 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                        {addableFriends.map(f => (
                          <div key={f._id} className="flex items-center justify-between text-xs">
                            <span className="truncate text-slate-800 dark:text-slate-200 font-semibold">{f.username}</span>
                            <button
                              onClick={() => handleAddGroupMember(f._id)}
                              className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[9px] rounded-lg transition-colors"
                            >
                              Add
                            </button>
                          </div>
                        ))}
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
                      
                      const isMe = member._id === (user?._id || user?.id);
                      const myRole = activeChat.creatorId === user?._id || activeChat.ownerId === user?._id
                        ? 'owner'
                        : activeChat.admins?.some((adm: any) => (typeof adm === 'string' ? adm === user?._id : adm._id === user?._id))
                          ? 'admin'
                          : 'member';

                      return (
                        <div key={member._id} className="flex items-center justify-between gap-3 group/member p-1.5 rounded-xl hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-850 overflow-hidden border border-slate-200 dark:border-slate-850 shrink-0">
                              {member.avatar ? (
                                <img src={member.avatar} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center font-bold text-xs text-slate-500 bg-indigo-500/10 text-indigo-500">
                                  {member.username?.charAt(0).toUpperCase() || 'U'}
                                </div>
                              )}
                            </div>
                            <div className="text-left min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-250 truncate">{member.username}</span>
                                {isOwner && <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 leading-none">Owner</span>}
                                {!isOwner && isAdmin && <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 leading-none">Admin</span>}
                                {!isOwner && !isAdmin && isMod && <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 leading-none">Mod</span>}
                                {!isOwner && !isAdmin && !isMod && <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-500 leading-none">Member</span>}
                              </div>
                              <p className="text-[9px] text-slate-500 truncate capitalize">{member.bio || 'Available'}</p>
                            </div>
                          </div>

                          {!isMe && !isOwner && (myRole === 'owner' || myRole === 'admin') && (
                            <div className="opacity-0 group-hover/member:opacity-100 flex items-center gap-1 transition-opacity shrink-0 animate-in fade-in-20">
                              {myRole === 'owner' && (
                                <button
                                  onClick={() => handlePromoteMember(member._id, isAdmin ? 'member' : 'admin')}
                                  className="text-[9px] px-1.5 py-0.5 bg-slate-200 dark:bg-slate-850 text-slate-700 dark:text-slate-350 rounded font-semibold hover:bg-indigo-650 hover:text-white transition-colors"
                                  title={isAdmin ? 'Demote to Member' : 'Promote to Admin'}
                                >
                                  {isAdmin ? 'Demote' : 'Admin'}
                                </button>
                              )}
                              {(myRole === 'owner' || (myRole === 'admin' && !isAdmin)) && (
                                <button
                                  onClick={() => handleRemoveGroupMember(member._id)}
                                  className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                  title="Kick from Group"
                                >
                                  <UserX className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Shared Media list */}
                {groupSharedMedia.length > 0 && (
                  <div className="space-y-2 text-left pt-2 border-t border-slate-200 dark:border-slate-800/40">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Shared Media</span>
                    <div className="grid grid-cols-3 gap-2">
                      {groupSharedMedia.slice(0, 6).map((item, idx) => (
                        <a
                          key={idx}
                          href={item.mediaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="h-14 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden block border border-slate-200 dark:border-slate-800 relative hover:opacity-85 transition-opacity"
                        >
                          {item.messageType === 'image' ? (
                            <img src={item.mediaUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-[10px] font-bold text-slate-500 uppercase">
                              {item.messageType}
                            </div>
                          )}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Shared Files list */}
                {groupSharedFiles.length > 0 && (
                  <div className="space-y-2 text-left pt-2 border-t border-slate-200 dark:border-slate-800/40">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Shared Files</span>
                    <div className="space-y-1.5">
                      {groupSharedFiles.slice(0, 5).map((item, idx) => (
                        <a
                          key={idx}
                          href={item.mediaUrl}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-4 w-4 text-indigo-500 shrink-0" />
                            <span className="text-[10px] font-medium text-slate-800 dark:text-slate-300 truncate max-w-[150px]">{item.fileName || 'document.pdf'}</span>
                          </div>
                          <Download className="h-3 w-3 text-slate-400 hover:text-indigo-500 shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Leave Group Action Button */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800/40">
                  <button
                    onClick={handleLeaveGroup}
                    className="w-full py-2.5 bg-red-500/10 hover:bg-red-500 border border-red-500/20 text-red-550 hover:text-white font-bold rounded-2xl text-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="h-4 w-4 animate-pulse-slow" /> Leave Group Chat
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Community Details Info sidebar panel */}
          {isGroupInfoOpen && activeChat.isGroup && activeChat.isCommunity && activeCommunity && (
            <div className="w-80 border-l border-slate-200 dark:border-slate-800/40 bg-white/40 dark:bg-slate-900/30 backdrop-blur-md flex flex-col h-full shrink-0 z-10 overflow-hidden animate-in slide-in-from-right-2 duration-200">
              {/* Header */}
              <div className="h-16 border-b border-slate-200 dark:border-slate-800/60 px-4 flex items-center justify-between bg-white/40 dark:bg-slate-900/40 backdrop-blur-md shrink-0">
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200">Server Info</span>
                <button onClick={() => setIsGroupInfoOpen(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white">
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Scroll Container */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                
                {/* Banner & Logo */}
                <div className="relative rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center pb-4">
                  <div className="h-20 w-full bg-indigo-500 overflow-hidden">
                    {activeCommunity.banner ? <img src={activeCommunity.banner} alt="" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="-mt-8 h-16 w-16 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 shadow-md flex items-center justify-center font-black text-slate-800 dark:text-white text-xl overflow-hidden mx-auto">
                    {activeCommunity.avatar ? <img src={activeCommunity.avatar} alt="" className="h-full w-full object-cover" /> : activeCommunity.name.charAt(0)}
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white mt-2 px-2 truncate">{activeCommunity.name}</h3>
                  <p className="text-[10px] text-slate-500 px-3 mt-1 line-clamp-2">{activeCommunity.description || 'Welcome to our server!'}</p>
                </div>

                {/* Welcome Message Card */}
                {activeCommunity.welcomeMessage && (
                  <div className="p-3 bg-indigo-500/5 dark:bg-indigo-550/10 border border-indigo-550/10 dark:border-indigo-550/20 rounded-2xl text-left">
                    <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-1">Welcome Message</span>
                    <p className="text-[10.5px] text-slate-650 dark:text-slate-350 leading-relaxed italic">"{activeCommunity.welcomeMessage}"</p>
                  </div>
                )}

                {/* Rules & Guidelines Card */}
                {activeCommunity.guidelines && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl text-left">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1">Server Rules</span>
                    <p className="text-[10.5px] text-slate-600 dark:text-slate-455 leading-relaxed whitespace-pre-line">{activeCommunity.guidelines}</p>
                  </div>
                )}

                {/* Join Request Queue (Only visible to Server Admins/Owners) */}
                {(() => {
                  const isOwner = activeCommunity.creatorId === user?._id;
                  const isAdmin = activeCommunity.admins?.some((adm: any) => (typeof adm === 'string' ? adm === user?._id : adm._id === user?._id));
                  if ((isOwner || isAdmin) && communityRequests.length > 0) {
                    return (
                      <div className="space-y-2 text-left">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Join Requests ({communityRequests.length})</span>
                        <div className="space-y-2">
                          {communityRequests.map((req) => (
                            <div key={req._id} className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-2 animate-in fade-in-30">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="h-7 w-7 rounded-full bg-slate-200 overflow-hidden shrink-0">
                                  {req.userId?.avatar ? <img src={req.userId.avatar} alt="" className="h-full w-full object-cover" /> : null}
                                </div>
                                <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate">{req.userId?.username}</span>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <button
                                  onClick={() => handleActionJoinRequest(req._id, 'accept')}
                                  className="px-2 py-0.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[8.5px] rounded"
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={() => handleActionJoinRequest(req._id, 'reject')}
                                  className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-655 dark:text-slate-300 font-bold text-[8.5px] rounded"
                                >
                                  Decline
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Channels Quick Navigator list */}
                <div className="space-y-2 text-left">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Channels</span>
                  <div className="space-y-1 bg-slate-50 dark:bg-slate-900/40 p-2 rounded-2xl border border-slate-200/60 dark:border-slate-800/40">
                    {activeCommunity.groupIds?.map((channel: any) => (
                      <button
                        key={channel._id}
                        onClick={() => { setActiveChat(channel); }}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors text-left ${
                          activeChat._id === channel._id
                            ? 'bg-indigo-500 text-white shadow-sm'
                            : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white'
                        }`}
                      >
                        {getChannelIcon(channel.channelType)}
                        <span className="truncate">{channel.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Server Settings Form (Creator/Admin) */}
                {(() => {
                  const isOwner = activeCommunity.creatorId === user?._id;
                  const isAdmin = activeCommunity.admins?.some((adm: any) => (typeof adm === 'string' ? adm === user?._id : adm._id === user?._id));
                  if (!isOwner && !isAdmin) return null;

                  return (
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-250 dark:border-slate-800/80 rounded-2xl text-left space-y-4">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Server Settings</span>
                      
                      {isEditingCommunity ? (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="block text-[8.5px] uppercase tracking-wider font-bold text-slate-400">Server Name</label>
                            <input
                              type="text"
                              value={editCommName}
                              onChange={(e) => setEditCommName(e.target.value)}
                              className="w-full h-8 rounded-lg text-xs px-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[8.5px] uppercase tracking-wider font-bold text-slate-400">Description</label>
                            <textarea
                              value={editCommDesc}
                              onChange={(e) => setEditCommDesc(e.target.value)}
                              className="w-full min-h-[50px] text-xs p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 outline-none resize-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[8.5px] uppercase tracking-wider font-bold text-slate-400">Privacy Gate</label>
                            <select
                              value={editCommPrivacy}
                              onChange={(e) => setEditCommPrivacy(e.target.value as any)}
                              className="w-full h-8 rounded-lg text-xs px-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 outline-none"
                            >
                              <option value="public">Public (Direct Join)</option>
                              <option value="private">Private (Approval Queue)</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[8.5px] uppercase tracking-wider font-bold text-slate-400">Welcome Banner Text</label>
                            <input
                              type="text"
                              placeholder="Welcome to our family!"
                              value={editCommWelcome}
                              onChange={(e) => setEditCommWelcome(e.target.value)}
                              className="w-full h-8 rounded-lg text-xs px-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[8.5px] uppercase tracking-wider font-bold text-slate-400">Rules list</label>
                            <textarea
                              placeholder="1. Keep it friendly..."
                              value={editCommRules}
                              onChange={(e) => setEditCommRules(e.target.value)}
                              className="w-full min-h-[60px] text-xs p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 outline-none resize-none"
                            />
                          </div>

                          <div className="flex gap-1.5 pt-1.5">
                            <button
                              onClick={async () => {
                                await handleUpdateCommunity(editCommName, editCommDesc, editCommPrivacy, editCommWelcome, editCommRules);
                                setIsEditingCommunity(false);
                              }}
                              className="flex-1 py-1.5 bg-indigo-500 hover:bg-indigo-650 text-white font-bold text-xs rounded-xl"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setIsEditingCommunity(false)}
                              className="flex-1 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-350 font-bold text-xs rounded-xl"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditCommName(activeCommunity.name || '');
                            setEditCommDesc(activeCommunity.description || '');
                            setEditCommPrivacy(activeCommunity.privacyType || 'public');
                            setEditCommWelcome(activeCommunity.welcomeMessage || '');
                            setEditCommRules(activeCommunity.guidelines || '');
                            setIsEditingCommunity(true);
                          }}
                          className="w-full py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10.5px] rounded-lg transition-colors flex items-center justify-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-850"
                        >
                          <Edit2 className="h-3 w-3" /> Edit Server Profile
                        </button>
                      )}
                    </div>
                  );
                })()}

                {/* Members list count block */}
                <div className="space-y-2 text-left">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Members ({activeCommunity.members?.length || 0})</span>
                  <div className="space-y-1">
                    {activeCommunity.members?.map((member: any) => {
                      const isOwner = member._id === activeCommunity.creatorId;
                      const isAdmin = activeCommunity.admins?.some((adm: any) => (typeof adm === 'string' ? adm === member._id : adm._id === member._id));
                      return (
                        <div key={member._id} className="flex items-center gap-2 p-1 hover:bg-slate-50 dark:hover:bg-slate-905 rounded-lg">
                          <div className="h-7 w-7 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                            {member.avatar ? <img src={member.avatar} alt="" className="h-full w-full object-cover" /> : null}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-slate-800 dark:text-slate-300 truncate">{member.username}</p>
                            <p className="text-[7.5px] text-slate-500">{isOwner ? 'Server Creator / Owner' : isAdmin ? 'Administrator' : 'Member'}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Leave Community block */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800/40">
                  <button
                    onClick={handleLeaveCommunity}
                    className="w-full py-2 bg-red-500/10 hover:bg-red-500 border border-red-500/20 text-red-550 hover:text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="h-4 w-4" /> Leave Server
                  </button>
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
                      className={`h-full w-full object-cover transition-all duration-300 ${isBgBlurActive ? 'blur-md' : ''}`}
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
                        className={`h-full w-full object-cover ${isBgBlurActive ? 'blur-sm' : ''}`}
                      />
                    </div>
                  )}

                  {/* Hand Raised Overlay */}
                  {isHandRaised && (
                    <div className="absolute top-4 left-4 bg-amber-500 text-white font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg border border-amber-400 z-30 animate-bounce">
                      🖐️ Hand Raised
                    </div>
                  )}

                  {/* Active Recording Overlay */}
                  {isRecording && (
                    <div className="absolute top-4 left-32 bg-red-600 text-white font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg border border-red-500 z-30 animate-pulse">
                      🔴 REC {formatRecordingDuration(recordingSeconds)}
                    </div>
                  )}

                  {/* Live Captioning Subtitles Drawer */}
                  {isCaptioningActive && liveCaptions.length > 0 && (
                    <div className="absolute bottom-20 left-6 right-6 text-center pointer-events-none z-30">
                      <p className="inline-block bg-black/80 backdrop-blur-md px-4 py-1.5 rounded-xl border border-white/10 text-xs font-semibold text-indigo-250 shadow-md">
                        💬 {liveCaptions[liveCaptions.length - 1]}
                      </p>
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
                        
                        {/* Background Blur */}
                        <button
                          onClick={() => setIsBgBlurActive(!isBgBlurActive)}
                          className={`p-2.5 rounded-full ${isBgBlurActive ? 'bg-indigo-500 text-white' : 'hover:bg-slate-800 text-slate-300'}`}
                          title={isBgBlurActive ? 'Disable Blur' : 'Enable Background Blur'}
                        >
                          <Sparkles className="h-5 w-5" />
                        </button>

                        {/* Noise Cancellation */}
                        <button
                          onClick={() => setIsNoiseCancellationActive(!isNoiseCancellationActive)}
                          className={`p-2.5 rounded-full ${isNoiseCancellationActive ? 'bg-indigo-500 text-white' : 'hover:bg-slate-800 text-slate-300'}`}
                          title={isNoiseCancellationActive ? 'Disable Noise Cancellation' : 'Enable Noise Cancellation'}
                        >
                          <Languages className="h-5 w-5" />
                        </button>

                        {/* Live Captioning Speech-to-Text */}
                        <button
                          onClick={() => {
                            if (isCaptioningActive) {
                              stopSpeechTranscription();
                            } else {
                              startSpeechTranscription();
                            }
                          }}
                          className={`p-2.5 rounded-full ${isCaptioningActive ? 'bg-indigo-500 text-white' : 'hover:bg-slate-800 text-slate-300'}`}
                          title={isCaptioningActive ? 'Hide Captions' : 'Show Live Captions'}
                        >
                          <Megaphone className="h-5 w-5" />
                        </button>

                        {/* Call Recording */}
                        <button
                          onClick={() => {
                            if (isRecording) {
                              stopCallRecording();
                            } else {
                              startCallRecording();
                            }
                          }}
                          className={`p-2.5 rounded-full ${isRecording ? 'bg-red-650 text-white animate-pulse' : 'hover:bg-slate-800 text-slate-300'}`}
                          title={isRecording ? 'Stop Recording' : 'Record Video Call'}
                        >
                          <Play className="h-5 w-5" />
                        </button>

                        {/* Raise Hand */}
                        <button
                          onClick={() => setIsHandRaised(!isHandRaised)}
                          className={`p-2.5 rounded-full text-xs ${isHandRaised ? 'bg-amber-500 text-white animate-bounce' : 'hover:bg-slate-800 text-slate-300'}`}
                          title={isHandRaised ? 'Lower Hand' : 'Raise Hand'}
                        >
                          🖐️
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
      <StoryCreatorModal
        isOpen={textStatusOpen}
        onClose={() => setTextStatusOpen(false)}
        storyType={storyType}
        setStoryType={setStoryType}
        textStatusContent={textStatusContent}
        setTextStatusContent={setTextStatusContent}
        textStatusBg={textStatusBg}
        setTextStatusBg={setTextStatusBg}
        storyMusic={storyMusic}
        setStoryMusic={setStoryMusic}
        storyLocation={storyLocation}
        setStoryLocation={setStoryLocation}
        storyMention={storyMention}
        setStoryMention={setStoryMention}
        storyHashtags={storyHashtags}
        setStoryHashtags={setStoryHashtags}
        storyPollQuestion={storyPollQuestion}
        setStoryPollQuestion={setStoryPollQuestion}
        storyPollOpt1={storyPollOpt1}
        setStoryPollOpt1={setStoryPollOpt1}
        storyPollOpt2={storyPollOpt2}
        setStoryPollOpt2={setStoryPollOpt2}
        storyQuestion={storyQuestion}
        setStoryQuestion={setStoryQuestion}
        storyEmojiSliderTarget={storyEmojiSliderTarget}
        setStoryEmojiSliderTarget={setStoryEmojiSliderTarget}
        storyFile={storyFile}
        setStoryFile={setStoryFile}
        storyFileUrl={storyFileUrl}
        setStoryFileUrl={setStoryFileUrl}
        storyFileInputRef={storyFileInputRef}
        onPost={handlePostStory}
      />

      {/* 8. Active Story Viewer Slides Overlay */}
      <StoryViewerModal
        activeStatusViewer={activeStatusViewer}
        activeStatusIndex={activeStatusIndex}
        setActiveStatusViewer={setActiveStatusViewer}
        activeStatusIndexSetter={setActiveStatusIndex}
        currentUser={user}
        storyReplyText={storyReplyText}
        setStoryReplyText={setStoryReplyText}
        onReply={handleReplyToStory}
        onLike={handleLikeStory}
      />
      {/* 9. Notification Panel */}
      <NotificationPanel
        isOpen={isNotifPanelOpen}
        onClose={() => setIsNotifPanelOpen(false)}
      />

    </div>
  );
}
