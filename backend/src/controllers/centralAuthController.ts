import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { DeviceSession } from '../models/DeviceSession.js';
import { CustomError } from '../utils/customError.js';
import { getJwtAccessSecret, getJwtRefreshSecret } from '../config/env.js';

type CentralPayload = {
  iss: string;
  aud: string;
  sub: string;
  email: string;
  name: string;
  role?: string;
  exp: number;
};

const centralApiUrl = (process.env.SK_CENTRAL_API_URL || 'https://www.sk-hub.in/api').replace(/\/$/, '');
const validCentralAvatar = (value: unknown) => {
  if (typeof value !== 'string' || value.length > 250_000) return '';
  const avatar = value.trim();
  return /^(https:\/\/|data:image\/(?:png|jpe?g|webp|gif);base64,)/i.test(avatar) ? avatar : '';
};

const isCentralPayload = (value: unknown): value is CentralPayload => {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Partial<CentralPayload>;
  return payload.iss === 'sk-central' && payload.aud === 'sk-chat' &&
    typeof payload.sub === 'string' && typeof payload.email === 'string' &&
    typeof payload.name === 'string' && typeof payload.exp === 'number' &&
    payload.exp > Math.floor(Date.now() / 1000);
};

const verifyCentralToken = async (token: string): Promise<CentralPayload | null> => {
  const secret = process.env.SK_CENTRAL_SSO_SECRET?.trim();
  if (secret) {
    try {
      const payload = jwt.verify(token, secret, { issuer: 'sk-central', audience: 'sk-chat' });
      if (isCentralPayload(payload)) return payload;
    } catch {
      // A secret mismatch should not lock users out while Render is being synchronized.
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`${centralApiUrl}/auth/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ token }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const result = await response.json() as { data?: { valid?: boolean; payload?: unknown } };
    return result.data?.valid && isCentralPayload(result.data.payload) ? result.data.payload : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const uniqueUsername = async (name: string, email: string) => {
  const base = (name || email.split('@')[0]).replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20) || 'user';
  let candidate = base;
  for (let index = 0; index < 20; index += 1) {
    const found = await User.findOne({ username: candidate });
    if (!found) return candidate;
    candidate = `${base.slice(0, 16)}${index + 2}`;
  }
  return `${base.slice(0, 12)}${Date.now().toString().slice(-6)}`;
};

export const centralLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token : '';
    const payload = token ? await verifyCentralToken(token) : null;
    if (!payload) throw new CustomError('SK Central session expired or invalid', 401);

    const email = payload.email.trim().toLowerCase();
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        email,
        username: await uniqueUsername(payload.name, email),
        isVerified: true,
        role: payload.role === 'admin' ? 'admin' : 'user',
        avatar: validCentralAvatar(req.body?.centralAvatar),
      });
    } else {
      user.isVerified = true;
      user.role = payload.role === 'admin' ? 'admin' : 'user';
      const centralAvatar = validCentralAvatar(req.body?.centralAvatar);
      if (centralAvatar) user.avatar = centralAvatar;
      await user.save();
    }

    const requestedDeviceId = typeof req.body?.deviceId === 'string' ? req.body.deviceId.trim() : '';
    const deviceId = requestedDeviceId || crypto.randomUUID();
    const accessToken = jwt.sign(
      { id: user._id, email: user.email, username: user.username, role: user.role, deviceId },
      getJwtAccessSecret(),
      { expiresIn: (process.env.JWT_ACCESS_EXPIRY || '15m') as jwt.SignOptions['expiresIn'] }
    );
    const refreshToken = jwt.sign(
      { id: user._id, deviceId },
      getJwtRefreshSecret(),
      { expiresIn: (process.env.JWT_REFRESH_EXPIRY || '7d') as jwt.SignOptions['expiresIn'] }
    );

    await DeviceSession.findOneAndUpdate({ userId: user._id, deviceId }, {
      userId: user._id,
      refreshToken: crypto.createHash('sha256').update(refreshToken).digest('hex'),
      deviceId,
      deviceType: req.body?.deviceType || req.headers['user-agent'] || 'SK Central Web',
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      lastActive: new Date(),
      isActive: true,
    }, { upsert: true, new: true, setDefaultsOnInsert: true });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      accessToken,
      user: {
        id: user._id,
        _id: user._id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        coverImage: user.coverImage,
        bio: user.bio,
        role: user.role,
        themeSettings: user.themeSettings,
      },
    });
  } catch (error) {
    next(error);
  }
};
