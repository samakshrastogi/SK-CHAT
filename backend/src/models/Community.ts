import { Schema, model, Document, Types } from 'mongoose';

export interface ICommunityRole {
  name: string;
  color: string;
  permissions?: string[];
}

export interface ICommunityMemberRole {
  userId: Types.ObjectId;
  roleName: string;
}

export interface ICommunityEventRSVP {
  userId: Types.ObjectId;
  status: 'going' | 'interested' | 'declining';
}

export interface ICommunityEvent {
  title: string;
  description: string;
  date: Date;
  creatorId: Types.ObjectId;
  rsvps: ICommunityEventRSVP[];
}

export interface ICommunity extends Document {
  name: string;
  description: string;
  avatar: string;
  banner: string;
  creatorId: Types.ObjectId;
  admins: Types.ObjectId[];
  members: Types.ObjectId[];
  announcementChannelId?: Types.ObjectId;
  groupIds: Types.ObjectId[];
  inviteCode: string;
  privacyType: 'public' | 'private' | 'invite-only';
  tags: string[];
  welcomeMessage: string;
  guidelines: string;
  autoModeration: boolean;
  verificationBadge: boolean;
  communityLevel: number;
  roles: ICommunityRole[];
  memberRoles: ICommunityMemberRole[];
  events: ICommunityEvent[];
  bannedMembers: { userId: Types.ObjectId; reason?: string; bannedBy: Types.ObjectId; expiresAt?: Date; createdAt: Date }[];
  createdAt: Date;
  updatedAt: Date;
}

const CommunitySchema = new Schema<ICommunity>({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  avatar: { type: String, default: '' },
  banner: { type: String, default: '' },
  creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  admins: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  announcementChannelId: { type: Schema.Types.ObjectId, ref: 'Chat' },
  groupIds: [{ type: Schema.Types.ObjectId, ref: 'Chat' }],
  inviteCode: { type: String, required: true, unique: true },
  privacyType: { type: String, enum: ['public', 'private', 'invite-only'], default: 'public' },
  tags: [{ type: String }],
  welcomeMessage: { type: String, default: '' },
  guidelines: { type: String, default: '' },
  autoModeration: { type: Boolean, default: true },
  verificationBadge: { type: Boolean, default: false },
  communityLevel: { type: Number, default: 1 },
  roles: [{
    name: { type: String, required: true },
    color: { type: String, default: '#6366f1' },
    permissions: [{ type: String }]
  }],
  memberRoles: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    roleName: { type: String, required: true }
  }],
  bannedMembers: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, maxlength: 500 },
    bannedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
  }],
  events: [{
    title: { type: String, required: true },
    description: { type: String, default: '' },
    date: { type: Date, required: true },
    creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rsvps: [{
      userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      status: { type: String, enum: ['going', 'interested', 'declining'], default: 'going' }
    }]
  }]
}, {
  timestamps: true,
});

export const Community = model<ICommunity>('Community', CommunitySchema);
