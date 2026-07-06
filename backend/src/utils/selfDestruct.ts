import { Message } from '../models/Message.js';
import { logger } from './logger.js';
import { Server } from 'socket.io';

export const scheduleSelfDestruct = (io: Server, messageId: string, chatId: string, delayMs: number) => {
  if (delayMs <= 0) return;
  
  setTimeout(async () => {
    try {
      const deleted = await Message.findByIdAndDelete(messageId);
      if (deleted) {
        io.to(`chat:${chatId}`).emit('message:deleted', {
          chatId,
          messageId,
          isDeletedForEveryone: false
        });
        logger.info(`Message ${messageId} in chat ${chatId} self-destructed successfully.`);
      }
    } catch (error) {
      logger.error(`Error deleting self-destruct message ${messageId}:`, error);
    }
  }, delayMs);
};

export const rescheduleSelfDestructMessages = async (io: Server) => {
  try {
    const now = new Date();
    
    // 1. Delete already expired messages
    const deleteResult = await Message.deleteMany({ expiresAt: { $lte: now } });
    if (deleteResult.deletedCount > 0) {
      logger.info(`Cleaned up ${deleteResult.deletedCount} expired self-destruct messages on startup.`);
    }

    // 2. Query remaining active messages
    const activeMessages = await Message.find({ expiresAt: { $gt: now } });
    logger.info(`Rescheduling ${activeMessages.length} self-destruct messages on startup.`);

    activeMessages.forEach((msg) => {
      const delay = new Date(msg.expiresAt!).getTime() - Date.now();
      scheduleSelfDestruct(io, (msg._id as any).toString(), (msg.chatId as any).toString(), delay);
    });
  } catch (error) {
    logger.error('Error during self-destruct startup rescheduling:', error);
  }
};
