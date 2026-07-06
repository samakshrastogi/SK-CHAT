import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

export const connectDB = async (): Promise<void> => {
  const connUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/connect';
  mongoose.set('strictQuery', true);

  while (mongoose.connection.readyState !== 1) {
    try {
      const conn = await mongoose.connect(connUri);
      logger.info(`MongoDB Connected: ${conn.connection.host}`);
      break;
    } catch (error: any) {
      logger.error(`Error connecting to MongoDB (retrying in 5s): ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
  
  // Listen for connection events
  mongoose.connection.on('error', (err) => {
    logger.error(`MongoDB connection error: ${err}`);
  });
  
  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });
};
