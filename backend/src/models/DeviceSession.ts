import { Schema, model, Document, Types } from 'mongoose';

export interface IDeviceSession extends Document {
  userId: Types.ObjectId;
  refreshToken: string; // Stored as a hashed value for security
  deviceId: string;
  deviceType: string; // e.g., "Windows Chrome", "Mac Safari"
  ipAddress: string;
  lastActive: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DeviceSessionSchema = new Schema<IDeviceSession>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  refreshToken: { type: String, required: true, index: true },
  deviceId: { type: String, required: true },
  deviceType: { type: String, required: true },
  ipAddress: { type: String, required: true },
  lastActive: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
});

export const DeviceSession = model<IDeviceSession>('DeviceSession', DeviceSessionSchema);
