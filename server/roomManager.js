/**
 * Room Manager — In-memory room state for temporary private communication.
 * 
 * All data lives exclusively in memory.
 * When the room empties or the server restarts, everything is gone.
 */

const crypto = require('crypto');

const ROOM_ID = 'the-last-frame';
const MAX_PARTICIPANTS = 2;
const GRACE_PERIOD_MS = 30_000; // 30 seconds

// In-memory room state
let room = null;

// Map of socketId → grace period timeout
const gracePeriodTimers = new Map();

// Map of sessionId → { socketId, disconnectedAt }
const disconnectedSessions = new Map();

function createRoom() {
  room = {
    id: ROOM_ID,
    participants: new Map(), // socketId → { sessionId, joinedAt }
    messages: [],            // temporary message log (never persisted)
    createdAt: Date.now(),
  };
  return room;
}

function getRoom() {
  return room;
}

function getParticipantCount() {
  if (!room) return 0;
  return room.participants.size;
}

/**
 * Attempt to join the room.
 * Returns { success, reason?, participant? }
 */
function joinRoom(socketId, sessionId) {
  // Check if this sessionId is reconnecting within grace period
  if (disconnectedSessions.has(sessionId)) {
    const info = disconnectedSessions.get(sessionId);
    // Cancel the grace period cleanup
    if (gracePeriodTimers.has(info.socketId)) {
      clearTimeout(gracePeriodTimers.get(info.socketId));
      gracePeriodTimers.delete(info.socketId);
    }
    // Remove old participant entry
    if (room) {
      room.participants.delete(info.socketId);
    }
    disconnectedSessions.delete(sessionId);
  }

  // Create room if it doesn't exist
  if (!room) {
    createRoom();
  }

  // Check capacity (excluding the reconnecting user)
  if (room.participants.size >= MAX_PARTICIPANTS) {
    // Check if any participant has the same sessionId (reconnecting)
    let isReconnecting = false;
    for (const [, p] of room.participants) {
      if (p.sessionId === sessionId) {
        isReconnecting = true;
        break;
      }
    }
    if (!isReconnecting) {
      return { success: false, reason: 'room-full' };
    }
  }

  // Remove any existing entry for this sessionId (handles reconnection)
  for (const [existingSocketId, p] of room.participants) {
    if (p.sessionId === sessionId) {
      room.participants.delete(existingSocketId);
      break;
    }
  }

  const participant = {
    sessionId,
    joinedAt: Date.now(),
  };

  room.participants.set(socketId, participant);

  return { success: true, participant };
}

/**
 * Handle participant disconnect.
 * Starts grace period before full removal.
 */
function handleDisconnect(socketId) {
  if (!room) return null;

  const participant = room.participants.get(socketId);
  if (!participant) return null;

  // Record disconnected session for grace period reconnection
  disconnectedSessions.set(participant.sessionId, {
    socketId,
    disconnectedAt: Date.now(),
  });

  // Start grace period timer
  const timer = setTimeout(() => {
    finalizeRemoval(socketId, participant.sessionId);
  }, GRACE_PERIOD_MS);

  gracePeriodTimers.set(socketId, timer);

  return participant;
}

/**
 * Finalize removal after grace period expires.
 */
function finalizeRemoval(socketId, sessionId) {
  gracePeriodTimers.delete(socketId);
  disconnectedSessions.delete(sessionId);

  if (!room) return;

  room.participants.delete(socketId);

  // If room is empty, destroy it
  if (room.participants.size === 0) {
    destroyRoom();
  }
}

/**
 * Immediately remove a participant (explicit leave, no grace period).
 */
function leaveRoom(socketId) {
  if (!room) return null;

  const participant = room.participants.get(socketId);
  if (!participant) return null;

  // Cancel any pending grace period
  if (gracePeriodTimers.has(socketId)) {
    clearTimeout(gracePeriodTimers.get(socketId));
    gracePeriodTimers.delete(socketId);
  }
  disconnectedSessions.delete(participant.sessionId);

  room.participants.delete(socketId);

  // Destroy room if empty
  if (room.participants.size === 0) {
    destroyRoom();
  }

  return participant;
}

/**
 * Destroy the room — all state, messages, images wiped.
 */
function destroyRoom() {
  // Clear all grace period timers
  for (const [, timer] of gracePeriodTimers) {
    clearTimeout(timer);
  }
  gracePeriodTimers.clear();
  disconnectedSessions.clear();

  room = null;
  console.log('[Room] Room destroyed — all data wiped from memory.');
}

/**
 * Get the other participant's socketId (for a 2-person room).
 */
function getOtherParticipant(socketId) {
  if (!room) return null;
  for (const [id] of room.participants) {
    if (id !== socketId) return id;
  }
  return null;
}

/**
 * Check if a socketId is in the room.
 */
function isInRoom(socketId) {
  return room?.participants.has(socketId) ?? false;
}

module.exports = {
  ROOM_ID,
  MAX_PARTICIPANTS,
  joinRoom,
  leaveRoom,
  handleDisconnect,
  getRoom,
  getParticipantCount,
  getOtherParticipant,
  isInRoom,
  destroyRoom,
};
