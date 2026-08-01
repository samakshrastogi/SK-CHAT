import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';
import { getRequiredEnv } from './env.js';

export const buildMongoUri = (configuredUri: string, databaseName: string) => {
  if (!/^mongodb(?:\+srv)?:\/\//i.test(configuredUri)) {
    throw new Error('MONGODB_URI must use the mongodb:// or mongodb+srv:// protocol');
  }
  const queryIndex = configuredUri.indexOf('?');
  const connectionPart = queryIndex === -1 ? configuredUri : configuredUri.slice(0, queryIndex);
  const queryPart = queryIndex === -1 ? '' : configuredUri.slice(queryIndex);
  const authorityStart = configuredUri.indexOf('://') + 3;
  const pathIndex = connectionPart.indexOf('/', authorityStart);
  const authority = pathIndex === -1 ? connectionPart : connectionPart.slice(0, pathIndex);
  return `${authority}/${encodeURIComponent(databaseName)}${queryPart}`;
};

export const connectDB = async (): Promise<void> => {
  const configuredUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const databaseName = process.env.MONGODB_DATABASE || (process.env.NODE_ENV === 'production' ? getRequiredEnv('MONGODB_DATABASE') : 'connect');
  const connUri = buildMongoUri(configuredUri, databaseName);
  mongoose.set('strictQuery', true);

  while (mongoose.connection.readyState !== 1) {
    try {
      const conn = await mongoose.connect(connUri);
      logger.info(`MongoDB connected to configured database on ${conn.connection.host}`);
      break;
    } catch (error: any) {
      logger.error(`Error connecting to MongoDB (retrying in 5s): ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  mongoose.connection.on('error', (err) => {
    logger.error(`MongoDB connection error: ${err}`);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });
};