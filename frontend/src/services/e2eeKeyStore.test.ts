import { describe, expect, it } from 'vitest';
import { formatFingerprint } from './e2eeKeyStore.js';

describe('E2EE fingerprint formatting', () => {
  it('formats a stable verification code in readable groups', () => {
    expect(formatFingerprint('00112233445566778899aabbccddeeff'))
      .toBe('0011 2233 4455 6677 8899 aabb ccdd eeff');
  });
});
