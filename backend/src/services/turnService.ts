import crypto from 'node:crypto';
import { CustomError } from '../utils/customError.js';

export interface TurnConfiguration {
  stunUrls: string[];
  turnUrls: string[];
  sharedSecret?: string;
  credentialTtlSeconds: number;
}

const parseUrls = (value: string) =>
  value.split(',').map((url) => url.trim()).filter(Boolean);

export const getTurnConfiguration = (): TurnConfiguration => ({
  stunUrls: parseUrls(
    process.env.STUN_URLS ||
      'stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302'
  ),
  turnUrls: parseUrls(process.env.TURN_URLS || ''),
  sharedSecret: process.env.TURN_SHARED_SECRET?.trim(),
  credentialTtlSeconds: Math.max(
    300,
    Number(process.env.TURN_CREDENTIAL_TTL_SECONDS || 3600)
  ),
});

export const createTurnCredentials = (
  userId: string,
  sharedSecret: string,
  credentialTtlSeconds: number,
  now = Date.now()
) => {
  if (!sharedSecret.trim()) {
    throw new CustomError('TURN service is not configured', 503);
  }

  const username = `${Math.floor(now / 1000) + credentialTtlSeconds}:${userId}`;
  const credential = crypto
    .createHmac('sha1', sharedSecret)
    .update(username)
    .digest('base64');

  return { username, credential };
};

export const buildIceServers = (userId: string, now = Date.now()) => {
  const config = getTurnConfiguration();
  const iceServers: Array<{
    urls: string[];
    username?: string;
    credential?: string;
  }> = [{ urls: config.stunUrls }];

  if (config.turnUrls.length) {
    const credentials = createTurnCredentials(
      userId,
      config.sharedSecret || '',
      config.credentialTtlSeconds,
      now
    );
    iceServers.push({ urls: config.turnUrls, ...credentials });
  }

  return { iceServers, expiresIn: config.credentialTtlSeconds };
};
const cloudflareCache = new Map<string, { value: ReturnType<typeof buildIceServers>; expiresAt: number }>();

export const getIceServersForUser = async (userId: string) => {
  if ((process.env.TURN_PROVIDER || 'coturn').toLowerCase() !== 'cloudflare') {
    return buildIceServers(userId);
  }

  const cached = cloudflareCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const tokenId = process.env.CLOUDFLARE_TURN_TOKEN_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_TURN_API_TOKEN?.trim();
  if (!tokenId || !apiToken) throw new CustomError('Cloudflare TURN is not configured', 503);
  const ttl = Math.max(300, Number(process.env.TURN_CREDENTIAL_TTL_SECONDS || 3600));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(tokenId)}/credentials/generate-ice-servers`,
      {
        method: 'POST',
        headers: { authorization: `Bearer ${apiToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ ttl }),
        signal: controller.signal,
      }
    );
    if (!response.ok) throw new CustomError('Cloudflare TURN credential request failed', 503);
    const payload = await response.json() as { iceServers?: Array<{ urls: string[]; username?: string; credential?: string }> };
    if (!Array.isArray(payload.iceServers) || payload.iceServers.length < 2) {
      throw new CustomError('Cloudflare TURN returned invalid credentials', 503);
    }
    const value = {
      iceServers: payload.iceServers.map((server) => ({
        ...server,
        urls: server.urls.filter((url) => !/:53(?:\?|$)/.test(url)),
      })).filter((server) => server.urls.length > 0),
      expiresIn: ttl,
    };
    cloudflareCache.set(userId, { value, expiresAt: Date.now() + Math.max(60, ttl - 60) * 1000 });
    return value;
  } catch (error) {
    if (error instanceof CustomError) throw error;
    throw new CustomError('Cloudflare TURN credential request failed', 503);
  } finally {
    clearTimeout(timeout);
  }
};
