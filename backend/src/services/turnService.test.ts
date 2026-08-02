import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildIceServers, createTurnCredentials, getIceServersForUser } from './turnService.js';

const originalEnvironment = { ...process.env };

afterEach(() => {
  vi.unstubAllGlobals();
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

  it('retrieves short-lived Cloudflare TURN credentials and removes port 53 URLs', async () => {
    process.env.TURN_PROVIDER = 'cloudflare';
    process.env.CLOUDFLARE_TURN_TOKEN_ID = 'turn-token-id';
    process.env.CLOUDFLARE_TURN_API_TOKEN = 'secret-api-token';
    process.env.TURN_CREDENTIAL_TTL_SECONDS = '600';
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      iceServers: [
        { urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.cloudflare.com:53'] },
        { urls: ['turn:turn.cloudflare.com:3478?transport=udp', 'turn:turn.cloudflare.com:53?transport=udp'], username: 'u', credential: 'p' },
      ],
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await getIceServersForUser('cloudflare-test-user');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://rtc.live.cloudflare.com/v1/turn/keys/turn-token-id/credentials/generate-ice-servers',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ authorization: 'Bearer secret-api-token' }),
        body: JSON.stringify({ ttl: 600 }),
      })
    );
    expect(result.expiresIn).toBe(600);
    expect(result.iceServers.flatMap((server) => server.urls)).not.toContain('stun:stun.cloudflare.com:53');
    expect(JSON.stringify(result)).not.toContain('secret-api-token');
  });
});
