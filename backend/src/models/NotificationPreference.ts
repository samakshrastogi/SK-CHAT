import { Schema, model, type Document, Types } from 'mongoose';
import type { NotificationType } from './Notification.js';

export interface INotificationPreference extends Document {
  userId: Types.ObjectId;
  enabledTypes: Partial<Record<NotificationType, boolean>>;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
}

const NotificationPreferenceSchema = new Schema<INotificationPreference>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  enabledTypes: { type: Schema.Types.Mixed, default: {} },
  quietHours: {
    enabled: { type: Boolean, default: false },
    start: { type: String, default: '22:00' },
    end: { type: String, default: '08:00' },
    timezone: { type: String, default: 'UTC' },
  },
}, { timestamps: true });

export const NotificationPreference = model<INotificationPreference>(
  'NotificationPreference',
  NotificationPreferenceSchema,
);
