import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { connectDB } from './config/db.js';
import { socketHandler } from './socket/socketHandler.js';
import { logger } from './utils/logger.js';
import dotenv from 'dotenv';

// Load environmental variables
dotenv.config();

const port = process.env.PORT || 5000;

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

// Start Server Listen
server.listen(port, () => {
  logger.info(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${port}`);
});
