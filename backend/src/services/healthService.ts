import mongoose from 'mongoose';
import { createClient } from 'redis';
import { isConfiguredEnvValue } from '../config/env.js';

type DependencyStatus = {
  status: 'healthy' | 'unhealthy' | 'not_configured';
  latencyMs?: number;
  message?: string;
};

const timed = async (operation: () => Promise<void>): Promise<DependencyStatus> => {
  const started = Date.now();
  try {
    await operation();
    return { status: 'healthy', latencyMs: Date.now() - started };
  } catch (error) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - started,
      message: error instanceof Error ? error.message : 'Unknown dependency error',
    };
  }
};

const redisStatus = async (): Promise<DependencyStatus> => {
  if (!process.env.REDIS_URL) return { status: 'not_configured' };
  return timed(async () => {
    const client = createClient({
      url: process.env.REDIS_URL,
      socket: { connectTimeout: 2000 },
    });
    try {
      await client.connect();
      await client.ping();
    } finally {
      if (client.isOpen) await client.quit();
    }
  });
};

export const getReadiness = async () => {
  const mongodb: DependencyStatus = mongoose.connection.readyState === 1
    ? { status: 'healthy' }
    : { status: 'unhealthy', message: 'MongoDB is not connected' };
  const redis = await redisStatus();
  const cloudinary: DependencyStatus = [
    process.env.CLOUDINARY_CLOUD_NAME,
    process.env.CLOUDINARY_API_KEY,
    process.env.CLOUDINARY_API_SECRET,
  ].every(isConfiguredEnvValue)
    ? { status: 'healthy' }
    : { status: 'not_configured' };

  const dependencies = { mongodb, redis, cloudinary };
  const ready = mongodb.status === 'healthy' && redis.status !== 'unhealthy';
  return { ready, dependencies };
};
