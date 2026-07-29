import { afterEach, describe, expect, it } from 'vitest';
import { buildIceServers, createTurnCredentials } from './turnService.js';

const originalEnvironment = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnvironment };
});

describe('TURN credentials', () => {
  it('creates deterministic short-lived HMAC credentials', () => {
    expect(createTurnCredentials('user-1', 'shared-secret', 600, 1_700_000_000_000))
      .toEqual({
        username: '1700000600:user-1',
        credential: 'Io2rKGSELJ3Zg/hKALu8dXKlq9I=',
      });
  });

  it('returns STUN and configured TURN servers without exposing the secret', () => {
    process.env.STUN_URLS = 'stun:one.example.test';
    process.env.TURN_URLS = 'turn:one.example.test,turns:two.example.test';
    process.env.TURN_SHARED_SECRET = 'shared-secret';
    process.env.TURN_CREDENTIAL_TTL_SECONDS = '600';

    const result = buildIceServers('user-1', 1_700_000_000_000);

    expect(result.expiresIn).toBe(600);
    expect(result.iceServers).toHaveLength(2);
    expect(result.iceServers[1]).toMatchObject({
      urls: ['turn:one.example.test', 'turns:two.example.test'],
      username: '1700000600:user-1',
    });
    expect(JSON.stringify(result)).not.toContain('shared-secret');
  });
});

