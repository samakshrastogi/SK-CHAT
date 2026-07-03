import React, { useEffect, useRef, useCallback } from 'react';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  MessageCircle,
  AtSign,
  UserPlus,
  Users,
  Calendar,
  Phone,
  Heart,
  Reply,
  ShieldCheck,
  Info,
  Trash2,
  X,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { useNotificationStore } from '../store/notificationStore.js';
import type { Notification as AppNotification, NotificationType } from '../types/index.js';

/* ────────────────────────────────────────────────────────────────────────── */
/*  Helpers                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

const TYPE_META: Record<
  NotificationType,
  { icon: React.ReactNode; color: string; bg: string }
> = {
  new_message:             { icon: <MessageCircle className="h-4 w-4" />, color: 'text-indigo-400',  bg: 'bg-indigo-500/20'  },
  mention:                 { icon: <AtSign        className="h-4 w-4" />, color: 'text-sky-400',     bg: 'bg-sky-500/20'     },
  friend_request:          { icon: <UserPlus      className="h-4 w-4" />, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  friend_request_accepted: { icon: <UserPlus      className="h-4 w-4" />, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  community_invitation:    { icon: <Users         className="h-4 w-4" />, color: 'text-purple-400',  bg: 'bg-purple-500/20'  },
  community_join_request:  { icon: <Users         className="h-4 w-4" />, color: 'text-purple-400',  bg: 'bg-purple-500/20'  },
  community_join_approved: { icon: <ShieldCheck   className="h-4 w-4" />, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  event_reminder:          { icon: <Calendar      className="h-4 w-4" />, color: 'text-amber-400',   bg: 'bg-amber-500/20'   },
  reaction:                { icon: <Heart         className="h-4 w-4" />, color: 'text-pink-400',    bg: 'bg-pink-500/20'    },
  reply:                   { icon: <Reply         className="h-4 w-4" />, color: 'text-cyan-400',    bg: 'bg-cyan-500/20'    },
  call_missed:             { icon: <Phone         className="h-4 w-4" />, color: 'text-red-400',     bg: 'bg-red-500/20'     },
  group_added:             { icon: <Users         className="h-4 w-4" />, color: 'text-violet-400',  bg: 'bg-violet-500/20'  },
  system:                  { icon: <Info          className="h-4 w-4" />, color: 'text-slate-400',   bg: 'bg-slate-500/20'   },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return 'just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Single notification row                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

interface NotifRowProps {
  notif: AppNotification;
  onRead:   (id: string) => void;
  onDelete: (id: string) => void;
}

const NotifRow: React.FC<NotifRowProps> = ({ notif, onRead, onDelete }) => {
  const meta = TYPE_META[notif.type] ?? TYPE_META.system;

  return (
    <div
      className={`group relative flex items-start gap-3 px-4 py-3 hover:bg-slate-800/50 transition-colors cursor-pointer rounded-xl mx-2 ${
        !notif.isRead ? 'bg-indigo-950/30' : ''
      }`}
      onClick={() => !notif.isRead && onRead(notif._id)}
    >
      {/* Unread indicator */}
      {!notif.isRead && (
        <span className="absolute left-2 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-indigo-500 flex-shrink-0" />
      )}

      {/* Icon */}
      <div className={`flex-shrink-0 h-9 w-9 rounded-full flex items-center justify-center ${meta.bg} ${meta.color} mt-0.5`}>
        {meta.icon}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold leading-tight ${notif.isRead ? 'text-slate-300' : 'text-white'}`}>
          {notif.title}
        </p>
        <p className="text-xs text-slate-400 mt-0.5 leading-snug line-clamp-2">{notif.body}</p>
        <p className="text-[10px] text-slate-600 mt-1">{timeAgo(notif.createdAt)}</p>
      </div>

      {/* Delete button — appears on hover */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(notif._id); }}
        className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1 rounded-lg hover:bg-red-500/20 text-slate-600 hover:text-red-400 transition-all"
        title="Remove"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────────────── */
/*  Notification Settings sub-panel                                            */
/* ────────────────────────────────────────────────────────────────────────── */

interface SettingsPanelProps {
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const { subscribeToPush, unsubscribeFromPush, requestBrowserPermission } = useNotificationStore();

  const handleEnablePush = async () => {
    await requestBrowserPermission();
    await subscribeToPush();
  };

  return (
    <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm z-10 rounded-2xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
        <h3 className="text-sm font-bold text-white">Notification Settings</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Browser Notifications */}
        <section>
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Browser Notifications</h4>
          <div className="bg-slate-900 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-200 font-medium">Desktop alerts</p>
                <p className="text-xs text-slate-500">Show browser notifications</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                typeof window !== 'undefined' && window.Notification?.permission === 'granted'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-slate-700 text-slate-400'
              }`}>
                {typeof window !== 'undefined' && window.Notification?.permission === 'granted' ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <button
              onClick={handleEnablePush}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm py-2 rounded-lg font-medium transition-colors"
            >
              Enable Browser Notifications
            </button>
          </div>
        </section>

        {/* Push Notifications */}
        <section>
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Push Notifications</h4>
          <div className="bg-slate-900 rounded-xl p-4 space-y-3">
            <p className="text-xs text-slate-400 leading-relaxed">
              Receive push notifications even when the app is closed. Requires browser notification permission.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleEnablePush}
                className="flex-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-sm py-2 rounded-lg font-medium transition-colors border border-emerald-600/30"
              >
                Subscribe
              </button>
              <button
                onClick={unsubscribeFromPush}
                className="flex-1 bg-red-600/10 hover:bg-red-600/20 text-red-400 text-sm py-2 rounded-lg font-medium transition-colors border border-red-600/20"
              >
                Unsubscribe
              </button>
            </div>
          </div>
        </section>

        {/* Notification Types */}
        <section>
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Notification Types</h4>
          <div className="bg-slate-900 rounded-xl overflow-hidden divide-y divide-slate-800">
            {[
              { label: 'New messages',         sub: 'When someone sends you a message' },
              { label: 'Mentions',             sub: 'When someone @mentions you' },
              { label: 'Friend requests',      sub: 'When someone adds you' },
              { label: 'Community invitations',sub: 'When invited to a community' },
              { label: 'Event reminders',      sub: 'Before an event starts' },
              { label: 'Missed calls',         sub: 'When you miss a call' },
            ].map(({ label, sub }) => (
              <div key={label} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm text-slate-200">{label}</p>
                  <p className="text-xs text-slate-500">{sub}</p>
                </div>
                {/* Visual toggle — state managed locally/in settings */}
                <div className="h-5 w-9 bg-indigo-600 rounded-full relative cursor-pointer">
                  <span className="absolute right-0.5 top-0.5 h-4 w-4 bg-white rounded-full shadow" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────────────── */
/*  Main NotificationPanel                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose }) => {
  const {
    notifications,
    unreadCount,
    isLoading,
    hasMore,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotificationStore();

  const [showSettings, setShowSettings] = React.useState(false);
  const [activeFilter, setActiveFilter] = React.useState<'all' | 'unread' | 'mentions' | 'requests'>('all');
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Initial load
  useEffect(() => {
    if (isOpen) {
      fetchNotifications(true);
    }
  }, [isOpen]);

  // Infinite scroll
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 60 && !isLoading && hasMore) {
        fetchNotifications();
      }
    },
    [isLoading, hasMore, fetchNotifications]
  );

  const filtered = notifications.filter((n) => {
    if (activeFilter === 'unread')   return !n.isRead;
    if (activeFilter === 'mentions') return n.type === 'mention';
    if (activeFilter === 'requests') return n.type === 'friend_request' || n.type === 'community_invitation';
    return true;
  });

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-4 top-16 z-50 w-[380px] max-h-[85vh] bg-slate-950 border border-slate-800/80 rounded-2xl shadow-2xl shadow-black/60 flex flex-col overflow-hidden animate-in slide-in-from-top-2 duration-200">

        {/* Settings overlay */}
        {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                title="Mark all as read"
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition-colors"
              >
                <CheckCheck className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => fetchNotifications(true)}
              title="Refresh"
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowSettings(true)}
              title="Settings"
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <Settings className="h-4 w-4" />
            </button>
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                title="Clear all"
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Filter tabs ─────────────────────────────────────────────────── */}
        <div className="flex gap-1 px-4 py-2 border-b border-slate-800/60 flex-shrink-0">
          {(['all', 'unread', 'mentions', 'requests'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${
                activeFilter === f
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {f === 'all' ? 'All' : f === 'unread' ? `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}` : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Notification list ────────────────────────────────────────────── */}
        <div
          className="flex-1 overflow-y-auto py-2 space-y-0.5 custom-scrollbar"
          onScroll={handleScroll}
        >
          {filtered.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="h-16 w-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                <BellOff className="h-7 w-7 text-slate-600" />
              </div>
              <p className="text-sm font-semibold text-slate-400">
                {activeFilter === 'all' ? 'No notifications yet' : `No ${activeFilter} notifications`}
              </p>
              <p className="text-xs text-slate-600 mt-1">
                {activeFilter === 'all'
                  ? "You're all caught up! We'll notify you when something happens."
                  : 'Switch to "All" to see everything.'}
              </p>
            </div>
          ) : (
            <>
              {filtered.map((n) => (
                <NotifRow
                  key={n._id}
                  notif={n}
                  onRead={markAsRead}
                  onDelete={deleteNotification}
                />
              ))}

              {isLoading && (
                <div className="flex justify-center py-4">
                  <RefreshCw className="h-5 w-5 text-slate-600 animate-spin" />
                </div>
              )}

              {!hasMore && filtered.length > 0 && (
                <p className="text-center text-xs text-slate-700 py-4">
                  You've reached the end ✓
                </p>
              )}
            </>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        {unreadCount > 0 && (
          <div className="flex-shrink-0 border-t border-slate-800 px-4 py-2.5">
            <button
              onClick={markAllAsRead}
              className="w-full flex items-center justify-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              <Check className="h-4 w-4" />
              Mark all as read
            </button>
          </div>
        )}
      </div>
    </>
  );
};

/* ────────────────────────────────────────────────────────────────────────── */
/*  Notification Bell Button (use in Navbar/Sidebar)                           */
/* ────────────────────────────────────────────────────────────────────────── */

interface NotificationBellProps {
  onClick: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onClick }) => {
  const { unreadCount, fetchUnreadCount } = useNotificationStore();

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60_000); // Poll every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <button
      id="notification-bell-btn"
      onClick={onClick}
      className="relative p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
      title="Notifications"
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-indigo-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
};
