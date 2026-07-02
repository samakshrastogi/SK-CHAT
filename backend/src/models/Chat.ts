import { Schema, model, Document, Types } from 'mongoose';

export interface IChat extends Document {
  name?: string; // Optional for direct chats
  isGroup: boolean;
  isCommunity: boolean;
  avatar?: string;
  description?: string;
  creatorId?: Types.ObjectId;
  admins: Types.ObjectId[];
  participants: Types.ObjectId[];
  lastMessage?: Types.ObjectId;
  pinnedMessages: Types.ObjectId[];
  inviteCode?: string; // Unique code to join group or channel
  communityId?: Types.ObjectId; // References community if it is a sub-group
  createdAt: Date;
  updatedAt: Date;
}

const ChatSchema = new Schema<IChat>({
  name: { type: String, trim: true },
  isGroup: { type: Boolean, default: false },
  isCommunity: { type: Boolean, default: false },
  avatar: { type: String, default: '' },
  description: { type: String, default: '' },
  creatorId: { type: Schema.Types.ObjectId, ref: 'User' },
  admins: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
  pinnedMessages: [{ type: Schema.Types.ObjectId, ref: 'Message' }],
  inviteCode: { type: String, sparse: true, unique: true },
  communityId: { type: Schema.Types.ObjectId, ref: 'Community' },
}, {
  timestamps: true,
});

export const Chat = model<IChat>('Chat', ChatSchema);
