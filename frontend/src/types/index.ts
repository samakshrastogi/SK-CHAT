export interface ThemeSettings {
  theme: 'dark' | 'light' | 'system';
  accentColor: string;
  wallpaper: string;
}

export interface User {
  id: string;
  _id: string;
  email: string;
  username: string;
  avatar?: string;
  coverImage?: string;
  bio?: string;
  status: 'online' | 'offline' | 'busy' | 'away';
  lastSeen: string;
  role: 'user' | 'moderator' | 'admin';
  themeSettings: ThemeSettings;
  blockedUsers: string[];
  mutedChats: string[];
  archivedChats: string[];
  starredMessages: string[];
  createdAt: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // User IDs
}

export interface PollData {
  question: string;
  options: PollOption[];
}

export interface LocationData {
  latitude: number;
  longitude: number;
  name?: string;
}

export interface ContactData {
  name: string;
  email: string;
  avatar?: string;
}

export interface Reaction {
  userId: string;
  emoji: string;
}

export interface Message {
  _id: string;
  chatId: string;
  senderId: User | string; // Populated User or ID string
  content: string;
  messageType: 'text' | 'image' | 'video' | 'audio' | 'document' | 'voice' | 'location' | 'poll' | 'contact';
  mediaUrl?: string;
  mediaSize?: number;
  fileName?: string;
  pollData?: PollData;
  locationData?: LocationData;
  contactData?: ContactData;
  status: 'sent' | 'delivered' | 'seen';
  seenBy: { userId: string; seenAt: string }[];
  deliveredTo: { userId: string; deliveredAt: string }[];
  replyTo?: Message;
  isEdited: boolean;
  isDeleted: boolean;
  reactions: Reaction[];
  scheduledAt?: string;
  isForwarded: boolean;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Chat {
  _id: string;
  name?: string;
  isGroup: boolean;
  isCommunity: boolean;
  avatar?: string;
  description?: string;
  creatorId?: string;
  admins: (User | string)[];
  participants: User[];
  lastMessage?: Message;
  pinnedMessages: string[];
  inviteCode?: string;
  communityId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Status {
  _id: string;
  userId: User;
  type: 'text' | 'image' | 'video' | 'gif';
  content: string;
  caption?: string;
  backgroundColor?: string;
  views: { userId: User; viewedAt: string }[];
  likes: string[]; // User IDs
  expiresAt: string;
  createdAt: string;
}

export interface Call {
  _id: string;
  callerId: User;
  receiverId?: User;
  chatId: string;
  type: 'voice' | 'video';
  status: 'initiated' | 'ringing' | 'connected' | 'rejected' | 'missed' | 'completed' | 'busy';
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  createdAt: string;
}

export interface DeviceSession {
  id: string;
  deviceType: string;
  ipAddress: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface Community {
  _id: string;
  name: string;
  description: string;
  avatar: string;
  banner: string;
  creatorId: string;
  admins: (User | string)[];
  members: (User | string)[];
  announcementChannelId?: string;
  groupIds: Chat[];
  inviteCode: string;
  createdAt: string;
}
