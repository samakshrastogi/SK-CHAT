import { Schema, model, Document, Types } from 'mongoose';

export interface IAIPreference extends Document {
  userId: Types.ObjectId;
  consented: boolean;
  consentedAt?: Date;
  policyVersion?: string;
}

const AIPreferenceSchema = new Schema<IAIPreference>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  consented: { type: Boolean, default: false },
  consentedAt: Date,
  policyVersion: String,
}, { timestamps: true });

export const AIPreference = model<IAIPreference>('AIPreference', AIPreferenceSchema);
