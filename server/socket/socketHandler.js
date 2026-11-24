const {
  updateRoomContent,
  getOrCreateRoom,
  addActivityLog,
  addChatMessage,
  createRoomFile,
  deleteRoomFile,
  renameRoomFile,
  verifyRoomAccess,
  getRoomMeta,
  touchRoom,
  bindPresenceMap
} = require('../services/dataStore');
const { verifyToken } = require('../middleware/authMiddleware');

const setupSocketHandlers = (io, app) => {
  const activeRoomsMap = new Map();
  const activeCallsMap = new Map();

  app.set('activeRoomsMap', activeRoomsMap);
  app.set('activeCallsMap', activeCallsMap);
  bindPresenceMap(activeRoomsMap);

  // Identify the connection from its handshake token so activity logs and
  // presence reflect a real account instead of whatever the client typed.
  io.use((socket, next) => {
    const user = verifyToken(socket.handshake.auth?.token);
    socket.data.user = user
      ? { id: user.id, username: user.username, role: user.role }
      : null;
    next();
  });

  io.on('connection', (socket) => {
    let currentRoomId = null;
    let currentUser = null;

    const identity = () => socket.data.user || currentUser || { username: 'Guest' };

    // Join Room Event
    socket.on('join-room', async ({ roomId, password = '' }, ack) => {
      if (!roomId) return ack?.({ ok: false, message: 'No room id supplied' });

      const { allowed, reason } = await verifyRoomAccess(roomId, password);
      if (!allowed) {
        return ack?.({ ok: false, reason, message: reason === 'password_incorrect' ? 'Wrong password' : 'This room is locked' });
      }

      // Leaving a previous room first keeps presence honest when a client
      // switches rooms without reloading.
      if (currentRoomId && currentRoomId !== roomId) {
        socket.leave(currentRoomId);
        removeFromPresence(io, activeRoomsMap, activeCallsMap, currentRoomId, socket);
      }

      currentRoomId = roomId;
      currentUser = socket.data.user || { username: 'Guest', id: socket.id };
      socket.join(roomId);

      if (!activeRoomsMap.has(roomId)) {
        activeRoomsMap.set(roomId, { users: [], createdAt: new Date() });
      }
      const roomData = activeRoomsMap.get(roomId);

      if (!roomData.users.some((u) => u.socketId === socket.id)) {
        const meta = await getRoomMeta(roomId);
        const isCreator = Boolean(
          meta?.createdBy?.username && meta.createdBy.username === identity().username
        );
        // A room always shows one host: the person who created it, or the first
        // person in when the room was opened by link.
        const hostPresent = roomData.users.some((u) => u.isHost);

        roomData.users.push({
          socketId: socket.id,
          username: identity().username,
          userId: currentUser.id || null,
          role: currentUser.role || 'user',
          joinedAt: new Date().toISOString(),
          isHost: isCreator || !hostPresent
        });
      }

      touchRoom(roomId);

      const joinLog = await addActivityLog(roomId, identity().username, 'JOINED', `${identity().username} joined the workspace`);
      io.to(roomId).emit('activity-logged', joinLog);
      io.to(roomId).emit('room-users-updated', roomData.users);

      ack?.({ ok: true, users: roomData.users });
      console.log(`[Socket] ${identity().username} joined room: ${roomId}`);
    });

    socket.on('leave-room', async () => {
      if (!currentRoomId) return;
      const roomId = currentRoomId;
      socket.leave(roomId);
      await removeFromPresence(io, activeRoomsMap, activeCallsMap, roomId, socket);
      currentRoomId = null;
    });

    // Multi-File Code Sync.
    // The client sends the whole buffer because it also sends a line-oriented
    // change description; the server stores it and relays author + version so
    // receivers can apply a minimal edit instead of clobbering the caret.
    socket.on('code-change', async ({ roomId, filePath = 'index.html', content, version, language }) => {
      if (!roomId || !currentUser) return;

      await updateRoomContent(roomId, content, language, filePath);

      socket.to(roomId).emit('code-updated', {
        filePath,
        content,
        version,
        senderSocketId: socket.id,
        author: currentUser.username
      });
    });

    // Per-keystroke edit deltas, relayed verbatim so peers can replay them in
    // order rather than overwriting the whole document.
    socket.on('code-delta', async ({ roomId, filePath = 'index.html', changes, version }) => {
      if (!roomId || !currentUser || !Array.isArray(changes)) return;

      socket.to(roomId).emit('code-delta-applied', {
        filePath,
        changes,
        version,
        senderSocketId: socket.id,
        author: currentUser.username
      });
    });

    // A peer whose local buffer drifted (a dropped delta) asks for the stored
    // copy rather than guessing, so the room reconverges on one document.
    socket.on('sync-request', async ({ roomId, filePath }, ack) => {
      if (!roomId || !filePath) return ack?.({ ok: false });
      const room = await getOrCreateRoom(roomId);
      const file = room.files?.[filePath];
      ack?.({ ok: !!file, filePath, content: file?.content ?? '', language: file?.language });
    });

    socket.on('cursor-change', ({ roomId, filePath, cursor, selection }) => {
      if (!roomId || !currentUser) return;
      socket.to(roomId).emit('cursor-updated', {
        socketId: socket.id,
        username: currentUser.username,
        filePath,
        cursor,
        selection
      });
    });

    socket.on('cursor-leave', ({ roomId }) => {
      if (!roomId) return;
      socket.to(roomId).emit('cursor-vanished', { socketId: socket.id });
    });

    // File Operations Sync.
    // Broadcasts exclude the sender: the client that made the change already
    // updated its own tree, and echoing back duplicated new files.
    socket.on('file-create', async ({ roomId, filePath, content = '', language = 'plaintext' }, ack) => {
      if (!roomId || !filePath) return ack?.({ ok: false });
      const file = await createRoomFile(roomId, filePath, content, language);
      socket.to(roomId).emit('file-created-broadcast', { file });
      if (currentUser) {
        const log = await addActivityLog(roomId, currentUser.username, 'FILE_NEW', `${currentUser.username} created file ${filePath}`);
        io.to(roomId).emit('activity-logged', log);
      }
      ack?.({ ok: true, file });
    });

    socket.on('file-delete', async ({ roomId, filePath }, ack) => {
      if (!roomId || !filePath) return ack?.({ ok: false });
      const success = await deleteRoomFile(roomId, filePath);
      if (success) {
        socket.to(roomId).emit('file-deleted-broadcast', { filePath });
        if (currentUser) {
          const log = await addActivityLog(roomId, currentUser.username, 'FILE_DEL', `${currentUser.username} deleted file ${filePath}`);
          io.to(roomId).emit('activity-logged', log);
        }
      }
      ack?.({ ok: success });
    });

    socket.on('file-rename', async ({ roomId, oldPath, newPath }, ack) => {
      if (!roomId || !oldPath || !newPath) return ack?.({ ok: false });
      const success = await renameRoomFile(roomId, oldPath, newPath);
      if (success) {
        socket.to(roomId).emit('file-renamed-broadcast', { oldPath, newPath });
        if (currentUser) {
          const log = await addActivityLog(roomId, currentUser.username, 'FILE_REN', `${currentUser.username} renamed ${oldPath} to ${newPath}`);
          io.to(roomId).emit('activity-logged', log);
        }
      }
      ack?.({ ok: success });
    });

    socket.on('file-select', ({ roomId, filePath }) => {
      if (!roomId || !currentUser) return;
      socket.to(roomId).emit('peer-file-selected', {
        socketId: socket.id,
        username: currentUser.username,
        filePath
      });
    });

    socket.on('language-change', async ({ roomId, filePath = 'index.html', language }, ack) => {
      if (!roomId) return ack?.({ ok: false });
      await updateRoomContent(roomId, undefined, language, filePath);
      socket.to(roomId).emit('language-updated', { filePath, language });

      if (currentUser) {
        const langLog = await addActivityLog(
          roomId,
          currentUser.username,
          'CONFIG',
          `${currentUser.username} set ${filePath} to ${language}`
        );
        io.to(roomId).emit('activity-logged', langLog);
      }
      ack?.({ ok: true });
    });

    socket.on('run-preview', ({ roomId, filePath }) => {
      if (!roomId || !currentUser) return;
      socket.to(roomId).emit('peer-ran-preview', { filePath, username: currentUser.username });
    });

    // Typing indicators. Relay only — nothing is stored, so a stuck flag can
    // never outlive the keystroke that produced it.
    socket.on('typing-start', ({ roomId, scope = 'room' } = {}) => {
      if (!roomId || !currentUser) return;
      socket.to(roomId).emit('peer-typing', {
        socketId: socket.id,
        username: currentUser.username,
        scope
      });
    });

    socket.on('typing-stop', ({ roomId } = {}) => {
      if (!roomId || !currentUser) return;
      socket.to(roomId).emit('peer-typing-stopped', {
        socketId: socket.id,
        username: currentUser.username
      });
    });

    // Chat Message Handler
    socket.on('send-message', async ({ roomId, text }, ack) => {
      if (!roomId || !text || !currentUser) return ack?.({ ok: false });

      const messageObj = {
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        sender: currentUser.username,
        text: String(text).slice(0, 4000),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        at: Date.now(),
        socketId: socket.id
      };

      addChatMessage(roomId, messageObj);
      io.to(roomId).emit('receive-message', messageObj);
      ack?.({ ok: true, message: messageObj });
    });

    // 1-on-1 Direct Private Message Handler
    socket.on('send-private-message', async ({ roomId, recipientUsername, text }, ack) => {
      if (!roomId || !recipientUsername || !text || !currentUser) return ack?.({ ok: false });

      // Resolve the recipient's socket before writing anything: a DM must never
      // hit the room broadcast, or every peer could read it with one listener.
      const roomUsers = activeRoomsMap.get(roomId)?.users || [];
      const recipient = roomUsers.find((u) => u.username === recipientUsername && u.socketId !== socket.id);
      if (!recipient) {
        return ack?.({ ok: false, message: null, reason: 'recipient_offline' });
      }

      const messageObj = {
        id: 'dm_' + Date.now() + '_' + Math.random().toString(36),
        sender: currentUser.username,
        recipient: recipientUsername,
        text: String(text).slice(0, 4000),
        isPrivate: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        at: Date.now(),
        socketId: socket.id
      };

      // Delivered to exactly two connections. A DM is deliberately not written to
      // the shared room transcript, because GET /api/rooms/:roomId returns that
      // transcript to anyone in the room — storing it there would leak it.
      socket.emit('receive-private-message', messageObj);
      io.to(recipient.socketId).emit('receive-private-message', messageObj);
      ack?.({ ok: true, message: messageObj });
    });

    // ----------------------------------------------------
    // WebRTC Video & Screen Sharing Signalling
    // ----------------------------------------------------

    socket.on('join-call', async ({ roomId }) => {
      if (!roomId || !currentUser) return;

      if (!activeCallsMap.has(roomId)) {
        activeCallsMap.set(roomId, { participants: [] });
      }
      const callData = activeCallsMap.get(roomId);

      // Everyone already in the call, so the newcomer can open a peer
      // connection to each of them and build the mesh.
      const existing = callData.participants.filter((p) => p.socketId !== socket.id);
      socket.emit('call-participants', existing.map((p) => ({ ...p, initiator: true })));

      if (!callData.participants.some((p) => p.socketId === socket.id)) {
        callData.participants.push({
          socketId: socket.id,
          username: currentUser.username
        });
      }

      socket.to(roomId).emit('user-joined-call', {
        socketId: socket.id,
        username: currentUser.username
      });

      io.to(roomId).emit('call-roster', callData.participants);

      const log = await addActivityLog(roomId, currentUser.username, 'CALL', `${currentUser.username} joined the video call`);
      io.to(roomId).emit('activity-logged', log);
    });

    socket.on('leave-call', async ({ roomId }) => {
      if (!roomId) return;
      if (activeCallsMap.has(roomId)) {
        const callData = activeCallsMap.get(roomId);
        callData.participants = callData.participants.filter((p) => p.socketId !== socket.id);
        if (callData.participants.length === 0) {
          activeCallsMap.delete(roomId);
        } else {
          io.to(roomId).emit('call-roster', callData.participants);
        }
      }

      socket.to(roomId).emit('user-left-call', { socketId: socket.id, username: currentUser?.username });

      if (currentUser) {
        const log = await addActivityLog(roomId, currentUser.username, 'CALL', `${currentUser.username} left the video call`);
        io.to(roomId).emit('activity-logged', log);
      }
    });

    // Signalling relays. `to` is a socket id, so these are point to point.
    socket.on('webrtc-signal', ({ to, type, payload }) => {
      if (!to || !type) return;
      io.to(to).emit('webrtc-signal', { from: socket.id, type, payload });
    });

    socket.on('call-state', ({ roomId, micOn, cameraOn }) => {
      if (!roomId || !currentUser) return;
      socket.to(roomId).emit('peer-call-state', {
        socketId: socket.id,
        username: currentUser.username,
        micOn: !!micOn,
        cameraOn: !!cameraOn
      });
    });

    socket.on('screen-share-status', async ({ roomId, isSharing }, ack) => {
      if (!roomId) return ack?.({ ok: false });
      socket.to(roomId).emit('screen-share-changed', {
        socketId: socket.id,
        username: currentUser?.username,
        isSharing: !!isSharing
      });

      if (currentUser && isSharing) {
        const log = await addActivityLog(roomId, currentUser.username, 'SCREEN', `${currentUser.username} started screen sharing`);
        io.to(roomId).emit('activity-logged', log);
      }
      ack?.({ ok: true });
    });

    // Disconnect Handler
    socket.on('disconnect', async () => {
      if (!currentRoomId) return;
      const roomId = currentRoomId;

      await removeFromPresence(io, activeRoomsMap, activeCallsMap, roomId, socket);

      if (currentUser) {
        const leaveLog = await addActivityLog(roomId, currentUser.username, 'LEFT', `${currentUser.username} left the room`);
        io.to(roomId).emit('activity-logged', leaveLog);
      }
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });
};

// Shared teardown for room switch, explicit leave and disconnect.
async function removeFromPresence(io, activeRoomsMap, activeCallsMap, roomId, socket) {
  if (activeRoomsMap.has(roomId)) {
    const roomData = activeRoomsMap.get(roomId);
    roomData.users = roomData.users.filter((u) => u.socketId !== socket.id);
    if (roomData.users.length === 0) {
      activeRoomsMap.delete(roomId);
    } else {
      // Keep exactly one host in the room after the previous one leaves.
      if (!roomData.users.some((u) => u.isHost)) {
        roomData.users[0].isHost = true;
      }
      io.to(roomId).emit('room-users-updated', roomData.users);
    }
  }

  if (activeCallsMap.has(roomId)) {
    const callData = activeCallsMap.get(roomId);
    callData.participants = callData.participants.filter((p) => p.socketId !== socket.id);
    if (callData.participants.length === 0) {
      activeCallsMap.delete(roomId);
    } else {
      io.to(roomId).emit('call-roster', callData.participants);
    }
  }

  socket.to(roomId).emit('user-left-call', { socketId: socket.id });
  socket.to(roomId).emit('cursor-vanished', { socketId: socket.id });
}

module.exports = setupSocketHandlers;
