import { Schema, model, Document, Types } from 'mongoose';

export interface IUploadUsage extends Document {
  userId: Types.ObjectId;
  bucket: string;
  bytes: number;
  files: number;
  expiresAt: Date;
}

const UploadUsageSchema = new Schema<IUploadUsage>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  bucket: { type: String, required: true },
  bytes: { type: Number, required: true, default: 0 },
  files: { type: Number, required: true, default: 0 },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true });

UploadUsageSchema.index({ userId: 1, bucket: 1 }, { unique: true });

export const UploadUsage = model<IUploadUsage>('UploadUsage', UploadUsageSchema);
