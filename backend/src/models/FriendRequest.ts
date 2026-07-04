import { Schema, model, Document, Types } from 'mongoose';

export interface IFriendRequest extends Document {
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  mutualFriends?: number;
  createdAt: Date;
  updatedAt: Date;
}

const FriendRequestSchema = new Schema<IFriendRequest>({
  senderId:   { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'cancelled'],
    default: 'pending',
  },
}, {
  timestamps: true,
});

// Prevent duplicate pending requests between the same two users
FriendRequestSchema.index({ senderId: 1, receiverId: 1 }, { unique: true });

export const FriendRequest = model<IFriendRequest>('FriendRequest', FriendRequestSchema);
