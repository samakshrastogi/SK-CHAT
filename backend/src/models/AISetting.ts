import { Schema, model, Document } from 'mongoose';

export interface IAISetting extends Document {
  key: 'global';
  enabled: boolean;
  dailyRequestLimit: number;
  dailyInputCharacterLimit: number;
  policyVersion: string;
}

const AISettingSchema = new Schema<IAISetting>({
  key: { type: String, enum: ['global'], unique: true, default: 'global' },
  enabled: { type: Boolean, default: true },
  dailyRequestLimit: { type: Number, min: 1, max: 10000, default: 100 },
  dailyInputCharacterLimit: { type: Number, min: 1000, max: 10_000_000, default: 100000 },
  policyVersion: { type: String, default: '2026-07' },
}, { timestamps: true });

export const AISetting = model<IAISetting>('AISetting', AISettingSchema);
