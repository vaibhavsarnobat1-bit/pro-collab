const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Room = require('../models/Room');
const ActivityLog = require('../models/ActivityLog');
const { getDbStatus } = require('../config/db');

// Memory store fallback
const memoryStore = {
  users: [],
  rooms: {},
  activityLogs: {},
  chatMessages: {}
};

// Pre-seed Admin account in memory store
(async () => {
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  memoryStore.users.push({
    _id: 'admin_id_001',
    username: 'admin',
    password: adminPasswordHash,
    role: 'admin',
    createdAt: new Date()
  });

  // Seed default demo user
  const userPasswordHash = await bcrypt.hash('user123', 10);
  memoryStore.users.push({
    _id: 'user_id_001',
    username: 'demo_user',
    password: userPasswordHash,
    role: 'user',
    createdAt: new Date()
  });
})();

// Data store access methods
const findUserByUsername = async (username) => {
  const normUsername = username.toLowerCase().trim();
  if (getDbStatus()) {
    try {
      let user = await User.findOne({ username: normUsername });
      if (!user && normUsername === 'admin') {
        const hash = await bcrypt.hash('admin123', 10);
        user = await User.create({ username: 'admin', password: hash, role: 'admin' });
      }
      return user;
    } catch (e) {
      console.error('Mongo query error:', e);
    }
  }
  
  return memoryStore.users.find(u => u.username.toLowerCase() === normUsername) || null;
};

const createUser = async ({ username, password, role = 'user' }) => {
  const normUsername = username.toLowerCase().trim();
  const hashedPassword = await bcrypt.hash(password, 10);

  if (getDbStatus()) {
    try {
      const newUser = await User.create({
        username: normUsername,
        password: hashedPassword,
        role
      });
      return { id: newUser._id.toString(), username: newUser.username, role: newUser.role, createdAt: newUser.createdAt };
    } catch (e) {
      console.error('Mongo user creation error:', e);
    }
  }

  const id = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  const newUser = {
    _id: id,
    username: normUsername,
    password: hashedPassword,
    role,
    createdAt: new Date()
  };
  memoryStore.users.push(newUser);
  return { id: newUser._id, username: newUser.username, role: newUser.role, createdAt: newUser.createdAt };
};

const getAllUsers = async () => {
  if (getDbStatus()) {
    try {
      const users = await User.find({}, '-password').sort({ createdAt: -1 });
      return users.map(u => ({ id: u._id.toString(), username: u.username, role: u.role, createdAt: u.createdAt }));
    } catch (e) {
      console.error('Mongo fetch users error:', e);
    }
  }
  return memoryStore.users.map(u => ({ id: u._id, username: u.username, role: u.role, createdAt: u.createdAt }));
};

const deleteUserById = async (userId) => {
  if (getDbStatus()) {
    try {
      await User.findByIdAndDelete(userId);
      return true;
    } catch (e) {
      console.error('Mongo delete user error:', e);
    }
  }
  const idx = memoryStore.users.findIndex(u => u._id === userId);
  if (idx !== -1) {
    memoryStore.users.splice(idx, 1);
    return true;
  }
  return false;
};

const getDefaultRoomFiles = (roomId) => ({
  'index.js': {
    name: 'index.js',
    path: 'index.js',
    language: 'javascript',
    content: `// Welcome to Pro-Collab Shared Workspace!
// Room ID: ${roomId}
// Live Multi-File Editor with VS Code / Antigravity disk sync

function calculateTeamSynergy(members) {
  return members.reduce((total, member) => total + member.contributions, 0);
}

console.log("Pro-Collab Multi-File Session Active...");`
  },
  'utils.js': {
    name: 'utils.js',
    path: 'utils.js',
    language: 'javascript',
    content: `// Helper utility functions
export function formatDate(date) {
  return new Intl.DateTimeFormat('en-US').format(date);
}

export function generateToken() {
  return Math.random().toString(36).substring(2);
}`
  },
  'styles.css': {
    name: 'styles.css',
    path: 'styles.css',
    language: 'css',
    content: `/* Workspace Stylesheet */
.collaborative-container {
  display: flex;
  gap: 16px;
  background: #0d1117;
  color: #f8fafc;
}`
  },
  'README.md': {
    name: 'README.md',
    path: 'README.md',
    language: 'markdown',
    content: `# Pro-Collab Workspace: ${roomId}

Real-time multi-file collaboration suite.
- ⚡ Live multi-cursor delta synchronization
- 📁 VS Code & Antigravity IDE local sync
- 📹 WebRTC peer-to-peer video & screen share`
  }
});

const getOrCreateRoom = async (roomId) => {
  const defaultFiles = getDefaultRoomFiles(roomId);
  const defaultCode = defaultFiles['index.js'].content;

  if (getDbStatus()) {
    try {
      let room = await Room.findOne({ roomId });
      if (!room) {
        room = await Room.create({ roomId, title: `Room ${roomId}`, language: 'javascript', content: defaultCode });
      }
      return {
        ...room.toObject(),
        files: memoryStore.rooms[roomId]?.files || defaultFiles
      };
    } catch (e) {
      console.error('Mongo get room error:', e);
    }
  }

  if (!memoryStore.rooms[roomId]) {
    memoryStore.rooms[roomId] = {
      roomId,
      title: `Room ${roomId}`,
      language: 'javascript',
      content: defaultCode,
      activeFile: 'index.js',
      files: defaultFiles,
      createdAt: new Date()
    };
  }
  return memoryStore.rooms[roomId];
};

const updateRoomContent = async (roomId, content, language, filePath = 'index.js') => {
  if (getDbStatus()) {
    try {
      const updateData = {};
      if (content !== undefined) updateData.content = content;
      if (language !== undefined) updateData.language = language;
      await Room.findOneAndUpdate({ roomId }, updateData, { upsert: true });
    } catch (e) {
      console.error('Mongo update room error:', e);
    }
  }

  if (!memoryStore.rooms[roomId]) {
    await getOrCreateRoom(roomId);
  }
  const room = memoryStore.rooms[roomId];
  if (content !== undefined) room.content = content;
  if (language !== undefined) room.language = language;
  
  if (!room.files) room.files = getDefaultRoomFiles(roomId);
  if (room.files[filePath]) {
    if (content !== undefined) room.files[filePath].content = content;
    if (language !== undefined) room.files[filePath].language = language;
  } else if (content !== undefined) {
    room.files[filePath] = {
      name: filePath.split('/').pop(),
      path: filePath,
      language: language || 'plaintext',
      content
    };
  }
};

const createRoomFile = async (roomId, filePath, content = '', language = 'plaintext') => {
  if (!memoryStore.rooms[roomId]) await getOrCreateRoom(roomId);
  const room = memoryStore.rooms[roomId];
  if (!room.files) room.files = getDefaultRoomFiles(roomId);
  room.files[filePath] = {
    name: filePath.split('/').pop(),
    path: filePath,
    language,
    content
  };
  return room.files[filePath];
};

const deleteRoomFile = async (roomId, filePath) => {
  if (!memoryStore.rooms[roomId]) return false;
  const room = memoryStore.rooms[roomId];
  if (room.files && room.files[filePath]) {
    delete room.files[filePath];
    return true;
  }
  return false;
};

const renameRoomFile = async (roomId, oldPath, newPath) => {
  if (!memoryStore.rooms[roomId]) return false;
  const room = memoryStore.rooms[roomId];
  if (room.files && room.files[oldPath]) {
    const file = room.files[oldPath];
    delete room.files[oldPath];
    file.path = newPath;
    file.name = newPath.split('/').pop();
    room.files[newPath] = file;
    return true;
  }
  return false;
};

const addActivityLog = async (roomId, username, action, details = '') => {
  const logItem = {
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    roomId,
    username,
    action,
    details,
    timestamp: new Date()
  };

  if (getDbStatus()) {
    try {
      await ActivityLog.create(logItem);
    } catch (e) {
      console.error('Mongo log create error:', e);
    }
  }

  if (!memoryStore.activityLogs[roomId]) {
    memoryStore.activityLogs[roomId] = [];
  }
  memoryStore.activityLogs[roomId].unshift(logItem);
  if (memoryStore.activityLogs[roomId].length > 100) {
    memoryStore.activityLogs[roomId].pop();
  }
  return logItem;
};

const getActivityLogs = async (roomId) => {
  if (getDbStatus()) {
    try {
      const logs = await ActivityLog.find({ roomId }).sort({ timestamp: -1 }).limit(50);
      return logs;
    } catch (e) {
      console.error('Mongo log fetch error:', e);
    }
  }
  return memoryStore.activityLogs[roomId] || [];
};

const addChatMessage = (roomId, messageObj) => {
  if (!memoryStore.chatMessages[roomId]) {
    memoryStore.chatMessages[roomId] = [];
  }
  memoryStore.chatMessages[roomId].push(messageObj);
  if (memoryStore.chatMessages[roomId].length > 200) {
    memoryStore.chatMessages[roomId].shift();
  }
  return messageObj;
};

const getChatMessages = (roomId) => {
  return memoryStore.chatMessages[roomId] || [];
};

module.exports = {
  findUserByUsername,
  createUser,
  getAllUsers,
  deleteUserById,
  getOrCreateRoom,
  updateRoomContent,
  createRoomFile,
  deleteRoomFile,
  renameRoomFile,
  addActivityLog,
  getActivityLogs,
  addChatMessage,
  getChatMessages,
  memoryStore
};
