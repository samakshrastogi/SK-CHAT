import { Schema, model, Document, Types } from 'mongoose';

export interface IPollOption {
  id: string;
  text: string;
  votes: Types.ObjectId[];
}

export interface IPollData {
  question: string;
  options: IPollOption[];
}

export interface ILocationData {
  latitude: number;
  longitude: number;
  name?: string;
}

export interface IContactData {
  name: string;
  email: string;
  avatar?: string;
}

export interface IReaction {
  userId: Types.ObjectId;
  emoji: string;
}

export interface IMessage extends Document {
  chatId: Types.ObjectId;
  senderId: Types.ObjectId;
  content: string;
  messageType: 'text' | 'image' | 'video' | 'audio' | 'document' | 'voice' | 'location' | 'poll' | 'contact';
  mediaUrl?: string;
  mediaSize?: number;
  fileName?: string;
  pollData?: IPollData;
  locationData?: ILocationData;
  contactData?: IContactData;
  status: 'sent' | 'delivered' | 'seen';
  seenBy: { userId: Types.ObjectId; seenAt: Date }[];
  deliveredTo: { userId: Types.ObjectId; deliveredAt: Date }[];
  replyTo?: Types.ObjectId;
  isEdited: boolean;
  isDeleted: boolean; // True for "Delete for everyone"
  reactions: IReaction[];
  scheduledAt?: Date;
  isForwarded: boolean;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PollOptionSchema = new Schema<IPollOption>({
  id: { type: String, required: true },
  text: { type: String, required: true },
  votes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
}, { _id: false });

const PollDataSchema = new Schema<IPollData>({
  question: { type: String, required: true },
  options: [PollOptionSchema],
}, { _id: false });

const LocationDataSchema = new Schema<ILocationData>({
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  name: { type: String },
}, { _id: false });

const ContactDataSchema = new Schema<IContactData>({
  name: { type: String, required: true },
  email: { type: String, required: true },
  avatar: { type: String },
}, { _id: false });

const ReactionSchema = new Schema<IReaction>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  emoji: { type: String, required: true },
}, { _id: false });

const MessageSchema = new Schema<IMessage>({
  chatId: { type: Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  content: { type: String, default: '' },
  messageType: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'document', 'voice', 'location', 'poll', 'contact'],
    default: 'text'
  },
  mediaUrl: { type: String },
  mediaSize: { type: Number },
  fileName: { type: String },
  pollData: { type: PollDataSchema },
  locationData: { type: LocationDataSchema },
  contactData: { type: ContactDataSchema },
  status: { type: String, enum: ['sent', 'delivered', 'seen'], default: 'sent' },
  seenBy: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    seenAt: { type: Date, default: Date.now }
  }],
  deliveredTo: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    deliveredAt: { type: Date, default: Date.now }
  }],
  replyTo: { type: Schema.Types.ObjectId, ref: 'Message' },
  isEdited: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
  reactions: [ReactionSchema],
  scheduledAt: { type: Date },
  isForwarded: { type: Boolean, default: false },
  expiresAt: { type: Date },
}, {
  timestamps: true,
});

// Indexing for search
MessageSchema.index({ content: 'text' });

export const Message = model<IMessage>('Message', MessageSchema);
