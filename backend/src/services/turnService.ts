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
