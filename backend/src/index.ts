import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import app from './app.js';
import { connectDB } from './config/db.js';
import { socketHandler } from './socket/socketHandler.js';
import { logger } from './utils/logger.js';
import { rescheduleSelfDestructMessages } from './utils/selfDestruct.js';
import { parseAllowedOrigins, validateProductionEnv } from './config/env.js';

const port = process.env.PORT || 5000;

const startServer = async () => {
  try {
    validateProductionEnv();
    // Initialize Database connection
    await connectDB();

    const server = http.createServer(app);

    // Initialize Socket.io
    const io = new Server(server, {
      cors: {
        origin: parseAllowedOrigins(),
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    if (process.env.REDIS_URL) {
      const pubClient = createClient({ url: process.env.REDIS_URL });
      const subClient = pubClient.duplicate();

      await Promise.all([pubClient.connect(), subClient.connect()]);
      io.adapter(createAdapter(pubClient, subClient));
      logger.info('Socket.io Redis adapter enabled for cross-instance real-time events.');

      const shutdownRedis = async () => {
        await Promise.allSettled([pubClient.quit(), subClient.quit()]);
      };
      process.once('SIGINT', shutdownRedis);
      process.once('SIGTERM', shutdownRedis);
    }

    // Attach Socket.io to Express App instance for accessing in controllers
    app.set('io', io);

    // Bind Socket actions
    socketHandler(io);

    try {
      logger.info('Running startup database tasks...');
      await rescheduleSelfDestructMessages(io);
      logger.info('Startup database tasks completed successfully.');
    } catch (dbError: any) {
      logger.error(`Error running startup database tasks: ${dbError.message}`);
    }

    // Start Server Listen
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${port} is already in use. Stop the existing server or set a different PORT.`);
        process.exit(1);
      }
      logger.error(`HTTP server error: ${error.message}`);
      process.exit(1);
    });

    server.listen(port, () => {
      logger.info(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${port}`);
    });
  } catch (error: any) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
