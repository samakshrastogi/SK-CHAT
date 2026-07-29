import { Schema, model, Document, Types } from 'mongoose';

export interface IAIUsage extends Document {
  userId: Types.ObjectId;
  bucket: string;
  requests: number;
  inputCharacters: number;
  expiresAt: Date;
}

const AIUsageSchema = new Schema<IAIUsage>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  bucket: { type: String, required: true },
  requests: { type: Number, default: 0 },
  inputCharacters: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true });
AIUsageSchema.index({ userId: 1, bucket: 1 }, { unique: true });

export const AIUsage = model<IAIUsage>('AIUsage', AIUsageSchema);
