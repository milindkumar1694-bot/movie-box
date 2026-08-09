/**
 * Server — Express + Socket.IO for the temporary private communication room.
 * 
 * Serves the Stitch-based frontend and handles real-time messaging.
 * No database, no persistent storage. Everything lives in memory.
 */

require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

const roomManager = require('./roomManager');
const notification = require('./notification');

const PORT = process.env.PORT || 3000;
const ACCESS_CODE = process.env.ROOM_ACCESS_CODE || '123456';

// Validate image MIME types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_MESSAGE_LENGTH = 5000;

// Initialize Express
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  maxHttpBufferSize: 15 * 1024 * 1024, // ~14MB for base64 encoded 10MB images
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Middleware
app.use(express.json({ limit: '1mb' }));

// Serve static frontend
app.use(express.static(path.join(__dirname, '..', 'client')));

// Rate limiter for access code verification
const codeVerifyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,              // 5 attempts per minute
  message: { success: false, error: 'Too many attempts. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── HTTP Routes ──────────────────────────────────────────────

/**
 * POST /api/verify-code
 * Validates the access code server-side.
 */
app.post('/api/verify-code', codeVerifyLimiter, (req, res) => {
  const { code } = req.body;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid request.' });
  }

  // Constant-time comparison to prevent timing attacks
  const codeBuffer = Buffer.from(code.trim());
  const accessBuffer = Buffer.from(ACCESS_CODE);

  if (codeBuffer.length !== accessBuffer.length || !crypto.timingSafeEqual(codeBuffer, accessBuffer)) {
    return res.status(401).json({ success: false, error: 'Invalid movie number.' });
  }

  return res.json({ success: true });
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', participants: roomManager.getParticipantCount() });
});

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

// Lightweight health endpoint for uptime checks
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ─── Socket.IO Events ────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  /**
   * join-room — User attempts to join the private room
   */
  socket.on('join-room', ({ sessionId }) => {
    if (!sessionId || typeof sessionId !== 'string') {
      socket.emit('error', { message: 'Invalid session.' });
      return;
    }

    const result = roomManager.joinRoom(socket.id, sessionId);

    if (!result.success) {
      socket.emit('room-full', { message: 'Room currently unavailable.' });
      return;
    }

    // Join the Socket.IO room
    socket.join(roomManager.ROOM_ID);

    const participantCount = roomManager.getParticipantCount();

    // Notify the joining user
    socket.emit('room-joined', {
      roomId: roomManager.ROOM_ID,
      participantCount,
      sessionId,
    });

    // Notify other participants
    socket.to(roomManager.ROOM_ID).emit('user-joined', {
      participantCount,
    });

    console.log(`[Room] ${sessionId.substring(0, 8)}... joined. Participants: ${participantCount}`);

    // Send Telegram notification
    notification.sendRoomNotification(participantCount);
  });

  /**
   * send-message — Relay a text message to the other participant
   */
  socket.on('send-message', ({ id, content, timestamp }) => {
    if (!roomManager.isInRoom(socket.id)) {
      socket.emit('error', { message: 'Not in a room.' });
      return;
    }

    // Validate message
    if (!content || typeof content !== 'string' || content.length > MAX_MESSAGE_LENGTH) {
      socket.emit('error', { message: 'Invalid message.' });
      return;
    }

    if (!id || typeof id !== 'string') {
      socket.emit('error', { message: 'Invalid message ID.' });
      return;
    }

    const room = roomManager.getRoom();
    const participant = room.participants.get(socket.id);

    const message = {
      id,
      senderId: participant.sessionId,
      type: 'text',
      content: content.substring(0, MAX_MESSAGE_LENGTH),
      timestamp: timestamp || Date.now(),
    };

    // Broadcast to all in room (including sender for confirmation)
    io.to(roomManager.ROOM_ID).emit('new-message', message);
  });

  /**
   * send-image — Relay an image (base64) to the other participant
   */
  socket.on('send-image', ({ id, content, mimeType, timestamp }) => {
    if (!roomManager.isInRoom(socket.id)) {
      socket.emit('error', { message: 'Not in a room.' });
      return;
    }

    // Validate MIME type
    if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
      socket.emit('image-failed', {
        id,
        reason: 'Unsupported format. Use JPEG, PNG, or WebP.',
      });
      return;
    }

    // Validate size (base64 string length → approximate byte size)
    if (!content || typeof content !== 'string') {
      socket.emit('image-failed', { id, reason: 'Invalid image data.' });
      return;
    }

    const estimatedBytes = (content.length * 3) / 4;
    if (estimatedBytes > MAX_IMAGE_SIZE) {
      socket.emit('image-failed', {
        id,
        reason: 'Image too large. Maximum size is 10MB.',
      });
      return;
    }

    const room = roomManager.getRoom();
    const participant = room.participants.get(socket.id);

    const imageMessage = {
      id,
      senderId: participant.sessionId,
      type: 'image',
      content, // base64 data
      mimeType,
      timestamp: timestamp || Date.now(),
    };

    // Broadcast to all in room
    io.to(roomManager.ROOM_ID).emit('new-image', imageMessage);
  });

  /**
   * leave-room — User explicitly leaves
   */
  socket.on('leave-room', () => {
    handleLeave(socket, true);
  });

  /**
   * disconnect — User lost connection or closed page
   */
  socket.on('disconnect', (reason) => {
    console.log(`[Socket] Disconnected: ${socket.id} (${reason})`);
    handleLeave(socket, false);
  });
});

/**
 * Handle user leaving the room.
 * @param {Socket} socket
 * @param {boolean} explicit - true if user explicitly left, false if disconnected
 */
function handleLeave(socket, explicit) {
  if (!roomManager.isInRoom(socket.id)) return;

  let participant;
  if (explicit) {
    participant = roomManager.leaveRoom(socket.id);
  } else {
    participant = roomManager.handleDisconnect(socket.id);
  }

  if (participant) {
    socket.leave(roomManager.ROOM_ID);

    const participantCount = roomManager.getParticipantCount();

    // Notify remaining participants
    socket.to(roomManager.ROOM_ID).emit('user-left', {
      participantCount,
      gracePeriod: !explicit,
    });

    console.log(`[Room] ${participant.sessionId.substring(0, 8)}... ${explicit ? 'left' : 'disconnected (grace period started)'}. Participants: ${participantCount}`);
  }
}

// ─── Start Server ─────────────────────────────────────────────

notification.init();

// Bind explicitly to 0.0.0.0 so hosting platforms (Render) can reach the server
server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   🎬 Frame — Private Room Server             ║');
  console.log(`║   Running on port ${PORT}                      ║`);
  console.log('║   Access Code: [configured via .env]         ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
});
