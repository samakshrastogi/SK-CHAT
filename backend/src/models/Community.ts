import { Schema, model, Document, Types } from 'mongoose';

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
}, {
  timestamps: true,
});

export const Community = model<ICommunity>('Community', CommunitySchema);
