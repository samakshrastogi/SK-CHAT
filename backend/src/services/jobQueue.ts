import type { Server } from 'socket.io';
import { Job, type JobType } from '../models/Job.js';
import { Chat } from '../models/Chat.js';
import { Message } from '../models/Message.js';
import { logger } from '../utils/logger.js';
import { deliverWebPush, createNotification } from './notificationService.js';

type EnqueueOptions = {
  idempotencyKey: string;
  runAt?: Date;
  maxAttempts?: number;
};

export const enqueueJob = async (
  type: JobType,
  payload: Record<string, unknown>,
  options: EnqueueOptions,
) => {
  return Job.findOneAndUpdate(
    { idempotencyKey: options.idempotencyKey },
    {
      $setOnInsert: {
        type,
        payload,
        idempotencyKey: options.idempotencyKey,
        runAt: options.runAt || new Date(),
        maxAttempts: options.maxAttempts || 5,
        status: 'pending',
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
};

const deliverScheduledMessage = async (messageId: string, io: Server) => {
  const message = await Message.findById(messageId);
  if (!message || message.isDeleted) return;
  const chat = await Chat.findOne({ _id: message.chatId, participants: message.senderId });
  if (!chat) return;

  chat.lastMessage = message._id as any;
  await chat.save();
  const populated = await Message.findById(message._id)
    .populate('senderId', 'username avatar')
    .populate({ path: 'replyTo', populate: { path: 'senderId', select: 'username' } });
  if (!populated) return;

  let rooms = io.to(`chat:${chat._id}`);
  chat.participants.forEach((participantId) => {
    if (participantId.toString() !== message.senderId.toString()) rooms = rooms.to(`user:${participantId}`);
  });
  rooms.emit('message:receive', populated);

  const senderName = (populated.senderId as any)?.username || 'New message';
  const preview = message.messageType === 'text' ? message.content : `Sent a ${message.messageType}`;
  await Promise.all(chat.participants
    .filter((participantId) => participantId.toString() !== message.senderId.toString())
    .map((participantId) => createNotification({
      recipientId: participantId.toString(),
      actorId: message.senderId.toString(),
      type: 'new_message',
      title: senderName,
      body: preview.slice(0, 120),
      referenceId: chat._id.toString(),
      referenceType: 'chat',
      expiresInHours: 72,
      idempotencyKey: `message:${message._id.toString()}:${participantId.toString()}`,
    })));
};

const processJob = async (job: any, io: Server) => {
  if (job.type === 'web_push') {
    await deliverWebPush(
      String(job.payload.userId),
      String(job.payload.title),
      String(job.payload.body),
      job.payload.icon ? String(job.payload.icon) : undefined,
    );
    return;
  }
  if (job.type === 'scheduled_message') {
    await deliverScheduledMessage(String(job.payload.messageId), io);
    return;
  }
  throw new Error(`Unsupported job type: ${job.type}`);
};

let timer: NodeJS.Timeout | null = null;
let running = false;

export const startJobWorker = (io: Server) => {
  if (timer) return;
  const poll = async () => {
    if (running) return;
    running = true;
    try {
      const staleBefore = new Date(Date.now() - 5 * 60 * 1000);
      await Job.updateMany(
        { status: 'processing', lockedAt: { $lt: staleBefore } },
        { $set: { status: 'pending' }, $unset: { lockedAt: 1 } },
      );
      const job = await Job.findOneAndUpdate(
        { status: 'pending', runAt: { $lte: new Date() } },
        { $set: { status: 'processing', lockedAt: new Date() }, $inc: { attempts: 1 } },
        { sort: { runAt: 1 }, new: true },
      );
      if (!job) return;
      try {
        await processJob(job, io);
        await Job.updateOne(
          { _id: job._id },
          { $set: { status: 'completed', completedAt: new Date() }, $unset: { lockedAt: 1, lastError: 1 } },
        );
      } catch (error) {
        const failed = job.attempts >= job.maxAttempts;
        const backoffMs = Math.min(60_000, 1000 * 2 ** Math.max(0, job.attempts - 1));
        await Job.updateOne(
          { _id: job._id },
          {
            $set: {
              status: failed ? 'failed' : 'pending',
              runAt: new Date(Date.now() + backoffMs),
              lastError: error instanceof Error ? error.message : 'Unknown job failure',
            },
            $unset: { lockedAt: 1 },
          },
        );
        logger.error('job_failed', { jobId: job._id.toString(), type: job.type, failed, error });
      }
    } catch (error) {
      logger.error('job_worker_poll_failed', { error });
    } finally {
      running = false;
    }
  };
  timer = setInterval(() => void poll(), Number(process.env.JOB_POLL_INTERVAL_MS || 1000));
  timer.unref();
  void poll();
  logger.info('job_worker_started');
};

export const stopJobWorker = () => {
  if (timer) clearInterval(timer);
  timer = null;
};
