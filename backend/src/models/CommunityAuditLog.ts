import { Schema, model, Document, Types } from 'mongoose';

export interface ICommunityAuditLog extends Document {
  communityId: Types.ObjectId;
  actorId: Types.ObjectId;
  action: string;
  targetUserId?: Types.ObjectId;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const CommunityAuditLogSchema = new Schema<ICommunityAuditLog>({
  communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
  actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true, index: true },
  targetUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  metadata: { type: Schema.Types.Mixed },
}, { timestamps: { createdAt: true, updatedAt: false } });

CommunityAuditLogSchema.index({ communityId: 1, createdAt: -1 });

export const CommunityAuditLog = model<ICommunityAuditLog>('CommunityAuditLog', CommunityAuditLogSchema);
