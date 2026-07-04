import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { connectDB } from './config/db.js';
import { socketHandler } from './socket/socketHandler.js';
import { logger } from './utils/logger.js';
import { rescheduleSelfDestructMessages } from './utils/selfDestruct.js';
import { User } from './models/User.js';

const port = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Initialize Database connection
    await connectDB();

    const server = http.createServer(app);

    // Initialize Socket.io
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const io = new Server(server, {
      cors: {
        origin: [frontendUrl, 'http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    // Attach Socket.io to Express App instance for accessing in controllers
    app.set('io', io);

    // Bind Socket actions
    socketHandler(io);

    // Run database-dependent startup tasks only when connection is open
    import('mongoose').then((mongooseModule) => {
      const mongoose = mongooseModule.default;
      mongoose.connection.once('open', async () => {
        try {
          logger.info('MongoDB connection opened. Running startup database tasks...');
          // Auto-seed if database is empty
          const userCount = await User.countDocuments();
          if (userCount === 0) {
            logger.info('Database is empty. Automatically seeding default data...');
            const { seed } = await import('./utils/seed.js');
            await seed(false);
          }

          // Reschedule outstanding self-destruct timers
          await rescheduleSelfDestructMessages(io);
          logger.info('Startup database tasks completed successfully.');
        } catch (dbError: any) {
          logger.error(`Error running startup database tasks: ${dbError.message}`);
        }
      });
    });

    // Start Server Listen
    server.listen(port, () => {
      logger.info(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${port}`);
    });
  } catch (error: any) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
