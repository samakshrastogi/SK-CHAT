import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findOneAndUpdate } = vi.hoisted(() => ({ findOneAndUpdate: vi.fn() }));

vi.mock('../models/Job.js', () => ({
  Job: {
    findOneAndUpdate,
    updateMany: vi.fn(),
    updateOne: vi.fn(),
  },
}));
vi.mock('../models/Chat.js', () => ({ Chat: {} }));
vi.mock('../models/Message.js', () => ({ Message: {} }));
vi.mock('./notificationService.js', () => ({
  deliverWebPush: vi.fn(),
  createNotification: vi.fn(),
}));

import { enqueueJob } from './jobQueue.js';

describe('durable job queue', () => {
  beforeEach(() => {
    findOneAndUpdate.mockReset();
    findOneAndUpdate.mockResolvedValue({ _id: 'job-1' });
  });

  it('upserts jobs by their idempotency key', async () => {
    const runAt = new Date('2030-01-01T00:00:00.000Z');
    await enqueueJob(
      'scheduled_message',
      { messageId: 'message-1' },
      { idempotencyKey: 'scheduled-message:message-1', runAt },
    );

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { idempotencyKey: 'scheduled-message:message-1' },
      {
        $setOnInsert: expect.objectContaining({
          type: 'scheduled_message',
          payload: { messageId: 'message-1' },
          runAt,
          status: 'pending',
        }),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  });
});
