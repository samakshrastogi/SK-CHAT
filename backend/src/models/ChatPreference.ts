import { Schema, model, type Document, Types } from 'mongoose';

export interface IChatPreference extends Document {
  userId: Types.ObjectId;
  chatId: Types.ObjectId;
  notifications: 'all' | 'mentions' | 'none';
  mutedUntil?: Date;
  sound: boolean;
  archived: boolean;
}

const ChatPreferenceSchema = new Schema<IChatPreference>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  chatId: { type: Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },
  notifications: { type: String, enum: ['all', 'mentions', 'none'], default: 'all' },
  mutedUntil: Date,
  sound: { type: Boolean, default: true },
  archived: { type: Boolean, default: false },
}, { timestamps: true });

ChatPreferenceSchema.index({ userId: 1, chatId: 1 }, { unique: true });

export const ChatPreference = model<IChatPreference>('ChatPreference', ChatPreferenceSchema);
