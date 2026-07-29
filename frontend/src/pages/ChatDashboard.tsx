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
import { formatFingerprint, getOrCreateDeviceIdentity } from '../services/e2eeKeyStore.js';
import { CENTRAL_PROFILE_URL } from '../api/centralAuth.js';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, MessageSquare, Video, Phone, Settings, User as UserIcon, LogOut, Search, Plus, Send,
  Paperclip, MoreVertical, X, Check, CheckCheck, Smile, Star, Trash2, Edit2, CornerUpLeft,
  Pin, Shield, Mic, HelpCircle, Share2, BarChart2, ShieldAlert, Trash, PlusCircle, Globe,
  Compass, Eye, Play, Pause, Sparkles, Languages, FileText, MapPin, PhoneMissed, Volume2, VideoOff,
  UserX, CheckCircle, Ban, Download, Copy, Megaphone, Bell, Users, UserPlus, UserCheck, VolumeX, Code2
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

const VoiceMessagePlayer: React.FC<{ mediaUrl: string; isMe: boolean }> = ({ mediaUrl, isMe }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  return (
    <div className={`flex items-center gap-3 p-3 rounded-2xl border ${
      isMe 
        ? 'bg-indigo-500/5 dark:bg-indigo-500/10 border-indigo-500/20 text-slate-800 dark:text-white' 
        : 'bg-white dark:bg-slate-900 border-slate-205 dark:border-slate-800 text-slate-800 dark:text-white'
    } min-w-[240px] max-w-[280px] shadow-sm mb-2 text-left`}>
      <audio ref={audioRef} src={mediaUrl} preload="metadata" />
      
      <button
        type="button"
        onClick={togglePlay}
        className="h-8 w-8 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white flex items-center justify-center shadow-md active:scale-95 transition-all shrink-0"
      >
        {isPlaying ? (
          <Pause className="h-3.5 w-3.5 fill-white text-white" />
        ) : (
          <Play className="h-3.5 w-3.5 fill-white text-white ml-0.5" />
        )}
      </button>

      <div className="flex-1 flex flex-col gap-1">
        <div className="flex gap-[2px] items-center h-6 select-none cursor-pointer">
          {[
            3, 5, 2, 4, 6, 8, 3, 2, 5, 7, 9, 4, 3, 5, 6, 4, 2, 5, 7, 3, 4, 6, 2, 4
          ].map((h, i) => {
            const isActive = progress > (i / 24) * 100;
            return (
              <div
                key={i}
                className="flex-1 rounded-full transition-all"
                style={{
                  height: `${h * 10}%`,
                  backgroundColor: isActive 
                    ? '#6366f1' 
                    : isMe ? 'rgba(99, 102, 241, 0.25)' : 'rgba(100, 116, 139, 0.25)'
                }}
              />
            );
          })}
        </div>
        <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 leading-none">
          <span>Voice Memo</span>
          <span>{audioRef.current && audioRef.current.duration ? `${Math.floor(audioRef.current.duration)}s` : ''}</span>
        </div>
      </div>
    </div>
  );
};

interface WhiteboardProps {
  chatId: string;
  socket: any;
}

const Whiteboard: React.FC<WhiteboardProps> = ({ chatId, socket }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [color, setColor] = useState('#6366f1');
  const [thickness, setThickness] = useState(3);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const drawLine = (x0: number, y0: number, x1: number, y1: number, strokeColor: string, strokeWidth: number, emit = true) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.stroke();

    if (emit && socket) {
      socket.emit('canvas:draw', {
        chatId,
        drawData: { x0, y0, x1, y1, color: strokeColor, thickness: strokeWidth }
      });
    }
  };

  useEffect(() => {
    if (!socket) return;
    const handleRemoteDraw = ({ drawData }: { drawData: any }) => {
      const { x0, y0, x1, y1, color, thickness } = drawData;
      drawLine(x0, y0, x1, y1, color, thickness, false);
    };

    const handleRemoteClear = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    socket.on('canvas:draw', handleRemoteDraw);
    socket.on('canvas:clear', handleRemoteClear);

    return () => {
      socket.off('canvas:draw', handleRemoteDraw);
      socket.off('canvas:clear', handleRemoteClear);
    };
  }, [socket]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    lastPosRef.current = getCoordinates(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const currentPos = getCoordinates(e);
    drawLine(lastPosRef.current.x, lastPosRef.current.y, currentPos.x, currentPos.y, color, thickness);
    lastPosRef.current = currentPos;
  };

  const handleMouseUp = () => {
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (socket) {
        socket.emit('canvas:clear', { chatId });
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-4">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Live Whiteboard</h4>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-6 h-6 rounded-md cursor-pointer border border-slate-300 bg-transparent shrink-0"
          />
          <select
            value={thickness}
            onChange={(e) => setThickness(Number(e.target.value))}
            className="text-[10px] font-bold border border-slate-350 dark:border-slate-800 bg-white dark:bg-slate-950 rounded px-1.5 py-1 text-slate-800 dark:text-white outline-none shrink-0"
          >
            <option value={2}>Thin</option>
            <option value={4}>Medium</option>
            <option value={8}>Thick</option>
          </select>
          <button
            onClick={clearCanvas}
            className="text-[10px] font-black px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded shrink-0 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>
      <div className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden relative">
        <canvas
          ref={canvasRef}
          width={500}
          height={600}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="w-full h-full cursor-crosshair block touch-none"
        />
      </div>
    </div>
  );
};

const getCentralInitials = (value: string) => {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? 'S';
  const last = parts.length > 1 ? parts.at(-1)?.[0] : parts[0]?.[1];
  return `${first}${last ?? ''}`.toUpperCase();
};
export default function ChatDashboard() {
  const { user, fetchSessions, sessions, terminateSession, terminateAllSessions } = useAuthStore();
  const {
    chats, fetchChats, activeChat, setActiveChat, messages, sendChatMessage,
    editChatMessage, deleteChatMessage, reactToMessage, starMessageToggle, voteInPoll,
    typingUsers, setTypingUser, togglePinChatMessage, unreadCounts, upsertChat, removeChat, replaceChat
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

  // Advanced Features States
  const [isSecretMode, setIsSecretMode] = useState(false);
  const [e2eeSharedKey, setE2eeSharedKey] = useState<any>(null);
  const [isE2eeNegotiating, setIsE2eeNegotiating] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState<any>(null);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showEventsTab, setShowEventsTab] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [showRolesTab, setShowRolesTab] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('#6366f1');
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [isSpeechListening, setIsSpeechListening] = useState(false);

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
  const [activeTab, setActiveTab] = useState<'chats' | 'status' | 'calls' | 'communities' | 'profile' | 'admin'>('chats');

  // Connect with 4-digit code states
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [myConnectionCode, setMyConnectionCode] = useState('');
  const [myCodeExpiresAt, setMyCodeExpiresAt] = useState<string | null>(null);
  const [enterConnectionCode, setEnterConnectionCode] = useState('');
  const [connectError, setConnectError] = useState('');
  const [connectSuccess, setConnectSuccess] = useState('');
  const [connectLoading, setConnectLoading] = useState(false);
  const [codeCountdown, setCodeCountdown] = useState('');

  const generateMyCode = async () => {
    try {
      setConnectError('');
      setConnectSuccess('');
      const resp = await apiClient.post('/users/connections/generate-code');
      if (resp.data.success) {
        setMyConnectionCode(resp.data.code);
        setMyCodeExpiresAt(resp.data.expiresAt);
      }
    } catch (err: any) {
      setConnectError(err.response?.data?.message || 'Failed to generate code');
    }
  };

  const handleResolveCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enterConnectionCode.length !== 4) {
      setConnectError('Please enter a 4-digit code');
      return;
    }
    try {
      setConnectError('');
      setConnectSuccess('');
      setConnectLoading(true);
      const resp = await apiClient.post('/users/connections/resolve-code', { code: enterConnectionCode });
      if (resp.data.success) {
        setConnectSuccess('Connected successfully!');
        setEnterConnectionCode('');
        if (resp.data.chat) {
          upsertChat(resp.data.chat);
          setActiveChat(resp.data.chat);
        }
        setTimeout(() => {
          setConnectModalOpen(false);
          setConnectSuccess('');
        }, 1500);
      }
    } catch (err: any) {
      setConnectError(err.response?.data?.message || 'Invalid or expired code');
    } finally {
      setConnectLoading(false);
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
  const [editCommPrivacy, setEditCommPrivacy] = useState<'public' | 'private' | 'invite-only'>('public');
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

  // Emit message:seen when user opens a chat or new messages arrive in the active chat
  useEffect(() => {
    if (!activeChat || !socket) return;
    const chatMessages = messages[activeChat._id] || [];
    const myId = user?._id || user?.id;
    const unreadMsgIds = chatMessages
      .filter(m => {
        if (m.status === 'seen') return false;
        const sId = typeof m.senderId === 'string' ? m.senderId : (m.senderId as any)?._id;
        return sId !== myId;
      })
      .map(m => m._id);
    if (unreadMsgIds.length > 0) {
      emitEvent('message:seen', { chatId: activeChat._id, messageIds: unreadMsgIds });
    }
  }, [activeChat, socket, messages[activeChat?._id || '']]);

  // Searching/Creating models
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupParticipants, setGroupParticipants] = useState<string[]>([]);
  const [isBroadcastGroup, setIsBroadcastGroup] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [showBrandingLabel, setShowBrandingLabel] = useState(false);
  const [brandingHovered, setBrandingHovered] = useState(false);
  const brandingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (showBrandingLabel && !brandingRef.current?.contains(event.target as Node)) setShowBrandingLabel(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [showBrandingLabel]);
  
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
  const [storySliderEnabled, setStorySliderEnabled] = useState(false);
  const [storyAudience, setStoryAudience] = useState<'public' | 'contacts'>('contacts');
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
  useEffect(() => {
    if (!activeChat?._id) {
      setMessageText('');
      return;
    }
    setMessageText(window.localStorage.getItem(`sk_connect_draft:${activeChat._id}`) || '');
  }, [activeChat?._id]);

  const updateMessageDraft = (value: string) => {
    setMessageText(value);
    if (!activeChat?._id) return;
    const key = `sk_connect_draft:${activeChat._id}`;
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  };
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

  // 4-digit connection code countdown timer hook
  useEffect(() => {
    if (!myCodeExpiresAt) return;
    const interval = setInterval(() => {
      const remaining = new Date(myCodeExpiresAt).getTime() - Date.now();
      if (remaining <= 0) {
        setMyConnectionCode('');
        setMyCodeExpiresAt(null);
        setCodeCountdown('');
        clearInterval(interval);
      } else {
        const minutes = Math.floor(remaining / 1000 / 60);
        const seconds = Math.floor((remaining / 1000) % 60);
        setCodeCountdown(`Expires in ${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [myCodeExpiresAt]);

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

  // Bind WebRTC socket triggers & real-time notification events, stories, and communities
  useEffect(() => {
    if (!socket) return;

    const onCallAccepted = ({ answer }: { answer: RTCSessionDescriptionInit }) => {
      handleCallAccepted(answer);
    };
    const onCallCandidate = ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      handleIceCandidate(candidate);
    };
    const onCallRejected = ({ reason }: { reason: string }) => {
      alert(`Call rejected: ${reason}`);
      callStore.resetCallStore();
    };
    const onNotificationNew = (notif: any) => {
      addIncomingNotification(notif);
    };
    const onStatusNew = (newStatus: Status) => {
      setStatuses((prev) => {
        if (prev.some(s => s._id === newStatus._id)) return prev;
        return [newStatus, ...prev];
      });
    };
    const onStatusLiked = ({ statusId, likes }: { statusId: string; likes: any[] }) => {
      setStatuses((prev) =>
        prev.map((s) => (s._id === statusId ? { ...s, likes } : s))
      );
    };
    const onStatusViewed = ({ statusId, views }: { statusId: string; views: any[] }) => {
      setStatuses((prev) =>
        prev.map((s) => (s._id === statusId ? { ...s, views } : s))
      );
    };
    const onStatusDeleted = ({ statusId }: { statusId: string }) => {
      setStatuses((prev) => prev.filter((s) => s._id !== statusId));
    };
    const onCommunityCreated = (newCommunity: Community) => {
      setCommunities((prev) => {
        if (prev.some(c => c._id === newCommunity._id)) return prev;
        return [newCommunity, ...prev];
      });
    };
    const onCommunityUpdated = (updatedCommunity: Community) => {
      setCommunities((prev) =>
        prev.map((c) => (c._id === updatedCommunity._id ? updatedCommunity : c))
      );
    };

    socket.on('call:accepted', onCallAccepted);
    socket.on('call:candidate', onCallCandidate);
    socket.on('call:rejected', onCallRejected);
    socket.on('notification:new', onNotificationNew);
    const onStatusRefresh = () => { void fetchStatuses(); };
    socket.on('status:refresh', onStatusRefresh);
    socket.on('status:new', onStatusNew);
    socket.on('status:liked', onStatusLiked);
    socket.on('status:viewed', onStatusViewed);
    socket.on('status:deleted', onStatusDeleted);
    socket.on('community:created', onCommunityCreated);
    socket.on('community:updated', onCommunityUpdated);

    // Request browser notification permission on first mount
    requestBrowserPermission();

    return () => {
      socket.off('call:accepted', onCallAccepted);
      socket.off('call:candidate', onCallCandidate);
      socket.off('call:rejected', onCallRejected);
      socket.off('notification:new', onNotificationNew);
      socket.off('status:refresh', onStatusRefresh);
      socket.off('status:new', onStatusNew);
      socket.off('status:liked', onStatusLiked);
      socket.off('status:viewed', onStatusViewed);
      socket.off('status:deleted', onStatusDeleted);
      socket.off('community:created', onCommunityCreated);
      socket.off('community:updated', onCommunityUpdated);
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

  // ── E2EE Web Crypto Helpers ──
  const base64ToBuf = (b64: string) => {
    const binStr = window.atob(b64);
    const len = binStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binStr.charCodeAt(i);
    }
    return bytes.buffer;
  };

  const bufToBase64 = (buf: ArrayBuffer) => {
    let binary = '';
    const bytes = new Uint8Array(buf);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  const [e2eeKeyPair, setE2eeKeyPair] = useState<any>(null);
  const [e2eeFingerprint, setE2eeFingerprint] = useState('');
  const [decryptedCache, setDecryptedCache] = useState<{ [msgId: string]: string }>({});

  const startSecretMode = async () => {
    if (!activeChat || activeChat.isGroup) return;
    setIsE2eeNegotiating(true);
    try {
      const identity = await getOrCreateDeviceIdentity();
      setE2eeKeyPair(identity);
      setE2eeFingerprint(identity.fingerprint);
      await apiClient.put('/e2ee/keys/current', { publicKey: identity.publicKey });
      
      const opponent = activeChat.participants.find(p => p._id !== (user?._id || user?.id));
      if (opponent && socket) {
        socket.emit('e2ee:key_exchange', {
          targetUserId: opponent._id,
          chatId: activeChat._id,
          keyData: identity.publicKey,
        });
      }
      setIsSecretMode(true);
    } catch (err) {
      console.error('E2EE Key Gen Failed:', err);
    } finally {
      setIsE2eeNegotiating(false);
    }
  };

  // Decryption effect
  useEffect(() => {
    if (!e2eeSharedKey || !activeChat) return;
    const rawMsgs = messages[activeChat._id] || [];
    
    rawMsgs.forEach(async (msg) => {
      if (msg.isEncrypted && msg.ciphertext && msg.iv && !decryptedCache[msg._id]) {
        try {
          const ivBuf = base64ToBuf(msg.iv);
          const cipherBuf = base64ToBuf(msg.ciphertext);
          const decryptedBuf = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: ivBuf },
            e2eeSharedKey,
            cipherBuf
          );
          const plainText = new TextDecoder().decode(decryptedBuf);
          setDecryptedCache(prev => ({ ...prev, [msg._id]: plainText }));
        } catch (err) {
          console.error('Failed to decrypt message:', msg._id, err);
          setDecryptedCache(prev => ({ ...prev, [msg._id]: '🔒 [Decryption failed: keys mismatch]' }));
        }
      }
    });
  }, [messages, e2eeSharedKey, activeChat]);

  // Key Exchange socket listener
  useEffect(() => {
    if (!socket) return;
    
    const handleE2eeKeyExchange = async ({ senderId, chatId, keyData }: { senderId: string; chatId: string; keyData: any }) => {
      if (!activeChat || activeChat._id !== chatId || activeChat.isGroup) return;
      try {
        let currentKeyPair = e2eeKeyPair;
        if (!currentKeyPair) {
          currentKeyPair = await getOrCreateDeviceIdentity();
          setE2eeKeyPair(currentKeyPair);
          setE2eeFingerprint(currentKeyPair.fingerprint);
          await apiClient.put('/e2ee/keys/current', { publicKey: currentKeyPair.publicKey });
          socket.emit('e2ee:key_exchange', {
            targetUserId: senderId,
            chatId,
            keyData: currentKeyPair.publicKey,
          });
        }

        const importedOpponentPublicKey = await window.crypto.subtle.importKey(
          'jwk',
          keyData,
          { name: 'ECDH', namedCurve: 'P-256' },
          true,
          []
        );

        const derivedAESKey = await window.crypto.subtle.deriveKey(
          { name: 'ECDH', public: importedOpponentPublicKey },
          currentKeyPair.privateKey,
          { name: 'AES-GCM', length: 256 },
          true,
          ['encrypt', 'decrypt']
        );

        setE2eeSharedKey(derivedAESKey);
        setIsSecretMode(true);
      } catch (err) {
        console.error('Error deriving E2EE shared key:', err);
      }
    };

    socket.on('e2ee:key_exchange', handleE2eeKeyExchange);
    return () => {
      socket.off('e2ee:key_exchange', handleE2eeKeyExchange);
    };
  }, [socket, e2eeKeyPair, activeChat]);

  // ── Web Audio Voicemail Waveform Visualizer ──
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#6366f1';
      ctx.beginPath();

      const sliceWidth = canvas.width * 1.0 / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * canvas.height / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    draw();
  };

  // ── Speech to Text Dictation ──
  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsSpeechListening(true);
    };

    recognition.onerror = () => {
      setIsSpeechListening(false);
    };

    recognition.onend = () => {
      setIsSpeechListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setMessageText(prev => prev ? prev + ' ' + transcript : transcript);
    };

    recognition.start();
  };

  // ── Community Roles & Events ──
  const handleCreateRole = async (communityId: string) => {
    if (!newRoleName.trim()) return;
    setIsCreatingRole(true);
    try {
      const resp = await apiClient.post(`/community/${communityId}/roles`, {
        name: newRoleName,
        color: newRoleColor,
        permissions: []
      });
      setCommunities(prev => prev.map(c => c._id === communityId ? resp.data.community : c));
      setNewRoleName('');
    } catch (err) {
      alert('Error creating role');
    } finally {
      setIsCreatingRole(false);
    }
  };

  const handleAssignRole = async (communityId: string, userId: string, roleName: string) => {
    try {
      const resp = await apiClient.post(`/community/${communityId}/members/${userId}/role`, {
        roleName
      });
      setCommunities(prev => prev.map(c => c._id === communityId ? resp.data.community : c));
    } catch (err) {
      alert('Error assigning role');
    }
  };

  const handleCreateEvent = async (communityId: string) => {
    if (!newEventTitle.trim() || !newEventDate) return;
    setIsCreatingEvent(true);
    try {
      const resp = await apiClient.post(`/community/${communityId}/events`, {
        title: newEventTitle,
        description: newEventDesc,
        date: newEventDate
      });
      setCommunities(prev => prev.map(c => c._id === communityId ? resp.data.community : c));
      setNewEventTitle('');
      setNewEventDesc('');
      setNewEventDate('');
    } catch (err) {
      alert('Error creating event');
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const handleEventRSVP = async (communityId: string, eventId: string, status: 'going' | 'interested' | 'declining') => {
    try {
      const resp = await apiClient.post(`/community/${communityId}/events/${eventId}/rsvp`, {
        status
      });
      setCommunities(prev => prev.map(c => c._id === communityId ? resp.data.community : c));
    } catch (err) {
      alert('Error updating RSVP');
    }
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
      upsertChat(resp.data.chat);
      setActiveChat(resp.data.chat);
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
      replaceChat(resp.data.chat);
      setActiveChat(resp.data.chat);
    } catch (e) {
      console.error('Failed to update group settings:', e);
    }
  };

  const handleLeaveGroup = async () => {
    if (!activeChat) return;
    if (!confirm('Are you sure you want to leave this group?')) return;
    try {
      await apiClient.post(`/chats/${activeChat._id}/leave`);
      removeChat(activeChat._id);
      setActiveChat(null);
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
      replaceChat(resp.data.chat);
      setActiveChat(resp.data.chat);
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleAddGroupMember = async (userId: string) => {
    if (!activeChat) return;
    try {
      const resp = await apiClient.post(`/chats/${activeChat._id}/members`, { userId });
      replaceChat(resp.data.chat);
      setActiveChat(resp.data.chat);
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
      replaceChat(resp.data.chat);
      setActiveChat(resp.data.chat);
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
      replaceChat(resp.data.chat);
      setActiveChat(resp.data.chat);
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
      upsertChat(resp.data.chat);
      setActiveChat(resp.data.chat);
      setGroupName('');
      setGroupParticipants([]);
      setIsBroadcastGroup(false);
      setCreateGroupOpen(false);
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

      let plainText = messageText;
      let isEncrypted = false;
      let ciphertext = undefined;
      let iv = undefined;

      if (isSecretMode && e2eeSharedKey) {
        isEncrypted = true;
        const ivBytes = window.crypto.getRandomValues(new Uint8Array(12));
        const encoded = new TextEncoder().encode(plainText);
        const encryptedBuf = await window.crypto.subtle.encrypt(
          { name: 'AES-GCM', iv: ivBytes },
          e2eeSharedKey,
          encoded
        );
        ciphertext = bufToBase64(encryptedBuf);
        iv = bufToBase64(ivBytes.buffer);
        plainText = '🔒 [Secret Encrypted Message]';
      }

      await sendChatMessage(
        activeChatId,
        plainText,
        selectedFile || undefined,
        selectedFile ? getMessageTypeFromFile(selectedFile) : 'text',
        replyingTo?._id,
        expiresIn || undefined,
        isEncrypted,
        ciphertext,
        iv
      );

      updateMessageDraft('');
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
      };

      recorder.start();
      setVoiceMediaRecorder(recorder);
      setIsVoiceRecording(true);

      // Web Audio Waveform Analyzer
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      setTimeout(() => {
        drawWaveform();
      }, 100);
    } catch (err) {
      alert('Could not record voice. Check microphone authorizations.');
    }
  };

  const stopRecording = () => {
    if (voiceMediaRecorder && isVoiceRecording) {
      voiceMediaRecorder.stop();
      setIsVoiceRecording(false);
      voiceMediaRecorder.stream.getTracks().forEach((track) => track.stop());

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    }
  };

  // Status/Story posting
  const handlePostStory = async () => {
    const meta: any = {};
    if (storyMusic.trim()) meta.music = storyMusic;
    if (storyMention.trim()) meta.mention = storyMention;
    if (storyLocation.trim()) meta.location = storyLocation;
    if (storyHashtags.trim()) meta.hashtags = storyHashtags.split(',').map((t) => t.trim());
    const poll = storyPollQuestion.trim() && storyPollOpt1.trim() && storyPollOpt2.trim()
      ? { question: storyPollQuestion.trim(), options: [storyPollOpt1.trim(), storyPollOpt2.trim()] }
      : undefined;
    const question = !poll && storyQuestion.trim() ? { prompt: storyQuestion.trim() } : undefined;
    const slider = !poll && !question && storySliderEnabled ? { emoji: storyEmojiSliderTarget || '🔥' } : undefined;
    try {
      if (storyType === 'media' && storyFile) {
        const formData = new FormData();
        formData.append('type', storyFile.type.startsWith('video') ? 'video' : 'image');
        formData.append('file', storyFile);
        formData.append('metadata', JSON.stringify(meta));
        formData.append('audience', storyAudience);
        if (poll) formData.append('poll', JSON.stringify(poll));
        if (question) formData.append('question', JSON.stringify(question));
        if (slider) formData.append('slider', JSON.stringify(slider));
        
        await apiClient.post('/status', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        if (!textStatusContent.trim()) return;
        await apiClient.post('/status', {
          type: 'text',
          content: textStatusContent,
          backgroundColor: textStatusBg,
          metadata: meta,
          audience: storyAudience,
          poll,
          question,
          slider
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
      setStorySliderEnabled(false);
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

  const refreshStoryInteractions = async () => {
    const response = await apiClient.get('/status');
    setStatuses(response.data.statuses);
    setActiveStatusViewer((current) => current ? response.data.statuses : current);
  };

  const handleStoryPollVote = async (statusId: string, optionId: string) => {
    await apiClient.put(`/status/${statusId}/poll`, { optionId });
    await refreshStoryInteractions();
  };
  const handleStoryQuestionAnswer = async (statusId: string, text: string) => {
    await apiClient.put(`/status/${statusId}/question`, { text });
    await refreshStoryInteractions();
  };
  const handleStorySliderResponse = async (statusId: string, value: number) => {
    await apiClient.put(`/status/${statusId}/slider`, { value });
    await refreshStoryInteractions();
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
      <section className={`w-full md:w-96 glass-panel border-r border-slate-200/60 dark:border-slate-800/60 flex flex-col z-10 shrink-0 relative overflow-hidden transition-all duration-300 ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        
        {/* App Branding Top Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800/40 flex items-center justify-between bg-white/30 dark:bg-slate-900/30">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-sm font-black tracking-tighter text-white">SK</span>
            </div>
            <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-200 dark:to-purple-300">SK Connect</span>
          </div>
          {/* Notification bell + dropdown anchored to header */}
          <div className="relative">
            <NotificationBell onClick={() => setIsNotifPanelOpen((p) => !p)} />
            <NotificationPanel isOpen={isNotifPanelOpen} onClose={() => setIsNotifPanelOpen(false)} />
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
                    <div className="flex items-center gap-2.5">
                      <button 
                        onClick={() => setConnectModalOpen(true)}
                        className="text-xs font-bold text-indigo-550 dark:text-indigo-400 hover:text-indigo-500 flex items-center gap-0.5"
                        title="Connect with new friends via 4-digit code"
                      >
                        <UserPlus className="h-3.5 w-3.5" /> Connect
                      </button>
                      <button 
                        onClick={() => setCreateGroupOpen(true)}
                        className="text-xs font-bold text-indigo-550 dark:text-indigo-400 hover:text-indigo-500 flex items-center gap-0.5"
                      >
                        <Plus className="h-3.5 w-3.5" /> Group
                      </button>
                    </div>
                  </div>
                  {chats.map((chat) => {
                    const active = activeChat?._id === chat._id;
                    const isGroup = chat.isGroup;
                    const targetParticipant = chat.participants.find(p => p._id !== (user?._id || user?.id));
                    const titleName = isGroup ? chat.name : (targetParticipant?.username || 'Chat room');
                    
                    const activeTypers = Object.values(typingUsers[chat._id] || {});
                    const isSomeoneTyping = activeTypers.length > 0;
                    const typingText = isSomeoneTyping ? `${activeTypers[0]} is typing...` : '';
                    
                    const subtitle = chat.lastMessage?.isDeleted 
                      ? 'Deleted message' 
                      : (chat.lastMessage?.content || chat.description || 'No messages yet');
                    const unread = !active ? (unreadCounts[chat._id] || 0) : 0;

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
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] text-slate-500 font-medium">
                                {chat.lastMessage ? new Date(chat.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center mt-0.5">
                            {isSomeoneTyping ? (
                              <p className="text-xs truncate font-semibold text-indigo-500 dark:text-indigo-400 flex-1 animate-pulse">
                                {typingText}
                              </p>
                            ) : (
                              <p className={`text-xs truncate font-medium flex-1 ${
                                unread > 0 ? 'text-slate-700 dark:text-slate-300 font-semibold' : 'text-slate-500 dark:text-slate-400'
                              }`}>{subtitle}</p>
                            )}
                            {unread > 0 && (
                              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] w-[18px] rounded-full bg-emerald-500 text-white text-[10px] font-bold shrink-0 ml-2">
                                {unread > 99 ? '99+' : unread}
                              </span>
                            )}
                          </div>
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
                    {getCentralInitials(user?.centralName || user?.username || 'SK')}
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

            {/* Customization Settings section */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800/40 space-y-4 text-left">
              <h3 className="text-[10px] font-bold text-slate-500 dark:text-slate-405 uppercase tracking-widest">Customization & Settings</h3>
              
              <div>
                <span className="text-[10px] text-slate-505 dark:text-slate-400 font-bold uppercase tracking-wider">Appearance Mode</span>
                <div className="flex gap-2 mt-2">
                  {['light', 'dark', 'system'].map((th) => (
                    <button
                      key={th}
                      onClick={() => themeStore.setTheme(th as any)}
                      className={`flex-1 py-2 text-[10px] font-bold rounded-xl border transition-all ${
                        themeStore.theme === th
                          ? 'bg-indigo-500 text-white on-color border-indigo-500 shadow-md shadow-indigo-500/10'
                          : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {th}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-550 dark:text-slate-400 font-bold uppercase tracking-wider">Accent Theme Color</span>
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
                <span className="text-[10px] text-slate-550 dark:text-slate-400 font-bold uppercase tracking-wider">Chat Background Wallpaper</span>
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
                          ? 'bg-indigo-500 text-white on-color border-indigo-500 shadow-md shadow-indigo-500/10'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-350 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {wall.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800/40 space-y-2">
                <a
                  href={CENTRAL_PROFILE_URL}
                  className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-650 dark:text-indigo-300 font-bold text-xs border border-indigo-500/20 transition-colors"
                >
                  <UserIcon className="h-4.5 w-4.5" />
                  <span>Manage your SK Account</span>
                </a>

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
        <main className={`flex-1 flex flex-col justify-between relative overflow-hidden transition-all duration-500 ${activeChat ? 'flex' : 'hidden md:flex'} ${wallpaperClasses[wallpaperPreset] || wallpaperClasses['gradient-mesh']}`}>
        {activeChat ?
          (() => {
            const opponent = activeChat.isGroup ? null : activeChat.participants.find(p => p._id !== (user?._id || user?.id));
            const activeCommunity = activeChat.isCommunity ? communities.find(c => c._id === activeChat.communityId) : null;
            const isCommAdmin = activeCommunity && (activeCommunity.creatorId === user?._id || activeCommunity.admins.some((a: any) => (typeof a === 'string' ? a === user?._id : a._id === user?._id)));
            return (
              <div className="flex-1 flex overflow-hidden h-full relative">
                {/* Message List Pane */}
                <div className="flex-1 flex flex-col h-full justify-between overflow-hidden border-r border-slate-200 dark:border-slate-800/40">
                
                {/* Active chat header */}
                <header className="h-16 border-b border-slate-200 dark:border-slate-800/60 px-4 md:px-6 flex items-center justify-between bg-white/40 dark:bg-slate-900/40 backdrop-blur-md z-10 shrink-0">
                  <div className="flex items-center gap-2.5 max-w-[75%]">
                    {/* Back Button (Mobile only) */}
                    <button
                      onClick={() => setActiveChat(null)}
                      className="md:hidden p-1.5 -ml-1 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors shrink-0"
                      title="Back to Chats"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>

                    <div 
                      className="flex items-center gap-3 cursor-pointer group truncate"
                      onClick={() => {
                        setIsGroupInfoOpen(!isGroupInfoOpen);
                        setIsAiOpen(false);
                      }}
                    >
                      <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-850 overflow-hidden border border-slate-300 dark:border-slate-700/40 transition-transform group-hover:scale-105 shrink-0">
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
                </div>

                <div className="flex items-center gap-3">
                    {/* E2EE Secret Chat Toggle (Direct Chats Only) */}
                    {!activeChat.isGroup && (
                      <button
                        onClick={() => {
                          if (isSecretMode) {
                            setIsSecretMode(false);
                            setE2eeSharedKey(null);
                          } else {
                            startSecretMode();
                          }
                        }}
                        className={`p-2 rounded-lg transition-all ${isSecretMode ? 'bg-emerald-500/10 text-emerald-500' : 'text-slate-500 dark:text-slate-400 hover:text-emerald-600 hover:bg-emerald-500/10'}`}
                        title={isSecretMode ? `End-to-End Encryption Enabled${e2eeFingerprint ? ` · ${formatFingerprint(e2eeFingerprint)}` : ''}` : 'Initiate Secret Chat (E2EE)'}
                      >
                        <Shield className="h-4.5 w-4.5" />
                      </button>
                    )}

                    {/* Whiteboard and Events Tab Toggles (Community Channels Only) */}
                    {activeChat.isCommunity && (
                      <>
                        <button
                          onClick={() => {
                            setShowWhiteboard(!showWhiteboard);
                            setShowEventsTab(false);
                          }}
                          className={`p-2 rounded-lg transition-all ${showWhiteboard ? 'bg-indigo-500/10 text-indigo-500' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 hover:bg-indigo-500/10'}`}
                          title="Live Shared Whiteboard"
                        >
                          <Edit2 className="h-4.5 w-4.5" />
                        </button>

                        <button
                          onClick={() => {
                            setShowEventsTab(!showEventsTab);
                            setShowWhiteboard(false);
                          }}
                          className={`p-2 rounded-lg transition-all ${showEventsTab ? 'bg-indigo-500/10 text-indigo-500' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-650 hover:bg-indigo-500/10'}`}
                          title="Events & RSVPs List"
                        >
                          <Compass className="h-4.5 w-4.5" />
                        </button>
                      </>
                    )}

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
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 md:px-12 py-4 md:py-6 space-y-5 md:space-y-7 custom-scrollbar">
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
                      className={`flex flex-col gap-2 max-w-[82%] ${isMe ? 'self-end ml-auto items-end' : 'items-start'} cursor-pointer select-none`}
                      onDoubleClick={() => setReplyingTo(msg)}
                      title="Double click to reply"
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
                        <VoiceMessagePlayer mediaUrl={msg.mediaUrl} isMe={isMe} />
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

                      <p className="text-sm font-medium leading-relaxed break-words">{msg.isEncrypted ? (decryptedCache[msg._id] || '🔒 [Decrypting secret message...]') : msg.content}</p>

                      {/* Message Reactions Badges display */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5 pb-1 relative z-10 select-none">
                          {(() => {
                            const grouped: { [emoji: string]: number } = {};
                            msg.reactions.forEach(r => {
                              grouped[r.emoji] = (grouped[r.emoji] || 0) + 1;
                            });

                            return Object.entries(grouped).map(([emoji, count]) => (
                              <button
                                key={emoji}
                                onClick={() => reactToMessage(msg._id, emoji)}
                                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100/60 dark:bg-slate-950/50 hover:bg-slate-200/80 dark:hover:bg-slate-900 border border-slate-200/40 dark:border-slate-800/40 text-[9px] font-black text-slate-800 dark:text-slate-200 transition-all hover:scale-105 active:scale-95 shadow-sm"
                                title="Click to remove or add reaction"
                              >
                                <span>{emoji}</span>
                                {count > 1 && <span className="opacity-90 font-bold">{count}</span>}
                              </button>
                            ));
                          })()}
                        </div>
                      )}

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
                            ) : msg.status === 'delivered' ? (
                              <CheckCheck className="h-3 w-3 text-slate-400 dark:text-slate-550" />
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
            {(() => {
              const activeTypers = Object.values(typingUsers[activeChat._id] || {});
              if (activeTypers.length === 0) return null;
              return (
                <div className="flex items-center gap-2.5 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 max-w-[200px] shadow-sm self-start ml-2 rounded-tl-none mt-2 animate-pulse shrink-0">
                  <div className="flex gap-1 items-center px-1">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{activeTypers[0]} is typing...</span>
                </div>
              );
            })()}
            <div ref={messagesEndRef} />
          </div>

            {/* Bottom input area */}
            <div className="p-2.5 sm:p-4 border-t border-slate-200 dark:border-slate-800/40 bg-white/40 dark:bg-slate-900/20 backdrop-blur-md shrink-0">
              
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

              {/* Selected File Preview Chip */}
              {selectedFile && (
                <div className="mb-2 p-2 px-3 flex items-center justify-between gap-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-500/20 max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg bg-indigo-500/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{selectedFile.name}</p>
                      <p className="text-[10px] text-slate-500 font-medium">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} 
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-650 dark:hover:text-slate-300 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
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

                {isVoiceRecording ? (
                  <div className="flex-1 flex items-center gap-3 bg-white dark:bg-slate-900 rounded-xl px-3 border border-slate-200 dark:border-slate-800 h-11 shrink-0 overflow-hidden">
                    <span className="text-[10px] font-black text-red-500 animate-pulse shrink-0">REC</span>
                    <canvas
                      ref={canvasRef}
                      width={180}
                      height={32}
                      className="flex-1 h-8 rounded bg-slate-50 dark:bg-slate-950"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (voiceMediaRecorder) {
                          voiceMediaRecorder.ondataavailable = null;
                          voiceMediaRecorder.onstop = null;
                        }
                        stopRecording();
                      }}
                      className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors shrink-0"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="text-[10px] font-black text-indigo-500 hover:text-indigo-600 transition-colors shrink-0"
                    >
                      Send
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => {
                        updateMessageDraft(e.target.value);
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
                      className="w-full h-11 pl-4 pr-18 rounded-xl text-sm font-medium glass-input text-slate-800 dark:text-white placeholder:text-slate-500"
                    />
                    
                    {/* Speech Recognition Sparkles trigger */}
                    <button
                      type="button"
                      onClick={startSpeechRecognition}
                      className={`absolute right-10 top-3 transition-colors ${isSpeechListening ? 'text-indigo-500 animate-pulse' : 'text-slate-500 hover:text-indigo-600'}`}
                      title="Dictate message (Speech to text)"
                    >
                      <Sparkles className="h-5 w-5" />
                    </button>

                    {/* Voice note triggers */}
                    <button
                      type="button"
                      onClick={startRecording}
                      className="absolute right-3 top-3 text-slate-500 hover:text-indigo-500 transition-colors"
                      title="Record voice note"
                    >
                      <Mic className="h-5 w-5" />
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  className="h-11 w-11 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20"
                >
                  <Send className="h-5 w-5" />
                </button>
              </form>
            </div>
          </div>

          {/* Collaborative Shared Whiteboard Panel */}
          {showWhiteboard && activeChat && (
            <div className="w-80 md:w-96 border-l border-slate-200 dark:border-slate-800/40 bg-white/40 dark:bg-slate-900/30 backdrop-blur-md flex flex-col h-full shrink-0 z-10 overflow-hidden animate-in slide-in-from-right duration-300">
              <Whiteboard chatId={activeChat._id} socket={socket} />
            </div>
          )}

          {/* Community Events & RSVPs Panel */}
          {showEventsTab && activeChat && (
            (() => {
              const community = communities.find(c => c._id === activeChat.communityId);
              const isCommAdmin = community && (community.creatorId === user?._id || community.admins.some((a: any) => (typeof a === 'string' ? a === user?._id : a._id === user?._id)));
              
              return (
                <div className="w-80 md:w-96 border-l border-slate-200 dark:border-slate-800/40 bg-white/40 dark:bg-slate-900/30 backdrop-blur-md flex flex-col h-full shrink-0 z-10 overflow-hidden animate-in slide-in-from-right duration-300">
                  <div className="h-16 border-b border-slate-200 dark:border-slate-800/60 px-4 flex items-center justify-between bg-white/40 dark:bg-slate-900/40 backdrop-blur-md shrink-0">
                    <div className="flex items-center gap-2 text-indigo-500 dark:text-indigo-400">
                      <Compass className="h-5 w-5 animate-spin-slow" />
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200">Events & RSVPs</span>
                    </div>
                    <button onClick={() => setShowEventsTab(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white">
                      <X className="h-4.5 w-4.5" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
                    {isCommAdmin && (
                      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/60 space-y-3 shadow-sm text-left">
                        <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Schedule New Event</h4>
                        <input
                          type="text"
                          placeholder="Event Title..."
                          value={newEventTitle}
                          onChange={(e) => setNewEventTitle(e.target.value)}
                          className="w-full h-8 px-2.5 rounded-lg text-xs font-semibold glass-input text-slate-800 dark:text-white"
                        />
                        <textarea
                          placeholder="Event Description..."
                          value={newEventDesc}
                          onChange={(e) => setNewEventDesc(e.target.value)}
                          className="w-full min-h-[60px] p-2.5 rounded-lg text-xs font-semibold glass-input text-slate-800 dark:text-white"
                        />
                        <input
                          type="datetime-local"
                          value={newEventDate}
                          onChange={(e) => setNewEventDate(e.target.value)}
                          className="w-full h-8 px-2.5 rounded-lg text-xs font-semibold glass-input text-slate-800 dark:text-white"
                        />
                        <button
                          onClick={() => handleCreateEvent(community._id)}
                          disabled={isCreatingEvent}
                          className="w-full h-8 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold transition-colors"
                        >
                          {isCreatingEvent ? 'Scheduling...' : 'Schedule Event'}
                        </button>
                      </div>
                    )}

                    <div className="space-y-4 text-left">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Scheduled Events ({community?.events?.length || 0})</h4>
                      {(!community?.events || community.events.length === 0) ? (
                        <p className="text-[11px] text-slate-400 text-center py-6">No upcoming events scheduled yet.</p>
                      ) : (
                        community.events.map((evt: any) => {
                          const goingCount = evt.rsvps.filter((r: any) => r.status === 'going').length;
                          const interestedCount = evt.rsvps.filter((r: any) => r.status === 'interested').length;
                          const decliningCount = evt.rsvps.filter((r: any) => r.status === 'declining').length;

                          const myRsvp = evt.rsvps.find((r: any) => r.userId === user?._id || r.userId === user?.id)?.status;

                          return (
                            <div key={evt._id} className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/60 shadow-sm space-y-3.5 hover:border-indigo-500/30 transition-all duration-300">
                              <div>
                                <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">{evt.title}</h5>
                                <p className="text-[9px] font-bold text-indigo-500 mt-0.5">{new Date(evt.date).toLocaleString()}</p>
                                <p className="text-[11px] text-slate-550 dark:text-slate-400 mt-1 leading-relaxed">{evt.description}</p>
                              </div>

                              <div className="flex gap-2.5 items-center justify-around py-1.5 border-y border-slate-100 dark:border-slate-800/40">
                                <div className="text-center">
                                  <div className="text-[11px] font-bold text-emerald-500">{goingCount}</div>
                                  <div className="text-[8px] text-slate-500 uppercase font-black tracking-wider">Going</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-[11px] font-bold text-amber-500">{interestedCount}</div>
                                  <div className="text-[8px] text-slate-500 uppercase font-black tracking-wider">Interested</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-[11px] font-bold text-rose-500">{decliningCount}</div>
                                  <div className="text-[8px] text-slate-500 uppercase font-black tracking-wider">Declined</div>
                                </div>
                              </div>

                              <div className="flex gap-1.5 justify-between">
                                {(['going', 'interested', 'declining'] as const).map((st) => (
                                  <button
                                    key={st}
                                    onClick={() => handleEventRSVP(community._id, evt._id, st)}
                                    className={`flex-1 h-7 rounded-lg text-[9px] font-black capitalize transition-all border ${
                                      myRsvp === st
                                        ? 'bg-indigo-500 text-white border-transparent shadow-sm'
                                        : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                                    }`}
                                  >
                                    {st}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              );
            })()
          )}

          {/* AI companion sidebar panel */}
          {isAiOpen && (
            <div className="w-full md:w-80 border-l border-slate-200 dark:border-slate-800/40 bg-slate-50/95 dark:bg-slate-955/95 md:bg-white/40 md:dark:bg-slate-900/30 backdrop-blur-md flex flex-col h-full shrink-0 absolute md:relative right-0 top-0 z-30 overflow-hidden shadow-2xl md:shadow-none animate-in slide-in-from-right duration-200">
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
            <div className="w-full md:w-80 border-l border-slate-200 dark:border-slate-800/40 bg-slate-50/95 dark:bg-slate-955/95 md:bg-white/40 md:dark:bg-slate-900/30 backdrop-blur-md flex flex-col h-full shrink-0 absolute md:relative right-0 top-0 z-30 overflow-hidden shadow-2xl md:shadow-none animate-in slide-in-from-right duration-200">
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
            <div className="w-full md:w-80 border-l border-slate-200 dark:border-slate-800/40 bg-slate-50/95 dark:bg-slate-955/95 md:bg-white/40 md:dark:bg-slate-900/30 backdrop-blur-md flex flex-col h-full shrink-0 absolute md:relative right-0 top-0 z-30 overflow-hidden shadow-2xl md:shadow-none animate-in slide-in-from-right duration-200">
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

                {/* Custom Roles Manager (Server Admins Only) */}
                {isCommAdmin && (
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl text-left space-y-3">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Server Roles</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="New role name (e.g. VIP)..."
                        value={newRoleName}
                        onChange={(e) => setNewRoleName(e.target.value)}
                        className="flex-1 h-8 px-2.5 rounded-lg text-xs font-semibold glass-input text-slate-800 dark:text-white"
                      />
                      <input
                        type="color"
                        value={newRoleColor}
                        onChange={(e) => setNewRoleColor(e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-slate-300 shrink-0"
                      />
                    </div>
                    <button
                      onClick={() => handleCreateRole(activeCommunity._id)}
                      disabled={isCreatingRole}
                      className="w-full h-8 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold transition-colors"
                    >
                      {isCreatingRole ? 'Creating...' : 'Create Role'}
                    </button>
                  </div>
                )}

                {/* Members list count block */}
                <div className="space-y-2 text-left">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Members ({activeCommunity.members?.length || 0})</span>
                  <div className="space-y-1">
                    {activeCommunity.members?.map((member: any) => {
                      const isOwner = member._id === activeCommunity.creatorId;
                      const isAdmin = activeCommunity.admins?.some((adm: any) => (typeof adm === 'string' ? adm === member._id : adm._id === member._id));
                      
                      const customMemberRole = activeCommunity.memberRoles?.find((mr: any) => mr.userId.toString() === member._id.toString());
                      const customRoleObj = activeCommunity.roles?.find((r: any) => r.name === customMemberRole?.roleName);
                      
                      return (
                        <div key={member._id} className="flex items-center gap-2 p-1 hover:bg-slate-50 dark:hover:bg-slate-905 rounded-lg">
                          <div className="h-7 w-7 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden shrink-0">
                            {member.avatar ? <img src={member.avatar} alt="" className="h-full w-full object-cover" /> : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-bold text-slate-800 dark:text-slate-300 truncate">{member.username}</p>
                            {customRoleObj ? (
                              <span className="inline-block text-[7.5px] font-black px-1.5 py-0.5 rounded leading-none text-white mt-0.5 shrink-0" style={{ backgroundColor: customRoleObj.color }}>
                                {customRoleObj.name}
                              </span>
                            ) : (
                              <p className="text-[7.5px] text-slate-500">{isOwner ? 'Server Owner' : isAdmin ? 'Administrator' : 'Member'}</p>
                            )}
                          </div>
                          
                          {/* Role Selector Trigger */}
                          {isCommAdmin && member._id !== user?._id && (
                            <select
                              value={customMemberRole?.roleName || ''}
                              onChange={(e) => handleAssignRole(activeCommunity._id, member._id, e.target.value)}
                              className="text-[9px] font-bold bg-slate-100 dark:bg-slate-950 text-slate-655 dark:text-slate-400 rounded border border-slate-200 dark:border-slate-800 outline-none p-0.5 cursor-pointer max-w-[80px]"
                            >
                              <option value="">No Role</option>
                              {activeCommunity.roles?.map((r: any) => (
                                <option key={r.name} value={r.name}>{r.name}</option>
                              ))}
                            </select>
                          )}
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
            <div className="w-full md:w-80 border-l border-slate-200 dark:border-slate-800/40 bg-slate-50/95 dark:bg-slate-955/95 md:bg-white/40 md:dark:bg-slate-900/30 backdrop-blur-md flex flex-col h-full shrink-0 absolute md:relative right-0 top-0 z-30 overflow-hidden shadow-2xl md:shadow-none animate-in slide-in-from-right duration-200">
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
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-50 p-3 sm:p-6 overflow-y-auto"
          >
            <div className="w-full max-w-3xl glass-panel rounded-[24px] sm:rounded-[32px] overflow-hidden p-4 sm:p-6 shadow-2xl relative flex flex-col items-center justify-center gap-4 sm:gap-6">
              
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
                      onClick={() => {
                        if (callStore.callerId && callStore.incomingOffer) {
                          answerCall(callStore.callerId, callStore.incomingOffer);
                        }
                      }}
                      disabled={!callStore.incomingOffer}
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
                  <div className="absolute bottom-4 left-3 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 flex items-center justify-center gap-2 sm:gap-3 bg-slate-950/65 backdrop-blur-md px-3 sm:px-6 py-3 rounded-2xl sm:rounded-full border border-slate-800 flex-wrap">
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

          const filteredContacts = contactsList.filter(contact =>
            contact.username.toLowerCase().includes(contactSearchQuery.toLowerCase())
          );

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-6 overflow-y-auto"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setCreateGroupOpen(false);
                  setIsBroadcastGroup(false);
                  setGroupParticipants([]);
                  setContactSearchQuery('');
                }
              }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 15 }}
                transition={{ type: "spring", duration: 0.4 }}
                className="w-full max-w-[400px] bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-800/40 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4)] space-y-4 text-left relative overflow-hidden"
              >
                {/* Background glowing decorations */}
                <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 w-28 h-28 rounded-full bg-pink-500/10 blur-2xl pointer-events-none" />

                <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800/40 relative z-10">
                  <h3 className="font-extrabold text-base text-slate-850 dark:text-white flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                      <Users className="h-4.5 w-4.5" />
                    </div>
                    <span className="tracking-tight">Create Group</span>
                  </h3>
                  <button 
                    onClick={() => { 
                      setCreateGroupOpen(false); 
                      setIsBroadcastGroup(false); 
                      setGroupParticipants([]); 
                      setContactSearchQuery('');
                    }} 
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4 relative z-10">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Group Room Name</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        placeholder="e.g. Design Review Crew"
                        className="w-full h-10 rounded-xl text-xs font-semibold pl-3 pr-8 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 dark:focus:border-indigo-400 outline-none transition-all text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/10 focus:shadow-[0_0_12px_rgba(99,102,241,0.15)]"
                      />
                      {groupName.trim() && (
                        <button 
                          onClick={() => setGroupName('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Broadcast Option */}
                  <div 
                    onClick={() => setIsBroadcastGroup(!isBroadcastGroup)}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all duration-300 cursor-pointer select-none ${
                      isBroadcastGroup 
                        ? 'bg-indigo-500/10 border-indigo-500/30 dark:bg-indigo-500/10 dark:border-indigo-500/35 shadow-[0_0_12px_rgba(99,102,241,0.05)]' 
                        : 'bg-slate-50/50 dark:bg-slate-950/20 border-slate-200/60 dark:border-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-950/30'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 pr-2">
                      <div className={`p-1.5 rounded-lg shrink-0 transition-colors duration-300 ${isBroadcastGroup ? 'bg-indigo-500/20 text-indigo-500' : 'bg-slate-200/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400'}`}>
                        <Megaphone className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-bold text-slate-850 dark:text-white flex items-center gap-1.5">
                          Broadcast Group
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
                          Deliver as separate 1-on-1 private messages to each member.
                        </span>
                      </div>
                    </div>
                    
                    {/* Custom Toggle Switch */}
                    <div className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-300 shrink-0 ${isBroadcastGroup ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-800'}`}>
                      <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform duration-300 ${isBroadcastGroup ? 'translate-x-3.5' : 'translate-x-0'}`} />
                    </div>
                  </div>

                  {/* Member selection */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Select Members</label>
                      {groupParticipants.length > 0 && (
                        <span className="text-[10px] font-extrabold text-indigo-500 dark:text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded-md">
                          {groupParticipants.length} selected
                        </span>
                      )}
                    </div>
                    
                    {contactsList.length > 0 && (
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={contactSearchQuery}
                          onChange={(e) => setContactSearchQuery(e.target.value)}
                          placeholder="Search contacts..."
                          className="w-full h-8 rounded-lg text-xs pl-8 pr-7 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 dark:focus:border-indigo-400 outline-none transition-all text-slate-800 dark:text-white"
                        />
                        {contactSearchQuery && (
                          <button 
                            onClick={() => setContactSearchQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    )}
                    
                    <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1 custom-scrollbar animate-fadeIn">
                      {contactsList.length > 0 ? (
                        filteredContacts.length > 0 ? (
                          filteredContacts.map((contact) => {
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
                                className={`flex items-center justify-between p-2 rounded-xl border transition-all duration-200 cursor-pointer ${
                                  isSelected 
                                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-300 dark:bg-indigo-500/10 dark:border-indigo-500/35' 
                                    : 'bg-transparent border-slate-200/50 dark:border-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-950/30 text-slate-700 dark:text-slate-350'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="h-7 w-7 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-350/40 dark:border-slate-700/40">
                                    {contact.avatar ? (
                                      <img src={contact.avatar} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                      <div className="h-full w-full flex items-center justify-center bg-indigo-500/10 text-indigo-500 font-bold text-xs uppercase">
                                        {contact.username.charAt(0)}
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-xs font-bold truncate">{contact.username}</span>
                                </div>
                                
                                {/* Custom Checkbox */}
                                <div className={`h-4 w-4 rounded border transition-all flex items-center justify-center shrink-0 ${
                                  isSelected 
                                    ? 'bg-indigo-500 border-indigo-500 text-white shadow-sm shadow-indigo-500/20' 
                                    : 'border-slate-300 dark:border-slate-800 bg-transparent'
                                }`}>
                                  {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-6 text-slate-500 space-y-1">
                            <Search className="h-5 w-5 mx-auto text-slate-400 stroke-[1.5]" />
                            <p className="text-[10px] font-medium">No members match search query</p>
                          </div>
                        )
                      ) : (
                        <div className="text-center py-6 text-slate-500 space-y-1">
                          <UserX className="h-6 w-6 mx-auto text-slate-400 stroke-[1.5]" />
                          <p className="text-[10px] font-medium">No active contacts available to select</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCreateGroup}
                  disabled={!groupName.trim()}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all duration-300 relative z-10 ${
                    groupName.trim()
                      ? 'bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]'
                      : 'bg-slate-100 dark:bg-slate-850 text-slate-450 dark:text-slate-500 cursor-not-allowed border border-slate-200/40 dark:border-slate-800/40'
                  }`}
                >
                  Create Group
                </button>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* 6. Create Community Modal Overlay */}
      <AnimatePresence>
        {createCommunityOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-6 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setCreateCommunityOpen(false);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="w-full max-w-[400px] bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-800/40 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4)] space-y-4 text-left relative overflow-hidden"
            >
              {/* Background glowing decorations */}
              <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-28 h-28 rounded-full bg-pink-500/10 blur-2xl pointer-events-none" />

              <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800/40 relative z-10">
                <h3 className="font-extrabold text-base text-slate-850 dark:text-white flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                    <Globe className="h-4.5 w-4.5" />
                  </div>
                  <span className="tracking-tight">New Community</span>
                </h3>
                <button 
                  onClick={() => setCreateCommunityOpen(false)} 
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 relative z-10">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Community Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={communityName}
                      onChange={(e) => setCommunityName(e.target.value)}
                      placeholder="e.g. UI Designers Hub"
                      className="w-full h-10 rounded-xl text-xs font-semibold pl-3 pr-8 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 dark:focus:border-indigo-400 outline-none transition-all text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/10 focus:shadow-[0_0_12px_rgba(99,102,241,0.15)]"
                    />
                    {communityName.trim() && (
                      <button 
                        onClick={() => setCommunityName('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Description</label>
                  <textarea
                    value={communityDesc}
                    onChange={(e) => setCommunityDesc(e.target.value)}
                    placeholder="Explain the purpose of this network..."
                    className="w-full min-h-[70px] rounded-xl text-xs font-semibold p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 dark:focus:border-indigo-400 outline-none transition-all text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/10 focus:shadow-[0_0_12px_rgba(99,102,241,0.15)] resize-none"
                  />
                </div>
              </div>

              <button
                onClick={handleCreateCommunity}
                disabled={!communityName.trim()}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all duration-300 relative z-10 ${
                  communityName.trim()
                    ? 'bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]'
                    : 'bg-slate-100 dark:bg-slate-850 text-slate-450 dark:text-slate-500 cursor-not-allowed border border-slate-200/40 dark:border-slate-800/40'
                }`}
              >
                Assemble Community
              </button>
            </motion.div>
          </motion.div>
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
        storySliderEnabled={storySliderEnabled}
        setStorySliderEnabled={setStorySliderEnabled}
        storyAudience={storyAudience}
        setStoryAudience={setStoryAudience}
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
        onPollVote={handleStoryPollVote}
        onQuestionAnswer={handleStoryQuestionAnswer}
        onSliderResponse={handleStorySliderResponse}
      />

      {/* 10. Connect via Code Modal Overlay */}
      <AnimatePresence>
        {connectModalOpen && (
          <div 
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-3 sm:p-6 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setConnectModalOpen(false); 
                setMyConnectionCode(''); 
                setMyCodeExpiresAt(null);
                setEnterConnectionCode('');
                setConnectError('');
                setConnectSuccess('');
              }
            }}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="w-full max-w-[420px] bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-slate-800/40 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4)] space-y-5 text-left relative overflow-hidden"
            >
              {/* Background glowing decorations */}
              <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-28 h-28 rounded-full bg-pink-500/10 blur-2xl pointer-events-none" />

              <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800/40 relative z-10">
                <h3 className="font-extrabold text-lg text-slate-850 dark:text-white flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <span className="tracking-tight">Connect with Code</span>
                </h3>
                <button 
                  onClick={() => { 
                    setConnectModalOpen(false); 
                    setMyConnectionCode(''); 
                    setMyCodeExpiresAt(null);
                    setEnterConnectionCode('');
                    setConnectError('');
                    setConnectSuccess('');
                  }} 
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Enter Connection Code */}
              <form onSubmit={handleResolveCode} className="space-y-3.5 pt-1 relative z-10">
                <div>
                  <label className="block text-[9.5px] font-black text-slate-500 dark:text-slate-450 uppercase tracking-widest mb-2">Enter Friend's 4-Digit Code</label>
                  <div className="flex gap-2.5">
                    <input
                      type="text"
                      maxLength={4}
                      value={enterConnectionCode}
                      onChange={(e) => setEnterConnectionCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 5839"
                      className="flex-1 h-11.5 rounded-2xl text-center text-xl font-black tracking-[0.2em] bg-slate-50/50 dark:bg-slate-950/40 border border-slate-205 dark:border-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-slate-800 dark:text-white transition-all placeholder:text-slate-400 placeholder:font-normal placeholder:tracking-normal"
                    />
                    <button
                      type="submit"
                      disabled={connectLoading || enterConnectionCode.length !== 4}
                      className="px-6 h-11.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-indigo-500/40 disabled:to-purple-600/40 disabled:scale-100 disabled:cursor-not-allowed hover:scale-[1.02] text-white font-extrabold text-xs shadow-md shadow-indigo-500/15 active:scale-98 transition-all flex items-center justify-center shrink-0"
                    >
                      {connectLoading ? 'Connecting...' : 'Connect'}
                    </button>
                  </div>
                </div>
              </form>

              <div className="relative py-2 flex items-center shrink-0 z-10">
                <div className="flex-grow border-t border-slate-100 dark:border-slate-800/40"></div>
                <span className="flex-shrink mx-4 text-[8.5px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest">OR</span>
                <div className="flex-grow border-t border-slate-100 dark:border-slate-800/40"></div>
              </div>

              {/* Generate Your Code */}
              <div className="space-y-4 text-center relative z-10">
                <div>
                  <p className="text-[9.5px] font-black text-slate-500 dark:text-slate-455 uppercase tracking-widest mb-2.5">Share Your Temporary Code</p>
                  
                  {myConnectionCode ? (
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500/5 to-purple-500/5 dark:from-indigo-550/10 dark:to-purple-550/10 border border-indigo-500/15 dark:border-indigo-500/25 flex flex-col items-center gap-2.5 shadow-inner">
                      <span className="text-4xl font-extrabold tracking-[0.2em] bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 font-mono select-all">
                        {myConnectionCode}
                      </span>
                      <span className="text-[9px] font-black tracking-wide text-indigo-650 dark:text-indigo-400 bg-indigo-500/10 dark:bg-indigo-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                        {codeCountdown || 'Expires soon'}
                      </span>
                    </div>
                  ) : (
                    <div className="p-5 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/40 italic text-xs text-slate-500 dark:text-slate-450">
                      No active connection code generated yet.
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={generateMyCode}
                  className="w-full h-11 rounded-2xl bg-white dark:bg-slate-950 hover:bg-slate-55 dark:hover:bg-slate-900 border border-slate-205 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-extrabold text-xs transition-all active:scale-[0.99] flex items-center justify-center gap-2 shadow-sm"
                >
                  {myConnectionCode ? 'Generate New Code' : 'Generate Temporary Code'}
                </button>
              </div>

              {/* Notifications / Alerts */}
              {connectError && (
                <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold text-center animate-in fade-in slide-in-from-top-1">
                  {connectError}
                </div>
              )}
              {connectSuccess && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold text-center animate-in fade-in slide-in-from-top-1">
                  {connectSuccess}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer Branding Widget */}
      <div 
        ref={brandingRef}
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 pointer-events-auto select-none"
        onMouseEnter={() => setBrandingHovered(true)}
        onMouseLeave={() => setBrandingHovered(false)}
      >
        <AnimatePresence>
          {(showBrandingLabel || brandingHovered) && (
            <motion.a 
              href="https://www.linkedin.com/in/samaksh-rastogi-9638b9254/"
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, x: 15, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 15, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 flex items-center shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.08)] whitespace-nowrap cursor-pointer hover:scale-[1.02] transition-transform"
            >
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-350">
                Developed by <span className="text-[#0f766e] dark:text-teal-400 font-extrabold underline decoration-2 underline-offset-4">Samaksh Rastogi</span>
              </span>
            </motion.a>
          )}
        </AnimatePresence>
        
        <button 
          onClick={() => setShowBrandingLabel((current) => !current)}
          className="h-10 w-10 rounded-full bg-[#0f172a] dark:bg-slate-950 flex items-center justify-center text-white shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.15)] shrink-0 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title="Developer Info"
        >
          <Code2 className="h-4.5 w-4.5 text-white on-color" />
        </button>
      </div>

    </div>
  );
}
