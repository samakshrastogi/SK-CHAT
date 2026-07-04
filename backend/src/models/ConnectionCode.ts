import mongoose, { Schema, Document } from 'mongoose';

export interface IConnectionCode extends Document {
  code: string;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  expiresAt: Date;
}

const ConnectionCodeSchema: Schema = new Schema({
  code: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true }
});

// TTL Index to automatically remove expired documents
ConnectionCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ConnectionCode = mongoose.model<IConnectionCode>('ConnectionCode', ConnectionCodeSchema);
