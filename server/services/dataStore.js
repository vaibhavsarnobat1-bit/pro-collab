const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Room = require('../models/Room');
const ActivityLog = require('../models/ActivityLog');
const Snippet = require('../models/Snippet');
const Profile = require('../models/Profile');
const { getDbStatus } = require('../config/db');

// Memory store fallback
const memoryStore = {
  users: [],
  rooms: {},
  roomRegistry: {},
  activityLogs: {},
  chatMessages: {},
  profiles: {},
  snippets: {}
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

// A room opened by link starts with a small runnable project rather than an
// empty tree, so the live preview has something to render immediately.
const getDefaultRoomFiles = (roomId) => ({
  'index.html': {
    name: 'index.html',
    path: 'index.html',
    language: 'html',
    content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${roomId}</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <main class="panel">
      <h1>Shared buffer: ${roomId}</h1>
      <p>Everything here is editable by everyone in the room.</p>
      <button id="tap">Taps: <span id="count">0</span></button>
    </main>
    <script src="app.js"></script>
  </body>
</html>
`
  },
  'styles.css': {
    name: 'styles.css',
    path: 'styles.css',
    language: 'css',
    content: `* { box-sizing: border-box; }
body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #0b1020;
  color: #e8ecf8;
  font-family: system-ui, sans-serif;
}
.panel {
  padding: 32px 40px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  text-align: center;
}
button {
  margin-top: 14px;
  padding: 10px 18px;
  border: 0;
  border-radius: 10px;
  background: #5b6cff;
  color: #fff;
  font-size: 15px;
  cursor: pointer;
}
`
  },
  'app.js': {
    name: 'app.js',
    path: 'app.js',
    language: 'javascript',
    content: `const button = document.getElementById('tap');
const readout = document.getElementById('count');

let taps = 0;
button.addEventListener('click', () => {
  taps += 1;
  readout.textContent = taps;
  console.log('tap', taps);
});
`
  },
  'notes.md': {
    name: 'notes.md',
    path: 'notes.md',
    language: 'markdown',
    content: `# Room ${roomId}

Edits sync to everyone in the room, and each person's caret is labelled with
their name. Open the preview panel to run index.html, styles.css and app.js.
`
  }
});

// Starter projects a room can be created from. `blank` keeps the classic
// runnable demo; the others give a new room something real to edit.
const TEMPLATES = { blank: true, landing: true, react: true, node: true };

const buildTemplateFiles = (template, roomId) => {
  if (template === 'landing') {
    return {
      'index.html': {
        name: 'index.html',
        path: 'index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${roomId}</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <header class="nav">
      <span class="brand">${roomId}</span>
      <nav><a href="#work">Work</a><a href="#contact">Contact</a></nav>
    </header>
    <main>
      <section class="hero">
        <p class="eyebrow">New project</p>
        <h1>Build something worth shipping.</h1>
        <p class="lede">Edit the files on the left — everyone in this room sees the change instantly.</p>
        <a class="btn" href="#work">Get started</a>
      </section>
    </main>
    <footer id="contact">
      <span>© ${new Date().getFullYear()} ${roomId}</span>
    </footer>
  </body>
</html>
`
      },
      'styles.css': {
        name: 'styles.css',
        path: 'styles.css',
        language: 'css',
        content: `:root { --ink: #0d0d0f; --paper: #faf9f7; --line: #e3e0da; --accent: #1d4ed8; }
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
  line-height: 1.6;
}
.nav {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 32px; border-bottom: 1px solid var(--line);
}
.brand { font-weight: 700; letter-spacing: -0.01em; }
.nav nav a { margin-left: 22px; color: #55524d; text-decoration: none; font-size: 14px; }
.nav nav a:hover { color: var(--ink); }
.hero { max-width: 680px; margin: 0 auto; padding: 96px 32px; }
.eyebrow { font-size: 12px; letter-spacing: .14em; text-transform: uppercase; color: var(--accent); font-weight: 600; }
h1 { font-size: clamp(32px, 6vw, 52px); line-height: 1.08; letter-spacing: -0.03em; margin: 12px 0 16px; }
.lede { color: #55524d; max-width: 46ch; }
.btn {
  display: inline-block; margin-top: 20px; padding: 12px 22px;
  border-radius: 8px; background: var(--ink); color: #fff;
  text-decoration: none; font-size: 14px; font-weight: 600;
}
footer { padding: 28px 32px; border-top: 1px solid var(--line); color: #7a766f; font-size: 13px; }
`
      }
    };
  }

  if (template === 'react') {
    return {
      'src/App.jsx': {
        name: 'App.jsx',
        path: 'src/App.jsx',
        language: 'javascript',
        content: `import { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <main style={{ fontFamily: 'system-ui', padding: 40 }}>
      <h1>Hello from ${roomId}</h1>
      <button onClick={() => setCount(count + 1)}>Clicked {count} times</button>
    </main>
  );
}
`
      },
      'src/main.jsx': {
        name: 'main.jsx',
        path: 'src/main.jsx',
        language: 'javascript',
        content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
`
      },
      'index.html': {
        name: 'index.html',
        path: 'index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${roomId}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`
      },
      'package.json': {
        name: 'package.json',
        path: 'package.json',
        language: 'json',
        content: `{
  "name": "${roomId}",
  "private": true,
  "type": "module",
  "scripts": { "dev": "vite" },
  "dependencies": { "react": "^18.3.1", "react-dom": "^18.3.1" },
  "devDependencies": { "vite": "^5.2.11" }
}
`
      }
    };
  }

  if (template === 'node') {
    return {
      'server.js': {
        name: 'server.js',
        path: 'server.js',
        language: 'javascript',
        content: `const http = require('http');

const port = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: true, service: '${roomId}' }));
});

server.listen(port, () => console.log('listening on :' + port));
`
      },
      'package.json': {
        name: 'package.json',
        path: 'package.json',
        language: 'json',
        content: `{
  "name": "${roomId}",
  "private": true,
  "main": "server.js",
  "scripts": { "start": "node server.js" }
}
`
      },
      'README.md': {
        name: 'README.md',
        path: 'README.md',
        language: 'markdown',
        content: `# ${roomId}

Minimal Node service scaffolded from the room template.

    npm start
`
      }
    };
  }

  return getDefaultRoomFiles(roomId);
};

const getOrCreateRoom = async (roomId) => {
  const defaultFiles = getDefaultRoomFiles(roomId);

  if (getDbStatus()) {
    try {
      let room = await Room.findOne({ roomId });
      if (!room) {
        room = await Room.create({ roomId, title: `Room ${roomId}`, language: 'html', content: '' });
      }
      const local = memoryStore.rooms[roomId];
      return {
        ...room.toObject(),
        files: local?.files || defaultFiles,
        activeFile: local?.activeFile || 'index.html'
      };
    } catch (e) {
      console.error('Mongo get room error:', e);
    }
  }

  if (!memoryStore.rooms[roomId]) {
    memoryStore.rooms[roomId] = {
      roomId,
      title: `Room ${roomId}`,
      language: 'html',
      content: '',
      activeFile: 'index.html',
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

const generateRoomId = () => {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789';
  const pick = (n) => Array.from({ length: n }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  return `${pick(3)}-${pick(4)}`;
};

/*
 * Room registry — the access-control layer that sits above room content.
 *
 * getOrCreateRoom() will happily materialise a room on first read, so room
 * membership has to be checked separately: a private room's id is not a secret
 * once it has been shared, and content lookup alone cannot gate entry.
 */
// A caller-supplied code has to survive being pasted into a URL and a socket
// room name, so it is restricted to a conservative alphabet.
const ROOM_ID_RE = /^[a-z0-9][a-z0-9_-]{2,39}$/i;

const createRoom = async ({ roomId: wantedId = '', title, description = '', template = 'blank', isPrivate = false, password = '', createdBy = null }) => {
  const requested = String(wantedId || '').trim();

  if (requested && !ROOM_ID_RE.test(requested)) {
    const err = new Error('Room codes are 3-40 characters: letters, numbers, dashes or underscores.');
    err.code = 'invalid_room_id';
    throw err;
  }

  const roomId = requested ? requested.toLowerCase() : generateRoomId();

  // Reusing a live code would hand someone else's workspace (and their password
  // gate) to the newcomer, so collisions are refused rather than overwritten.
  if (requested && memoryStore.roomRegistry[roomId]) {
    const err = new Error('That room code is already taken. Pick another one.');
    err.code = 'room_id_taken';
    throw err;
  }

  const now = new Date();

  const record = {
    roomId,
    title: String(title || `Room ${roomId}`).slice(0, 80),
    description: String(description || '').replace(/\s+/g, ' ').trim().slice(0, 200),
    template: TEMPLATES[template] ? template : 'blank',
    isPrivate: !!isPrivate,
    hasPassword: false,
    passwordHash: null,
    createdBy: createdBy ? { id: createdBy.id, username: createdBy.username } : null,
    createdAt: now,
    updatedAt: now
  };

  if (record.isPrivate && String(password).trim()) {
    record.passwordHash = await bcrypt.hash(String(password).trim(), 10);
    record.hasPassword = true;
  }

  memoryStore.roomRegistry[roomId] = record;
  const seeded = await getOrCreateRoom(roomId);
  seeded.title = record.title;
  if (record.template !== 'blank') {
    seeded.files = buildTemplateFiles(record.template, roomId);
    seeded.activeFile = Object.keys(seeded.files)[0] || 'index.html';
  }

  if (getDbStatus()) {
    try {
      await Room.create({
        roomId,
        title: record.title,
        language: 'javascript',
        content: '',
        isPrivate: record.isPrivate,
        passwordHash: record.passwordHash,
        createdBy: record.createdBy
      });
    } catch (e) {
      console.error('Mongo create room error:', e);
    }
  }

  return publicRoomView(record);
};

const publicRoomView = (record) => ({
  roomId: record.roomId,
  title: record.title,
  description: record.description || '',
  template: record.template || 'blank',
  isPrivate: record.isPrivate,
  hasPassword: record.hasPassword,
  createdBy: record.createdBy,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt
});

const getRoomMeta = async (roomId) => {
  if (memoryStore.roomRegistry[roomId]) return memoryStore.roomRegistry[roomId];

  if (getDbStatus()) {
    try {
      const doc = await Room.findOne({ roomId });
      if (doc) {
        const record = doc.toObject();
        memoryStore.roomRegistry[roomId] = record;
        return record;
      }
    } catch (e) {
      console.error('Mongo room meta error:', e);
    }
  }

  // Rooms entered by link (or seeded by getOrCreateRoom) have no registry entry.
  // They are treated as open, which matches how the workspace has always worked.
  return null;
};

// Returns { allowed, reason, meta } — reason distinguishes "locked" from "unknown".
const verifyRoomAccess = async (roomId, suppliedPassword = '') => {
  const meta = await getRoomMeta(roomId);
  if (!meta) return { allowed: true, reason: null, meta: null };
  if (!meta.isPrivate && !meta.hasPassword) return { allowed: true, reason: null, meta };

  if (!String(suppliedPassword).trim()) {
    return { allowed: false, reason: 'password_required', meta };
  }

  const match = meta.passwordHash ? await bcrypt.compare(String(suppliedPassword).trim(), meta.passwordHash) : true;
  return match
    ? { allowed: true, reason: null, meta }
    : { allowed: false, reason: 'password_incorrect', meta };
};

const listPublicRooms = async () => {
  const records = Object.values(memoryStore.roomRegistry).filter((record) => !record.isPrivate && !record.hasPassword);

  return records
    .map((record) => ({
      ...publicRoomView(record),
      occupants: presenceMap?.get(record.roomId)?.users?.length || 0
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 40);
};

// Live presence is owned by the socket layer; the HTTP room list reads through
// this binding so /api/rooms and the admin dashboard never disagree.
let presenceMap = null;
const bindPresenceMap = (map) => { presenceMap = map; };

const touchRoom = async (roomId) => {
  const record = memoryStore.roomRegistry[roomId];
  if (record) record.updatedAt = new Date();
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

const PROFILE_DEFAULTS = {
  displayName: '',
  bio: '',
  roleLabel: 'Developer',
  location: '',
  github: '',
  accent: '#6366f1'
};

const sanitiseProfile = (userId, username, raw = {}) => ({
  userId,
  username,
  ...PROFILE_DEFAULTS,
  ...Object.fromEntries(
    Object.entries(raw).filter(([k]) => k in PROFILE_DEFAULTS).map(([k, v]) => [k, v || PROFILE_DEFAULTS[k]])
  )
});

const findUserById = async (userId) => {
  if (getDbStatus()) {
    try {
      return await User.findById(userId).select('username role createdAt');
    } catch (e) {
      console.error('Mongo fetch user by id error:', e);
    }
  }
  return memoryStore.users.find((u) => u._id === userId) || null;
};

const getProfile = async (userId, fallbackUsername) => {
  const user = await findUserById(userId);
  const username = (user && user.username) || fallbackUsername || 'unknown';
  const joinedAt = user ? user.createdAt : null;

  if (getDbStatus()) {
    try {
      const doc = await Profile.findOne({ userId });
      if (doc) {
        return { ...sanitiseProfile(userId, username, doc.toObject()), joinedAt };
      }
    } catch (e) {
      console.error('Mongo fetch profile error:', e);
    }
  }

  return { ...sanitiseProfile(userId, username, memoryStore.profiles[userId]), joinedAt };
};

const saveProfile = async (userId, fallbackUsername, patch) => {
  const allowed = {};
  for (const key of Object.keys(PROFILE_DEFAULTS)) {
    if (patch[key] !== undefined) allowed[key] = String(patch[key]).slice(0, 300);
  }

  if (getDbStatus()) {
    try {
      const doc = await Profile.findOneAndUpdate(
        { userId },
        { $set: { ...allowed, userId, updatedAt: new Date() }, $setOnInsert: { userId } },
        { new: true, upsert: true }
      );
      if (doc) return sanitiseProfile(userId, fallbackUsername, doc.toObject());
    } catch (e) {
      console.error('Mongo save profile error:', e);
    }
  }

  memoryStore.profiles[userId] = { ...(memoryStore.profiles[userId] || {}), ...allowed };
  return sanitiseProfile(userId, fallbackUsername, memoryStore.profiles[userId]);
};

const listSnippets = async (userId) => {
  if (getDbStatus()) {
    try {
      return await Snippet.find({ userId }).sort({ updatedAt: -1 }).limit(200);
    } catch (e) {
      console.error('Mongo fetch snippets error:', e);
    }
  }
  return (memoryStore.snippets[userId] || []).slice().sort((a, b) => b.updatedAt - a.updatedAt);
};

const createSnippet = async (userId, { title, language = 'javascript', code = '', tags = [] }) => {
  const now = new Date();
  const item = {
    id: 'snip_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    userId,
    title: String(title || 'Untitled snippet').slice(0, 120),
    language,
    code,
    tags: Array.isArray(tags) ? tags.slice(0, 8) : [],
    createdAt: now,
    updatedAt: now
  };

  if (getDbStatus()) {
    try {
      const doc = await Snippet.create(item);
      return doc.toObject();
    } catch (e) {
      console.error('Mongo create snippet error:', e);
    }
  }

  if (!memoryStore.snippets[userId]) memoryStore.snippets[userId] = [];
  memoryStore.snippets[userId].unshift(item);
  return item;
};

const deleteSnippet = async (userId, snippetId) => {
  if (getDbStatus()) {
    try {
      const res = await Snippet.deleteOne({ _id: snippetId, userId });
      if (res.deletedCount) return true;
    } catch (e) {
      console.error('Mongo delete snippet error:', e);
    }
  }
  const list = memoryStore.snippets[userId] || [];
  const idx = list.findIndex((s) => s.id === snippetId || s._id === snippetId);
  if (idx === -1) return false;
  list.splice(idx, 1);
  return true;
};

const getUserStats = async (userId, username) => {
  const norm = (username || '').toLowerCase();

  if (getDbStatus()) {
    try {
      const [totalUsers, totalRooms, snippets, activities] = await Promise.all([
        User.estimatedDocumentCount(),
        Room.estimatedDocumentCount(),
        Snippet.countDocuments({ userId }),
        ActivityLog.countDocuments({ username: norm })
      ]);
      const roomsTouched = await ActivityLog.distinct('roomId', { username: norm });
      return { totalUsers, totalRooms, snippets, activities, rooms: roomsTouched.length };
    } catch (e) {
      console.error('Mongo user stats error:', e);
    }
  }

  const logs = Object.values(memoryStore.activityLogs).flat();
  const mine = logs.filter((l) => (l.username || '').toLowerCase() === norm);
  return {
    totalUsers: memoryStore.users.length,
    totalRooms: Object.keys(memoryStore.rooms).length,
    snippets: (memoryStore.snippets[userId] || []).length,
    activities: mine.length,
    rooms: new Set(mine.map((l) => l.roomId)).size
  };
};

const getPlatformStats = async () => {
  if (getDbStatus()) {
    try {
      const [totalUsers, totalRooms, snippets] = await Promise.all([
        User.estimatedDocumentCount(),
        Room.estimatedDocumentCount(),
        Snippet.estimatedDocumentCount()
      ]);
      return { totalUsers, totalRooms, snippets };
    } catch (e) {
      console.error('Mongo platform stats error:', e);
    }
  }
  return {
    totalUsers: memoryStore.users.length,
    totalRooms: Object.keys(memoryStore.rooms).length,
    snippets: Object.values(memoryStore.snippets).reduce((n, list) => n + list.length, 0)
  };
};

// Renaming or re-describing a room after the fact. Only the creator (or an
// admin) may do it, so a visitor cannot rewrite someone else's room listing.
const updateRoomMeta = async (roomId, { title, description } = {}) => {
  const record = memoryStore.roomRegistry[roomId];
  if (!record) {
    const err = new Error('That room does not exist');
    err.code = 'room_not_found';
    throw err;
  }

  if (title !== undefined) record.title = String(title).trim().slice(0, 80) || record.title;
  if (description !== undefined) {
    record.description = String(description).replace(/\s+/g, ' ').trim().slice(0, 200);
  }
  record.updatedAt = new Date();

  if (getDbStatus()) {
    try {
      await Room.findOneAndUpdate(
        { roomId },
        { title: record.title, description: record.description },
        { upsert: false }
      );
    } catch (e) {
      console.error('Mongo update room meta error:', e);
    }
  }

  return publicRoomView(record);
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
  createRoom,
  getRoomMeta,
  verifyRoomAccess,
  listPublicRooms,
  updateRoomMeta,
  touchRoom,
  generateRoomId,
  bindPresenceMap,
  addActivityLog,
  getActivityLogs,
  addChatMessage,
  getChatMessages,
  getProfile,
  saveProfile,
  listSnippets,
  createSnippet,
  deleteSnippet,
  getUserStats,
  getPlatformStats,
  memoryStore
};
