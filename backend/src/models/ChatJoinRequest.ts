import { Schema, model, Document, Types } from 'mongoose';
export interface IChatJoinRequest extends Document {
  chatId: Types.ObjectId; userId: Types.ObjectId; status: 'pending' | 'approved' | 'rejected';
}
const ChatJoinRequestSchema = new Schema<IChatJoinRequest>({
  chatId: { type: Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
}, { timestamps: true });
ChatJoinRequestSchema.index({ chatId: 1, userId: 1 }, { unique: true });
export const ChatJoinRequest = model<IChatJoinRequest>('ChatJoinRequest', ChatJoinRequestSchema);
