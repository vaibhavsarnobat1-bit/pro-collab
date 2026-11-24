const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/authMiddleware');
const {
  getOrCreateRoom,
  getActivityLogs,
  getChatMessages,
  createRoom,
  listPublicRooms,
  updateRoomMeta,
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
    const {
      roomId = '',
      title = '',
      description = '',
      template = 'blank',
      isPrivate = false,
      password = ''
    } = req.body || {};

    if (isPrivate && String(password).trim().length < 4) {
      return res.status(400).json({ message: 'A locked room needs a password of at least 4 characters' });
    }

    const room = await createRoom({
      roomId,
      title,
      description,
      template,
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
      meta: {
        roomId,
        title: meta ? meta.title : roomId,
        description: meta?.description || '',
        template: meta?.template || 'blank',
        isPrivate: Boolean(meta?.isPrivate),
        hasPassword: Boolean(meta?.hasPassword),
        createdBy: meta?.createdBy || null,
        createdAt: meta?.createdAt || null
      },
      logs,
      messages
    });
  } catch (error) {
    console.error('Fetch Room Error:', error);
    res.status(500).json({ message: 'Failed to load room data' });
  }
});

// PATCH /api/rooms/:roomId — rename or re-describe a room. The creator and
// admins only; everyone else edits files, not the room's identity.
router.patch('/:roomId', optionalAuth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const meta = await getRoomMeta(roomId);

    if (!meta) return res.status(404).json({ message: 'That room does not exist' });

    const requester = req.user || null;
    const owner = meta.createdBy?.id ? String(meta.createdBy.id) : null;
    const isOwner = requester && owner && String(requester.id) === owner;
    const isAdmin = requester?.role === 'admin';

    if (owner && !isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Only the room creator can change these details' });
    }

    const { title, description } = req.body || {};
    const room = await updateRoomMeta(roomId, {
      title: title === undefined ? undefined : String(title).slice(0, 80),
      description: description === undefined ? undefined : String(description).slice(0, 200)
    });

    res.json({ room });
  } catch (error) {
    if (error.code === 'room_not_found') return res.status(404).json({ message: error.message });
    console.error('Update room error:', error);
    res.status(500).json({ message: 'Could not update the room' });
  }
});

module.exports = router;
