const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Security packages (optional - check if installed)
let helmet, rateLimit;
try {
  helmet = require('helmet');
  rateLimit = require('express-rate-limit');
} catch (e) {
  console.warn('Optional security packages (helmet, express-rate-limit) not installed. Run: npm install helmet express-rate-limit');
}

// DB/Readiness flags
const USE_FILE_DB = String(process.env.USE_FILE_DB || 'false').toLowerCase() === 'true';
let isReady = false;

const app = express();
const server = http.createServer(app);

// Initialize Socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Store online users: { userId: socketId }
const onlineUsers = new Map();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Security middleware (if available)
if (helmet) {
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false // Disable for API server
  }));
}

// Rate limiting for authentication routes
if (rateLimit) {
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 requests per windowMs for auth endpoints
    message: { message: 'Too many attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const generalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // Limit each IP to 100 requests per minute
    message: { message: 'Too many requests, please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply rate limiting
  app.use('/api/users/login', authLimiter);
  app.use('/api/users/signup', authLimiter);
  app.use('/api/users/verify-otp', authLimiter);
  app.use('/api/users/login-otp', authLimiter);
  app.use('/api/', generalLimiter);
}

app.use(express.json({ limit: '10mb' })); // Parse JSON bodies with size limit
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded (form) bodies

// Routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/mentors', require('./routes/mentorRoutes'));
app.use('/api/students', require('./routes/studentRoutes'));
app.use('/api/organizers', require('./routes/organizerRoutes'));
app.use('/api/events', require('./routes/events'));
app.use('/api/connect', require('./routes/connectionRoutes'));
app.use('/api/requests', require('./routes/requestRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/sessions', require('./routes/sessionRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/follow', require('./routes/followRoutes'));
app.use('/api/testimonials', require('./routes/testimonialRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'MentorLink Backend API' });
});

// Health check endpoints (for Docker and monitoring)
app.get('/health', (req, res) => {
  res.json({ ok: true, useFileDb: USE_FILE_DB, ready: isReady });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    ready: isReady
  });
});

// Error handling middleware
app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Socket.io Connection Handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User joins with their userId
  socket.on('user_online', (userId) => {
    onlineUsers.set(userId, socket.id);
    console.log(`User ${userId} is online`);

    // Broadcast to all connected clients that user is online
    socket.broadcast.emit('user_status_changed', {
      userId,
      status: 'online',
    });
  });

  // Handle sending messages
  socket.on('send_message', (data) => {
    const { recipientId, message } = data;
    const recipientSocketId = onlineUsers.get(recipientId);

    if (recipientSocketId) {
      // Send message to recipient if they're online
      io.to(recipientSocketId).emit('receive_message', message);
    }
  });

  // Handle typing indicator
  socket.on('typing_start', (data) => {
    const { recipientId, senderId } = data;
    const recipientSocketId = onlineUsers.get(recipientId);

    if (recipientSocketId) {
      io.to(recipientSocketId).emit('user_typing', { userId: senderId });
    }
  });

  socket.on('typing_stop', (data) => {
    const { recipientId, senderId } = data;
    const recipientSocketId = onlineUsers.get(recipientId);

    if (recipientSocketId) {
      io.to(recipientSocketId).emit('user_stopped_typing', { userId: senderId });
    }
  });

  // Handle message read status
  socket.on('messages_read', (data) => {
    const { senderId, readBy } = data;
    const senderSocketId = onlineUsers.get(senderId);

    if (senderSocketId) {
      io.to(senderSocketId).emit('messages_marked_read', {
        readBy,
        timestamp: new Date(),
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    // Find and remove user from onlineUsers
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        console.log(`User ${userId} is offline`);

        // Broadcast to all connected clients that user is offline
        socket.broadcast.emit('user_status_changed', {
          userId,
          status: 'offline',
        });
        break;
      }
    }
  });
});

// Make io accessible to routes
app.set('io', io);
app.set('onlineUsers', onlineUsers);

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    if (!USE_FILE_DB) {
      await connectDB();
    }
    isReady = true;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Socket.io ready for connections`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
