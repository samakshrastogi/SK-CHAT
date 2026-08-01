import { Schema, model, Document, Types } from 'mongoose';

export interface ICall extends Document {
  callerId: Types.ObjectId;
  receiverId?: Types.ObjectId; // Optional for group calls
  participants: Types.ObjectId[];
  chatId: Types.ObjectId;
  type: 'voice' | 'video';
  status: 'initiated' | 'ringing' | 'connected' | 'rejected' | 'missed' | 'completed' | 'busy';
  startedAt?: Date;
  endedAt?: Date;
  duration?: number; // Duration in seconds
  createdAt: Date;
  updatedAt: Date;
}

const CallSchema = new Schema<ICall>({
  callerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  receiverId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  chatId: { type: Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },
  type: { type: String, enum: ['voice', 'video'], required: true },
  status: {
    type: String,
    enum: ['initiated', 'ringing', 'connected', 'rejected', 'missed', 'completed', 'busy'],
    default: 'initiated'
  },
  startedAt: { type: Date },
  endedAt: { type: Date },
  duration: { type: Number, default: 0 }, // in seconds
}, {
  timestamps: true,
});

export const Call = model<ICall>('Call', CallSchema);
