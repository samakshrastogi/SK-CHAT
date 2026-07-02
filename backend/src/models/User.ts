import { Schema, model, Document, Types } from 'mongoose';

export interface IThemeSettings {
  theme: 'dark' | 'light' | 'system';
  accentColor: string;
  wallpaper: string;
}

export interface IUser extends Document {
  email: string;
  username: string;
  password?: string;
  avatar?: string;
  coverImage?: string;
  bio?: string;
  status: 'online' | 'offline' | 'busy' | 'away';
  lastSeen: Date;
  isVerified: boolean;
  verificationToken?: string;
  verificationTokenExpires?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  role: 'user' | 'moderator' | 'admin';
  themeSettings: IThemeSettings;
  blockedUsers: Types.ObjectId[];
  mutedChats: Types.ObjectId[];
  archivedChats: Types.ObjectId[];
  starredMessages: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const ThemeSettingsSchema = new Schema<IThemeSettings>({
  theme: { type: String, enum: ['dark', 'light', 'system'], default: 'dark' },
  accentColor: { type: String, default: '#6366f1' }, // Indigo default
  wallpaper: { type: String, default: '' },
}, { _id: false });

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
  username: { type: String, required: true, unique: true, index: true, trim: true },
  password: { type: String }, // Optional for OAuth if ever added, but required for local auth
  avatar: { type: String, default: '' },
  coverImage: { type: String, default: '' },
  bio: { type: String, default: 'Hey there! I am using Connect.' },
  status: { type: String, enum: ['online', 'offline', 'busy', 'away'], default: 'offline' },
  lastSeen: { type: Date, default: Date.now },
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  verificationTokenExpires: { type: Date },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  role: { type: String, enum: ['user', 'moderator', 'admin'], default: 'user' },
  themeSettings: { type: ThemeSettingsSchema, default: () => ({}) },
  blockedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  mutedChats: [{ type: Schema.Types.ObjectId, ref: 'Chat' }],
  archivedChats: [{ type: Schema.Types.ObjectId, ref: 'Chat' }],
  starredMessages: [{ type: Schema.Types.ObjectId, ref: 'Message' }],
}, {
  timestamps: true,
});

export const User = model<IUser>('User', UserSchema);
