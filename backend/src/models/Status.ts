import { Schema, model, Document, Types } from 'mongoose';

export interface IStatus extends Document {
  userId: Types.ObjectId;
  type: 'text' | 'image' | 'video' | 'gif';
  content: string; // URL for media or actual text for text status
  caption?: string;
  backgroundColor?: string; // Hex code for text-only statuses
  views: { userId: Types.ObjectId; viewedAt: Date }[];
  likes: Types.ObjectId[];
  expiresAt: Date;
  createdAt: Date;
}

const StatusSchema = new Schema<IStatus>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['text', 'image', 'video', 'gif'], required: true },
  content: { type: String, required: true },
  caption: { type: String, default: '' },
  backgroundColor: { type: String, default: '#000000' },
  views: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    viewedAt: { type: Date, default: Date.now }
  }],
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  expiresAt: { type: Date, required: true, index: { expires: 0 } }, // Auto deletes 24h later
}, {
  timestamps: { createdAt: true, updatedAt: false },
});

export const Status = model<IStatus>('Status', StatusSchema);
