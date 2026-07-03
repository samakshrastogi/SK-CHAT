import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Chat } from '../models/Chat.js';
import { Message } from '../models/Message.js';
import { Status } from '../models/Status.js';
import { Call } from '../models/Call.js';
import { Community } from '../models/Community.js';
import { logger } from './logger.js';
import crypto from 'crypto';

const seed = async (disconnect = true) => {
  try {
    const connUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/connect';
    logger.info(`Seeding database: ${connUri}`);
    await mongoose.connect(connUri);

    // Clear existing data
    await User.deleteMany({});
    await Chat.deleteMany({});
    await Message.deleteMany({});
    await Status.deleteMany({});
    await Call.deleteMany({});
    await Community.deleteMany({});

    logger.info('Cleared existing collections.');

    // Create passwords
    const salt = await bcrypt.genSalt(10);
    const commonPassword = await bcrypt.hash('password123', salt);

    // 1. Create Users
    const users = await User.create([
      {
        email: 'admin@connect.chat',
        username: 'admin',
        password: commonPassword,
        bio: 'Platform System Admin.',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
        isVerified: true,
        role: 'admin',
        status: 'online',
        themeSettings: { theme: 'dark', accentColor: '#6366f1', wallpaper: '' }
      },
      {
        email: 'alice@connect.chat',
        username: 'alice',
        password: commonPassword,
        bio: 'Product Designer at Connect. Loving glassmorphism!',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
        coverImage: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&w=800&q=80',
        isVerified: true,
        role: 'user',
        status: 'online',
        themeSettings: { theme: 'dark', accentColor: '#ec4899', wallpaper: '' }
      },
      {
        email: 'bob@connect.chat',
        username: 'bob',
        password: commonPassword,
        bio: 'Web Developer. Coffee enthusiast.',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
        coverImage: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=800&q=80',
        isVerified: true,
        role: 'user',
        status: 'away',
        themeSettings: { theme: 'light', accentColor: '#10b981', wallpaper: '' }
      },
      {
        email: 'charlie@connect.chat',
        username: 'charlie',
        password: commonPassword,
        bio: 'Always learning new tech.',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
        isVerified: true,
        role: 'user',
        status: 'offline',
        themeSettings: { theme: 'dark', accentColor: '#6366f1', wallpaper: '' }
      }
    ]);

    const [admin, alice, bob, charlie] = users;
    logger.info(`Seeded ${users.length} default users.`);

    // 2. Create Chats
    // Direct Chat between Alice and Bob
    const directChat = await Chat.create({
      isGroup: false,
      participants: [alice._id, bob._id]
    });

    // Group Chat "Connect Dev Team"
    const devGroupInvite = crypto.randomBytes(8).toString('hex');
    const devGroup = await Chat.create({
      name: 'Connect Core Team',
      description: 'Primary group chat for development coordinates and UI design review.',
      isGroup: true,
      creatorId: admin._id,
      admins: [admin._id, alice._id],
      participants: [admin._id, alice._id, bob._id, charlie._id],
      inviteCode: devGroupInvite,
      avatar: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=150&q=80'
    });

    // 3. Create Messages
    const directMessages = await Message.create([
      {
        chatId: directChat._id,
        senderId: alice._id,
        content: 'Hi Bob! Have you checked out the new Glassmorphism UI designs for Connect?',
        messageType: 'text',
        status: 'seen',
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000)
      },
      {
        chatId: directChat._id,
        senderId: bob._id,
        content: 'Hey Alice! Yes, I just looked at them. They look absolutely gorgeous! The blur effects are super smooth.',
        messageType: 'text',
        status: 'seen',
        createdAt: new Date(Date.now() - 3.8 * 60 * 60 * 1000)
      },
      {
        chatId: directChat._id,
        senderId: alice._id,
        content: 'Awesome. I will upload a preview layout PDF here so you can verify the spec mappings.',
        messageType: 'text',
        status: 'seen',
        createdAt: new Date(Date.now() - 3.5 * 60 * 60 * 1000)
      },
      {
        chatId: directChat._id,
        senderId: alice._id,
        content: 'Here is the file.',
        messageType: 'document',
        mediaUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        fileName: 'Connect_UI_Specs_v2.pdf',
        mediaSize: 15420,
        status: 'seen',
        createdAt: new Date(Date.now() - 3.4 * 60 * 60 * 1000)
      }
    ]);

    // Update direct chat lastMessage
    directChat.lastMessage = directMessages[directMessages.length - 1]._id as any;
    await directChat.save();

    // Group Messages
    const groupMessages = await Message.create([
      {
        chatId: devGroup._id,
        senderId: admin._id,
        content: 'Welcome everyone to the Connect Core Team channel!',
        messageType: 'text',
        status: 'seen',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
      },
      {
        chatId: devGroup._id,
        senderId: charlie._id,
        content: 'Glad to be here! Let’s build something incredible.',
        messageType: 'text',
        status: 'seen',
        createdAt: new Date(Date.now() - 23.5 * 60 * 60 * 1000)
      },
      {
        chatId: devGroup._id,
        senderId: alice._id,
        content: 'Should we schedule our design sync for tomorrow? Vote below.',
        messageType: 'text',
        status: 'seen',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        chatId: devGroup._id,
        senderId: alice._id,
        content: 'Preferred Sync Time',
        messageType: 'poll',
        pollData: {
          question: 'Preferred sync time for design review tomorrow:',
          options: [
            { id: '1', text: '10:00 AM EST', votes: [bob._id, admin._id] },
            { id: '2', text: '2:00 PM EST', votes: [charlie._id, alice._id] }
          ]
        },
        status: 'seen',
        createdAt: new Date(Date.now() - 1.9 * 60 * 60 * 1000)
      }
    ]);

    devGroup.lastMessage = groupMessages[groupMessages.length - 1]._id as any;
    await devGroup.save();

    logger.info('Seeded message exchanges and poll components.');

    // 4. Create Status Updates (Stories)
    await Status.create([
      {
        userId: alice._id,
        type: 'image',
        content: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
        caption: 'Vacation vibes! 🏖️',
        expiresAt: new Date(Date.now() + 20 * 60 * 60 * 1000),
        views: [{ userId: bob._id, viewedAt: new Date() }],
        likes: [bob._id]
      },
      {
        userId: bob._id,
        type: 'text',
        content: 'Writing code and drinking espresso on a rainy afternoon.',
        backgroundColor: '#4f46e5',
        expiresAt: new Date(Date.now() + 18 * 60 * 60 * 1000),
        views: [],
        likes: []
      }
    ]);

    logger.info('Seeded status story entries.');

    // 5. Create Call History Logs
    await Call.create([
      {
        callerId: alice._id,
        receiverId: bob._id,
        chatId: directChat._id,
        type: 'video',
        status: 'completed',
        startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        endedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000),
        duration: 900
      },
      {
        callerId: charlie._id,
        receiverId: alice._id,
        chatId: devGroup._id,
        type: 'voice',
        status: 'missed',
        startedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
        endedAt: new Date(Date.now() - 12 * 60 * 60 * 1000 + 45 * 1000),
        duration: 0
      }
    ]);

    logger.info('Seeded call logs.');

    // 6. Create Community
    const techInvite = crypto.randomBytes(8).toString('hex');
    const community = new Community({
      name: 'Connect Developers Network',
      description: 'A global network of engineers discussing system designs and frontends.',
      avatar: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=150&q=80',
      banner: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80',
      creatorId: admin._id,
      admins: [admin._id],
      members: [admin._id, alice._id, bob._id],
      inviteCode: techInvite,
      groupIds: []
    });

    const cAnnouncement = await Chat.create({
      name: 'Announcements',
      description: 'Official notifications for the Developer Community',
      isGroup: true,
      isCommunity: true,
      creatorId: admin._id,
      admins: [admin._id],
      participants: [admin._id, alice._id, bob._id],
      communityId: community._id
    });

    const cTechTalk = await Chat.create({
      name: 'tech-talk',
      description: 'Discussing the future of Node and React APIs',
      isGroup: true,
      isCommunity: true,
      creatorId: admin._id,
      admins: [admin._id],
      participants: [admin._id, alice._id, bob._id],
      communityId: community._id
    });

    community.announcementChannelId = cAnnouncement._id as any;
    community.groupIds = [cAnnouncement._id as any, cTechTalk._id as any];
    await community.save();

    logger.info('Seeded Developers Community with default sub-channels.');

    logger.info('Database seeding completed successfully!');
    if (disconnect) {
      await mongoose.disconnect();
    }
  } catch (err: any) {
    logger.error(`Database seeding failed: ${err.message}`);
    if (disconnect) {
      process.exit(1);
    } else {
      throw err;
    }
  }
};

export { seed };

import { fileURLToPath } from 'url';
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  seed(true);
}
