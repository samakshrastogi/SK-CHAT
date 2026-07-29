import { Schema, model, type Document } from 'mongoose';

export type JobType = 'web_push' | 'scheduled_message' | 'community_event_reminder';

export interface IJob extends Document {
  type: JobType;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  runAt: Date;
  attempts: number;
  maxAttempts: number;
  lockedAt?: Date;
  lastError?: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema = new Schema<IJob>({
  type: { type: String, enum: ['web_push', 'scheduled_message', 'community_event_reminder'], required: true, index: true },
  payload: { type: Schema.Types.Mixed, required: true },
  idempotencyKey: { type: String, required: true, unique: true, index: true },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending', index: true },
  runAt: { type: Date, default: Date.now, index: true },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 5 },
  lockedAt: Date,
  lastError: String,
  completedAt: Date,
}, { timestamps: true });

JobSchema.index({ status: 1, runAt: 1 });
JobSchema.index(
  { completedAt: 1 },
  { expireAfterSeconds: 7 * 24 * 60 * 60, partialFilterExpression: { status: 'completed' } },
);

export const Job = model<IJob>('Job', JobSchema);
