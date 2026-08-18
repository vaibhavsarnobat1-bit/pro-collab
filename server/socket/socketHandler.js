const {
  updateRoomContent,
  addActivityLog,
  addChatMessage,
  createRoomFile,
  deleteRoomFile,
  renameRoomFile
} = require('../services/dataStore');

const setupSocketHandlers = (io, app) => {
  const activeRoomsMap = new Map();
  const activeCallsMap = new Map();

  app.set('activeRoomsMap', activeRoomsMap);
  app.set('activeCallsMap', activeCallsMap);

  io.on('connection', (socket) => {
    let currentRoomId = null;
    let currentUser = null;

    // Join Room Event
    socket.on('join-room', async ({ roomId, user }) => {
      currentRoomId = roomId;
      currentUser = user || { username: 'Anonymous', id: socket.id };

      socket.join(roomId);

      // Track users in activeRoomsMap
      if (!activeRoomsMap.has(roomId)) {
        activeRoomsMap.set(roomId, {
          users: [],
          createdAt: new Date()
        });
      }
      const roomData = activeRoomsMap.get(roomId);
      
      // Avoid duplicate users by socket.id
      const existingUserIdx = roomData.users.findIndex(u => u.socketId === socket.id);
      if (existingUserIdx === -1) {
        roomData.users.push({
          socketId: socket.id,
          username: currentUser.username,
          userId: currentUser.id || currentUser._id
        });
      }

      // Log & broadcast user join activity
      const joinLog = await addActivityLog(roomId, currentUser.username, 'JOINED', `${currentUser.username} joined the workspace`);
      io.to(roomId).emit('activity-logged', joinLog);

      // Send active users list to room
      io.to(roomId).emit('room-users-updated', roomData.users);

      console.log(`[Socket] ${currentUser.username} joined room: ${roomId}`);
    });

    // Multi-File Code Sync & Line Edit Activity Logging
    socket.on('code-change', async ({ roomId, filePath = 'index.js', content, delta, lineNumber, language }) => {
      if (!roomId) return;
      
      // Update data store with filePath
      await updateRoomContent(roomId, content, language, filePath);

      // Broadcast code edit with specific filePath to all other clients in the room
      socket.to(roomId).emit('code-updated', {
        filePath,
        content,
        delta,
        senderSocketId: socket.id,
        author: currentUser?.username
      });

      // Log edit activity if line number provided
      if (lineNumber && currentUser) {
        const editLog = await addActivityLog(
          roomId,
          currentUser.username,
          'EDITED',
          `${currentUser.username} edited ${filePath}:${lineNumber}`
        );
        io.to(roomId).emit('activity-logged', editLog);
      }
    });

    // File Operations Sync
    socket.on('file-create', async ({ roomId, filePath, content = '', language = 'plaintext' }) => {
      if (!roomId || !filePath) return;
      const file = await createRoomFile(roomId, filePath, content, language);
      io.to(roomId).emit('file-created-broadcast', { file });
      if (currentUser) {
        const log = await addActivityLog(roomId, currentUser.username, 'FILE_NEW', `${currentUser.username} created file ${filePath}`);
        io.to(roomId).emit('activity-logged', log);
      }
    });

    socket.on('file-delete', async ({ roomId, filePath }) => {
      if (!roomId || !filePath) return;
      const success = await deleteRoomFile(roomId, filePath);
      if (success) {
        io.to(roomId).emit('file-deleted-broadcast', { filePath });
        if (currentUser) {
          const log = await addActivityLog(roomId, currentUser.username, 'FILE_DEL', `${currentUser.username} deleted file ${filePath}`);
          io.to(roomId).emit('activity-logged', log);
        }
      }
    });

    socket.on('file-rename', async ({ roomId, oldPath, newPath }) => {
      if (!roomId || !oldPath || !newPath) return;
      const success = await renameRoomFile(roomId, oldPath, newPath);
      if (success) {
        io.to(roomId).emit('file-renamed-broadcast', { oldPath, newPath });
        if (currentUser) {
          const log = await addActivityLog(roomId, currentUser.username, 'FILE_REN', `${currentUser.username} renamed ${oldPath} to ${newPath}`);
          io.to(roomId).emit('activity-logged', log);
        }
      }
    });

    socket.on('file-select', ({ roomId, filePath }) => {
      if (!roomId || !currentUser) return;
      socket.to(roomId).emit('peer-file-selected', {
        socketId: socket.id,
        username: currentUser.username,
        filePath
      });
    });

    // Language Change Sync
    socket.on('language-change', async ({ roomId, filePath = 'index.js', language }) => {
      if (!roomId) return;
      await updateRoomContent(roomId, undefined, language, filePath);
      io.to(roomId).emit('language-updated', { filePath, language });

      if (currentUser) {
        const langLog = await addActivityLog(
          roomId,
          currentUser.username,
          'CONFIG',
          `${currentUser.username} changed ${filePath} language to ${language}`
        );
        io.to(roomId).emit('activity-logged', langLog);
      }
    });

    // Cursor Position Sync
    socket.on('cursor-change', ({ roomId, cursorPosition }) => {
      if (!roomId || !currentUser) return;
      socket.to(roomId).emit('cursor-updated', {
        socketId: socket.id,
        username: currentUser.username,
        cursorPosition
      });
    });

    // Chat Message Handler
    socket.on('send-message', async ({ roomId, text, sender }) => {
      if (!roomId || !text) return;

      const senderName = sender || currentUser?.username || 'Member';

      const messageObj = {
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        sender: senderName,
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        socketId: socket.id
      };

      addChatMessage(roomId, messageObj);

      io.to(roomId).emit('receive-message', messageObj);
    });

    // 1-on-1 Direct Private Message Handler
    socket.on('send-private-message', async ({ roomId, recipientUsername, text, sender }) => {
      if (!roomId || !recipientUsername || !text) return;

      const senderName = sender || currentUser?.username || 'Member';

      const messageObj = {
        id: 'dm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        sender: senderName,
        recipient: recipientUsername,
        text,
        isPrivate: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        socketId: socket.id
      };

      addChatMessage(roomId, messageObj);

      // Broadcast to room (peers filter by recipient/sender on client)
      io.to(roomId).emit('receive-private-message', messageObj);
    });

    // ----------------------------------------------------
    // WebRTC Video & Screen Sharing Signaling
    // ----------------------------------------------------

    socket.on('join-call', ({ roomId }) => {
      if (!roomId || !currentUser) return;

      if (!activeCallsMap.has(roomId)) {
        activeCallsMap.set(roomId, {
          participants: []
        });
      }
      const callData = activeCallsMap.get(roomId);
      if (!callData.participants.some(p => p.socketId === socket.id)) {
        callData.participants.push({
          socketId: socket.id,
          username: currentUser.username
        });
      }

      // Notify other call participants that a new peer joined
      socket.to(roomId).emit('user-joined-call', {
        socketId: socket.id,
        username: currentUser.username
      });

      // Send list of existing call participants to joining peer
      socket.emit('call-participants', callData.participants.filter(p => p.socketId !== socket.id));

      // Log call join event
      addActivityLog(roomId, currentUser.username, 'CALL', `${currentUser.username} joined the video call`).then(log => {
        io.to(roomId).emit('activity-logged', log);
      });
    });

    socket.on('leave-call', ({ roomId }) => {
      if (!roomId) return;
      if (activeCallsMap.has(roomId)) {
        const callData = activeCallsMap.get(roomId);
        callData.participants = callData.participants.filter(p => p.socketId !== socket.id);
        if (callData.participants.length === 0) {
          activeCallsMap.delete(roomId);
        }
      }

      socket.to(roomId).emit('user-left-call', { socketId: socket.id, username: currentUser?.username });

      if (currentUser) {
        addActivityLog(roomId, currentUser.username, 'CALL', `${currentUser.username} left the video call`).then(log => {
          io.to(roomId).emit('activity-logged', log);
        });
      }
    });

    socket.on('webrtc-offer', ({ targetSocketId, offer }) => {
      io.to(targetSocketId).emit('webrtc-offer', {
        senderSocketId: socket.id,
        username: currentUser?.username,
        offer
      });
    });

    socket.on('webrtc-answer', ({ targetSocketId, answer }) => {
      io.to(targetSocketId).emit('webrtc-answer', {
        senderSocketId: socket.id,
        answer
      });
    });

    socket.on('ice-candidate', ({ targetSocketId, candidate }) => {
      io.to(targetSocketId).emit('ice-candidate', {
        senderSocketId: socket.id,
        candidate
      });
    });

    socket.on('screen-share-status', ({ roomId, isSharing }) => {
      if (!roomId) return;
      io.to(roomId).emit('screen-share-changed', {
        socketId: socket.id,
        username: currentUser?.username,
        isSharing
      });

      if (currentUser && isSharing) {
        addActivityLog(roomId, currentUser.username, 'SCREEN', `${currentUser.username} started screen sharing`).then(log => {
          io.to(roomId).emit('activity-logged', log);
        });
      }
    });

    // Disconnect Handler
    socket.on('disconnect', async () => {
      if (currentRoomId) {
        // Clean up activeRoomsMap
        if (activeRoomsMap.has(currentRoomId)) {
          const roomData = activeRoomsMap.get(currentRoomId);
          roomData.users = roomData.users.filter(u => u.socketId !== socket.id);
          if (roomData.users.length === 0) {
            activeRoomsMap.delete(currentRoomId);
          } else {
            io.to(currentRoomId).emit('room-users-updated', roomData.users);
          }
        }

        // Clean up activeCallsMap
        if (activeCallsMap.has(currentRoomId)) {
          const callData = activeCallsMap.get(currentRoomId);
          callData.participants = callData.participants.filter(p => p.socketId !== socket.id);
          if (callData.participants.length === 0) {
            activeCallsMap.delete(currentRoomId);
          }
          io.to(currentRoomId).emit('user-left-call', { socketId: socket.id, username: currentUser?.username });
        }

        if (currentUser) {
          const leaveLog = await addActivityLog(currentRoomId, currentUser.username, 'LEFT', `${currentUser.username} left the room`);
          io.to(currentRoomId).emit('activity-logged', leaveLog);
        }
      }
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });
};

module.exports = setupSocketHandlers;
