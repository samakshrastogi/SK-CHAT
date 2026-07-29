import { describe, expect, it } from 'vitest';
import { getAIInputSize } from './aiGovernanceMiddleware.js';

describe('AI governance input accounting', () => {
  it('counts request bodies and route parameters without retaining their contents', () => {
    const request = { body: { prompt: 'hello' }, params: { chatId: 'abc' } } as any;
    expect(getAIInputSize(request)).toBe(
      JSON.stringify(request.body).length + JSON.stringify(request.params).length
    );
  });
});
