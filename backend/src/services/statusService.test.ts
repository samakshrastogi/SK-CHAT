import { describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { buildStatusVisibilityQuery, presentStatus } from './statusService.js';

describe('story privacy and presentation', () => {
  it('builds audience clauses for self, public, contacts, and selected viewers', () => {
    const viewer = new Types.ObjectId();
    const friend = new Types.ObjectId();
    const query = buildStatusVisibilityQuery(viewer.toString(), [friend]);
    expect(query.$or).toHaveLength(4);
    expect(query.$or[2]).toMatchObject({ audience: 'contacts' });
    expect(query.$or[3]).toMatchObject({ audience: 'selected' });
  });

  it('hides voter identities and private answers from viewers', () => {
    const viewer = new Types.ObjectId();
    const owner = new Types.ObjectId();
    const value = presentStatus({
      userId: owner,
      views: [{ userId: viewer }],
      poll: { question: 'Choose', options: [{ id: 'a', text: 'A', voters: [viewer] }] },
      question: { prompt: 'Why?', answers: [{ userId: viewer, text: 'Because' }] },
      slider: { emoji: '🔥', responses: [{ userId: viewer, value: 80 }] },
    }, viewer.toString());
    expect(value.poll.options[0]).toMatchObject({ votes: 1, selected: true });
    expect(value.poll.options[0].voters).toBeUndefined();
    expect(value.question.answers).toBeUndefined();
    expect(value.question.answered).toBe(true);
    expect(value.slider).toMatchObject({ value: 80, average: 80, responseCount: 1 });
    expect(value.views).toBe(1);
  });
});
