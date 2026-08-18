const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { getAllUsers, deleteUserById } = require('../services/dataStore');

// GET /api/admin/dashboard
router.get('/dashboard', protect, adminOnly, async (req, res) => {
  try {
    const users = await getAllUsers();
    const activeRooms = req.app.get('activeRoomsMap') || new Map();
    const activeCalls = req.app.get('activeCallsMap') || new Map();

    const activeRoomsCount = activeRooms.size;
    let activeCallsCount = 0;
    activeCalls.forEach(call => {
      if (call.participants && call.participants.length > 0) {
        activeCallsCount++;
      }
    });

    const activeRoomsList = [];
    activeRooms.forEach((roomData, roomId) => {
      activeRoomsList.push({
        roomId,
        userCount: roomData.users ? roomData.users.length : 0,
        users: roomData.users || [],
        createdAt: roomData.createdAt || new Date()
      });
    });

    res.status(200).json({
      stats: {
        totalUsers: users.length,
        activeRooms: activeRoomsCount,
        activeCalls: activeCallsCount,
        systemStatus: 'Operational',
        uptime: process.uptime()
      },
      users,
      rooms: activeRoomsList
    });
  } catch (error) {
    console.error('Admin Dashboard Stats Error:', error);
    res.status(500).json({ message: 'Error retrieving admin metrics' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', protect, adminOnly, async (req, res) => {
  try {
    const userId = req.params.id;
    const success = await deleteUserById(userId);
    if (success) {
      res.status(200).json({ message: 'User deleted successfully' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Admin Delete User Error:', error);
    res.status(500).json({ message: 'Error deleting user' });
  }
});

module.exports = router;
