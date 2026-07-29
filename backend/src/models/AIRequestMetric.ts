import { Schema, model, Document, Types } from 'mongoose';

export interface IAIRequestMetric extends Document {
  userId: Types.ObjectId;
  feature: string;
  status: 'success' | 'error' | 'cancelled';
  latencyMs: number;
  inputCharacters: number;
  outputCharacters: number;
  errorCode?: string;
  createdAt: Date;
}

const AIRequestMetricSchema = new Schema<IAIRequestMetric>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  feature: { type: String, required: true, index: true },
  status: { type: String, enum: ['success', 'error', 'cancelled'], required: true },
  latencyMs: { type: Number, required: true },
  inputCharacters: { type: Number, default: 0 },
  outputCharacters: { type: Number, default: 0 },
  errorCode: String,
}, { timestamps: { createdAt: true, updatedAt: false } });
AIRequestMetricSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const AIRequestMetric = model<IAIRequestMetric>('AIRequestMetric', AIRequestMetricSchema);
