import { Schema, model, type Document, Types } from 'mongoose';

export interface IDeviceKey extends Document {
  userId: Types.ObjectId;
  deviceId: string;
  publicKey: Record<string, unknown>;
  fingerprint: string;
  revokedAt?: Date;
  lastUsedAt: Date;
}

const DeviceKeySchema = new Schema<IDeviceKey>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  deviceId: { type: String, required: true },
  publicKey: { type: Schema.Types.Mixed, required: true },
  fingerprint: { type: String, required: true },
  revokedAt: Date,
  lastUsedAt: { type: Date, default: Date.now },
}, { timestamps: true });

DeviceKeySchema.index({ userId: 1, deviceId: 1 }, { unique: true });

export const DeviceKey = model<IDeviceKey>('DeviceKey', DeviceKeySchema);
