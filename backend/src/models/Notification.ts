import mongoose, { Schema, Document } from 'mongoose';

export type NotificationType =
  | 'new_message'
  | 'mention'
  | 'friend_request'
  | 'friend_request_accepted'
  | 'community_invitation'
  | 'community_join_request'
  | 'community_join_approved'
  | 'event_reminder'
  | 'reaction'
  | 'reply'
  | 'call_missed'
  | 'group_added'
  | 'system';

export interface INotification extends Document {
  recipientId: mongoose.Types.ObjectId;
  actorId?: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  imageUrl?: string;
  referenceId?: string;   // chatId / communityId / messageId etc.
  referenceType?: 'chat' | 'community' | 'message' | 'user' | 'call' | 'status';
  isRead: boolean;
  isDelivered: boolean;
  createdAt: Date;
  expiresAt?: Date;
  idempotencyKey?: string;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actorId:     { type: Schema.Types.ObjectId, ref: 'User' },
    type:        { type: String, required: true },
    title:       { type: String, required: true },
    body:        { type: String, required: true },
    imageUrl:    { type: String },
    referenceId:   { type: String },
    referenceType: { type: String, enum: ['chat', 'community', 'message', 'user', 'call', 'status'] },
    isRead:      { type: Boolean, default: false },
    isDelivered: { type: Boolean, default: false },
    expiresAt:   { type: Date },
    idempotencyKey: { type: String, unique: true, sparse: true, index: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

// Auto-delete expired notifications (TTL index)
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });
// Speed up unread badge queries
NotificationSchema.index({ recipientId: 1, isRead: 1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
