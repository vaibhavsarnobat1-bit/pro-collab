const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/authMiddleware');
const {
  getOrCreateRoom,
  getActivityLogs,
  getChatMessages,
  createRoom,
  listPublicRooms,
  verifyRoomAccess,
  getRoomMeta
} = require('../services/dataStore');

// GET /api/rooms — public rooms anyone may browse and join
router.get('/', async (req, res) => {
  try {
    res.json({ rooms: await listPublicRooms() });
  } catch (error) {
    console.error('List rooms error:', error);
    res.status(500).json({ message: 'Could not load rooms' });
  }
});

// POST /api/rooms — create a room, optionally with your own code and password
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { roomId = '', title = '', isPrivate = false, password = '' } = req.body || {};

    if (isPrivate && String(password).trim().length < 4) {
      return res.status(400).json({ message: 'A locked room needs a password of at least 4 characters' });
    }

    const room = await createRoom({
      roomId,
      title,
      isPrivate: !!isPrivate,
      password,
      createdBy: req.user ? { id: req.user.id, username: req.user.username } : null
    });

    res.status(201).json({ room });
  } catch (error) {
    if (error.code === 'invalid_room_id') return res.status(400).json({ message: error.message, reason: error.code });
    if (error.code === 'room_id_taken') return res.status(409).json({ message: error.message, reason: error.code });
    console.error('Create room error:', error);
    res.status(500).json({ message: 'Could not create the room' });
  }
});

// POST /api/rooms/:roomId/unlock — check a room password before entering
router.post('/:roomId/unlock', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { password = '' } = req.body || {};
    const { allowed, reason, meta } = await verifyRoomAccess(roomId, password);

    if (!allowed) {
      return res.status(401).json({
        message: reason === 'password_incorrect' ? 'That password is not right' : 'This room is locked',
        reason
      });
    }

    res.json({ allowed: true, room: meta ? { roomId, title: meta.title } : { roomId } });
  } catch (error) {
    console.error('Unlock room error:', error);
    res.status(500).json({ message: 'Could not check this room' });
  }
});

// GET /api/rooms/:roomId — workspace bootstrap: meta, files, logs, chat
router.get('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { allowed, reason, meta } = await verifyRoomAccess(roomId, req.query.password || '');

    if (!allowed) {
      return res.status(401).json({
        message: reason === 'password_incorrect' ? 'That password is not right' : 'This room is locked',
        reason,
        locked: true,
        room: { roomId, title: meta?.title || roomId, hasPassword: true }
      });
    }

    const room = await getOrCreateRoom(roomId);
    const logs = await getActivityLogs(roomId);
    const messages = getChatMessages(roomId);

    res.json({
      room,
      meta: meta ? { roomId, title: meta.title, isPrivate: meta.isPrivate, createdBy: meta.createdBy } : null,
      logs,
      messages
    });
  } catch (error) {
    console.error('Fetch Room Error:', error);
    res.status(500).json({ message: 'Failed to load room data' });
  }
});

module.exports = router;
