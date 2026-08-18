const express = require('express');
const router = express.Router();
const { getOrCreateRoom, getActivityLogs, getChatMessages } = require('../services/dataStore');

// GET /api/rooms/:roomId - Public workspace access for room code, logs & chat history
router.get('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await getOrCreateRoom(roomId);
    const logs = await getActivityLogs(roomId);
    const messages = getChatMessages(roomId);

    res.status(200).json({
      room,
      logs,
      messages
    });
  } catch (error) {
    console.error('Fetch Room Error:', error);
    res.status(500).json({ message: 'Failed to load room data' });
  }
});

module.exports = router;
