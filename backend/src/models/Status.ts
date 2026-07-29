import { Schema, model, Document, Types } from 'mongoose';

export interface IStatus extends Document {
  userId: Types.ObjectId;
  type: 'text' | 'image' | 'video' | 'gif';
  content: string;
  caption?: string;
  backgroundColor?: string;
  audience: 'public' | 'contacts' | 'selected';
  allowedUsers: Types.ObjectId[];
  excludedUsers: Types.ObjectId[];
  metadata?: {
    music?: string;
    mention?: string;
    location?: string;
    hashtags?: string[];
  };
  poll?: {
    question: string;
    options: { id: string; text: string; voters: Types.ObjectId[] }[];
  };
  question?: {
    prompt: string;
    answers: { userId: Types.ObjectId; text: string; createdAt: Date }[];
  };
  slider?: {
    emoji: string;
    responses: { userId: Types.ObjectId; value: number }[];
  };
  views: { userId: Types.ObjectId; viewedAt: Date }[];
  likes: Types.ObjectId[];
  expiresAt: Date;
  createdAt: Date;
}

const StatusSchema = new Schema<IStatus>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['text', 'image', 'video', 'gif'], required: true },
  content: { type: String, required: true, maxlength: 5000 },
  caption: { type: String, default: '', maxlength: 1000 },
  backgroundColor: { type: String, default: '#000000' },
  audience: { type: String, enum: ['public', 'contacts', 'selected'], default: 'contacts', index: true },
  allowedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  excludedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  metadata: {
    music: { type: String, maxlength: 120 },
    mention: { type: String, maxlength: 80 },
    location: { type: String, maxlength: 120 },
    hashtags: [{ type: String, maxlength: 50 }],
  },
  poll: {
    question: { type: String, maxlength: 200 },
    options: [{
      id: { type: String, required: true },
      text: { type: String, required: true, maxlength: 100 },
      voters: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    }],
  },
  question: {
    prompt: { type: String, maxlength: 200 },
    answers: [{
      userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      text: { type: String, required: true, maxlength: 500 },
      createdAt: { type: Date, default: Date.now },
    }],
  },
  slider: {
    emoji: { type: String, maxlength: 16 },
    responses: [{
      userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      value: { type: Number, min: 0, max: 100, required: true },
    }],
  },
  views: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    viewedAt: { type: Date, default: Date.now },
  }],
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: { createdAt: true, updatedAt: false } });

StatusSchema.index({ userId: 1, expiresAt: -1 });

export const Status = model<IStatus>('Status', StatusSchema);
