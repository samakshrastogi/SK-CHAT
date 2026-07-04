import { Schema, model, Document, Types } from 'mongoose';

export interface ICommunityJoinRequest extends Document {
  communityId: Types.ObjectId;
  userId: Types.ObjectId;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

const CommunityJoinRequestSchema = new Schema<ICommunityJoinRequest>({
  communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
  userId:      { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status:      { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
}, {
  timestamps: true,
});

// Prevent duplicate pending requests from the same user to the same community
CommunityJoinRequestSchema.index({ communityId: 1, userId: 1 }, { unique: true });

export const CommunityJoinRequest = model<ICommunityJoinRequest>('CommunityJoinRequest', CommunityJoinRequestSchema);
