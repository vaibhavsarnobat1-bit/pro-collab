import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useNotifications } from '../context/NotificationContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { makeGuestHandle } from '../lib/presence';
import { readFilesForRoom, pickFiles, downloadProjectZip } from '../lib/projectIO';
import SharedEditor from '../components/SharedEditor';
import FileExplorer from '../components/FileExplorer';
import ChatPanel from '../components/ChatPanel';
import ParticipantsPanel from '../components/ParticipantsPanel';
import ActivityLogPanel from '../components/ActivityLogPanel';
import VideoCallContainer from '../components/VideoCallContainer';
import LivePreviewPanel from '../components/LivePreviewPanel';
import AiAssistantPanel from '../components/AiAssistantPanel';
import '../styles/workspace.css';
import {
  PanelLeftClose, PanelLeft, Check, Users, MessageSquare, Activity,
  Sparkles, Code2, Video, Play, Square, Lock, X, HardDrive, FolderTree,
  ShieldAlert, Link2
} from 'lucide-react';

const EXT_LANGUAGES = {
  js: 'javascript', mjs: 'javascript', cjs: 'javascript', jsx: 'javascript',
  ts: 'typescript', tsx: 'typescript',
  py: 'python', html: 'html', htm: 'html', css: 'css', scss: 'css',
  json: 'json', md: 'markdown', markdown: 'markdown',
  cpp: 'cpp', cc: 'cpp', c: 'c', h: 'cpp', hpp: 'cpp',
  rs: 'rust', go: 'go', java: 'java', sql: 'sql',
  sh: 'shell', bash: 'shell', yml: 'yaml', yaml: 'yaml', xml: 'xml', txt: 'plaintext'
};

const getLanguageFromPath = (filePath = '') => {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  return EXT_LANGUAGES[ext] || 'plaintext';
};

// Room files are a flat path → file map, so the tree is derived rather than
// stored. That keeps renames and deletes from drifting out of sync with content.
const buildTree = (filesMap) => {
  const root = [];
  const directories = new Map();

  const ensureDir = (path) => {
    if (directories.has(path)) return directories.get(path);
    const segments = path.split('/');
    const name = segments.pop();
    const parentPath = segments.join('/');
    const node = { name, path, isDirectory: true, children: [] };
    directories.set(path, node);
    if (parentPath) ensureDir(parentPath).children.push(node);
    else root.push(node);
    return node;
  };

  Object.values(filesMap).forEach((file) => {
    const segments = file.path.split('/');
    const name = segments.pop();
    const parentPath = segments.join('/');
    const leaf = { name, path: file.path, isDirectory: false, language: file.language || getLanguageFromPath(file.path) };
    if (parentPath) ensureDir(parentPath).children.push(leaf);
    else root.push(leaf);
  });

  const sortNodes = (nodes) => {
    nodes.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((node) => node.isDirectory && sortNodes(node.children));
    return nodes;
  };

  return sortNodes(root);
};

const STARTER_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>New page</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <h1>Hello</h1>
    <script src="app.js"></script>
  </body>
</html>
`;

const WorkspacePage = ({ guestMode = false }) => {
  const { roomId: paramRoomId } = useParams();
  const roomId = paramRoomId || 'lobby';

  const { user } = useAuth();
  const { socket } = useSocket();
  const { notify } = useNotifications();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const identity = useMemo(() => {
    if (guestMode) return { username: makeGuestHandle(), id: null, role: 'guest' };
    return user ? { username: user.username, id: user.id, role: user.role } : null;
  }, [user, guestMode]);

  const isAdmin = identity?.role === 'admin';

  /* ------------------------------------------------------------- files */

  const [filesMap, setFilesMap] = useState({});
  const [openFiles, setOpenFiles] = useState([]);
  const [activeFilePath, setActiveFilePath] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Two deliberately separate sources of truth:
  //   room   — collaborative buffers the server holds for this room
  //   folder — a real directory the visitor picked with the File System Access API
  // The earlier design let the server's /api/fs tree overwrite a folder the
  // visitor had picked, which is why file operations looked like they vanished.
  const [source, setSource] = useState('room');
  const fileHandles = useRef({});
  const dirHandles = useRef({});
  const folderRoot = useRef('');
  const [localTree, setLocalTree] = useState([]);

  /* -------------------------------------------------------------- room */

  const [activeUsers, setActiveUsers] = useState([]);
  const [peers, setPeers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [messages, setMessages] = useState([]);
  const [privateMessages, setPrivateMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [dmTarget, setDmTarget] = useState('');
  const [roomMeta, setRoomMeta] = useState(null);
  const [lockState, setLockState] = useState('checking');
  const [roomPassword, setRoomPassword] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  /* ---------------------------------------------------------------- ui */

  const [showExplorer, setShowExplorer] = useState(true);
  // Preview starts open: the point of the workspace is seeing the page change
  // beside the code, not hunting for a tab first.
  const [showPreview, setShowPreview] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [videoMaximized, setVideoMaximized] = useState(false);
  const [rightPanel, setRightPanel] = useState('chat');
  const [copied, setCopied] = useState(false);
  const [saveTarget, setSaveTarget] = useState(false);
  const [snippetTitle, setSnippetTitle] = useState('');

  const pushFeed = useCallback((text, tone = 'info') => {
    window.dispatchEvent(new CustomEvent('pc:nav-feed', { detail: { text, tone } }));
  }, []);

  /* ----------------------------------------------------- room bootstrap */

  const loadRoom = useCallback(async (password) => {
    try {
      const response = await api.get(`/rooms/${encodeURIComponent(roomId)}`, {
        params: password ? { password } : undefined
      });

      const { room, meta, logs: serverLogs, messages: serverMessages } = response.data;
      setRoomMeta(meta || { roomId, title: room?.title || roomId, isPrivate: false });
      setLockState('open');

      const roomFiles = room?.files || {};
      const paths = Object.keys(roomFiles);
      if (paths.length) {
        setFilesMap(roomFiles);
        const preferred = room?.activeFile && roomFiles[room.activeFile]
          ? room.activeFile
          : paths.find((path) => /\.(html|jsx|tsx|js|ts|py|md)$/i.test(path)) || paths[0];
        setActiveFilePath(preferred);
        setOpenFiles([roomFiles[preferred]]);
      } else {
        setFilesMap({});
        setOpenFiles([]);
        setActiveFilePath(null);
      }
      setLogs(serverLogs || []);
      setMessages(serverMessages || []);
    } catch (error) {
      if (error.response?.status === 401) {
        setRoomMeta(error.response.data.room || null);
        setLockState(password === '' ? 'locked' : 'rejected');
        return;
      }
      setLockState('error');
      notify(error.response?.data?.message || 'This room could not be loaded', { type: 'error' });
    }
  }, [roomId, notify]);

  useEffect(() => {
    setLockState('checking');
    setSource('room');
    setLocalTree([]);
    loadRoom('');
  }, [loadRoom]);

  /* --------------------------------------------------- socket presence */

  const joinedRef = useRef(false);

  useEffect(() => {
    if (!socket || !identity || lockState !== 'open') return;

    socket.emit('join-room', { roomId, password: roomPassword }, (response) => {
      if (!response?.ok) {
        joinedRef.current = false;
        setLockState(response?.reason === 'password_incorrect' ? 'rejected' : 'locked');
        return;
      }
      joinedRef.current = true;
      setActiveUsers(response.users || []);
    });

    return () => {
      if (joinedRef.current) socket.emit('leave-room', { roomId });
      joinedRef.current = false;
    };
  }, [socket, roomId, identity, lockState, roomPassword]);

  useEffect(() => {
    if (!socket) return;

    const onConnect = () => setConnectionStatus('connected');
    const onDisconnect = () => setConnectionStatus('disconnected');
    const onConnectError = () => setConnectionStatus('error');
    const onUsers = (users) => setActiveUsers(users);

    const onActivity = (log) => {
      if (!log) return;
      setLogs((prev) => [log, ...prev].slice(0, 200));
      if (log.username && log.username !== identity?.username) {
        pushFeed(log.details || `${log.username} made a change`, 'event');
      }
    };

    const onFileCreated = ({ file }) => {
      if (!file) return;
      setFilesMap((prev) => (prev[file.path] ? prev : { ...prev, [file.path]: file }));
    };

    const dropPath = (path) => (candidate) => candidate === path || candidate.startsWith(`${path}/`);

    const onFileDeleted = ({ filePath }) => {
      const matches = dropPath(filePath);
      setFilesMap((prev) => Object.fromEntries(Object.entries(prev).filter(([path]) => !matches(path))));
      setOpenFiles((prev) => prev.filter((f) => !matches(f.path)));
      setActiveFilePath((current) => (matches(current) ? null : current));
    };

    const onFileRenamed = ({ oldPath, newPath }) => {
      const matches = dropPath(oldPath);
      const relocate = (path) => (path === oldPath ? newPath : newPath + path.slice(oldPath.length));

      setFilesMap((prev) => {
        const next = {};
        Object.entries(prev).forEach(([path, file]) => {
          if (!matches(path)) { next[path] = file; return; }
          const target = relocate(path);
          next[target] = { ...file, path: target, name: target.split('/').pop() };
        });
        return next;
      });
      setOpenFiles((prev) => prev.map((f) => (matches(f.path)
        ? { ...f, path: relocate(f.path), name: relocate(f.path).split('/').pop() }
        : f)));
      setActiveFilePath((current) => (matches(current) ? relocate(current) : current));
    };

    const onLanguage = ({ filePath, language }) => {
      setFilesMap((prev) => (prev[filePath] ? { ...prev, [filePath]: { ...prev[filePath], language } } : prev));
    };

    const onMessage = (message) => {
      setMessages((prev) => [...prev, message]);
      if (message.sender && message.sender !== identity?.username) {
        pushFeed(`${message.sender}: ${message.text}`, 'chat');
        if (document.hidden) notify(`${message.sender}: ${message.text}`, { title: `#${roomId}`, type: 'event' });
      }
    };

    const onPrivate = (message) => {
      if (message.recipient !== identity?.username && message.sender !== identity?.username) return;
      setPrivateMessages((prev) => [...prev, message]);
      if (message.recipient === identity?.username) {
        notify(message.text, { title: `Private message from ${message.sender}`, type: 'event' });
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('room-users-updated', onUsers);
    socket.on('activity-logged', onActivity);
    socket.on('file-created-broadcast', onFileCreated);
    socket.on('file-deleted-broadcast', onFileDeleted);
    socket.on('file-renamed-broadcast', onFileRenamed);
    socket.on('language-updated', onLanguage);
    socket.on('receive-message', onMessage);
    socket.on('receive-private-message', onPrivate);

    const onPeerTyping = ({ username }) => {
      if (!username || username === identity?.username) return;
      setTypingUsers((prev) => (prev.includes(username) ? prev : [...prev, username]));
    };

    const onPeerTypingStopped = ({ username }) => {
      setTypingUsers((prev) => prev.filter((name) => name !== username));
    };

    socket.on('peer-typing', onPeerTyping);
    socket.on('peer-typing-stopped', onPeerTypingStopped);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('room-users-updated', onUsers);
      socket.off('activity-logged', onActivity);
      socket.off('file-created-broadcast', onFileCreated);
      socket.off('file-deleted-broadcast', onFileDeleted);
      socket.off('file-renamed-broadcast', onFileRenamed);
      socket.off('language-updated', onLanguage);
      socket.off('receive-message', onMessage);
      socket.off('receive-private-message', onPrivate);
      socket.off('peer-typing', onPeerTyping);
      socket.off('peer-typing-stopped', onPeerTypingStopped);
    };
  }, [socket, roomId, identity, pushFeed, notify]);

  /* ----------------------------------------------------- derived state */

  const fileTree = useMemo(() => buildTree(filesMap), [filesMap]);
  const currentFile = activeFilePath ? filesMap[activeFilePath] : null;
  const tree = source === 'folder' ? localTree : fileTree;

  /* --------------------------------------------------------- editing */

  const handleCodeChange = useCallback((value, changes, filePath) => {
    setIsDirty(true);
    setFilesMap((prev) => (prev[filePath] ? { ...prev, [filePath]: { ...prev[filePath], content: value } } : prev));
    void changes;
  }, []);

  const handleLanguageChange = useCallback((newLanguage) => {
    if (!activeFilePath) return;
    setFilesMap((prev) => ({ ...prev, [activeFilePath]: { ...prev[activeFilePath], language: newLanguage } }));
    socket?.emit('language-change', { roomId, filePath: activeFilePath, language: newLanguage });
  }, [activeFilePath, socket, roomId]);

  const writeBackToFolder = useCallback(async (filePath, content) => {
    const handle = fileHandles.current[filePath];
    if (!handle?.createWritable) return false;
    const writable = await handle.createWritable({ keepExistingData: false });
    await writable.write(content);
    await writable.close();
    return true;
  }, []);

  const handleSaveActiveFile = useCallback(async () => {
    if (!currentFile) {
      notify('Open a file first', { type: 'error' });
      return;
    }
    setIsSaving(true);
    try {
      if (source === 'folder') {
        const written = await writeBackToFolder(currentFile.path, currentFile.content ?? '');
        notify(written ? 'Saved to your folder' : 'That folder is read-only, so the change stays in the editor', {
          type: written ? 'success' : 'warn'
        });
      } else {
        socket?.emit('code-change', { roomId, filePath: currentFile.path, content: currentFile.content ?? '' });
        notify('Room buffer saved', { type: 'success' });
      }
      setIsDirty(false);
    } catch (error) {
      notify(error.message || 'Save failed', { type: 'error' });
    } finally {
      setIsSaving(false);
    }
  }, [currentFile, source, socket, roomId, notify, writeBackToFolder]);

  /* -------------------------------------------------------- file ops */

  const openFile = useCallback((file) => {
    setFilesMap((prev) => ({ ...prev, [file.path]: { ...(prev[file.path] || {}), ...file } }));
    setOpenFiles((prev) => (prev.some((f) => f.path === file.path) ? prev : [...prev, file]));
    setActiveFilePath(file.path);
    socket?.emit('file-select', { roomId, filePath: file.path });
  }, [socket, roomId]);

  const handleSelectFile = useCallback(async (item) => {
    if (item.isDirectory) return;
    const path = item.path;

    if (filesMap[path]?.content !== undefined) {
      setOpenFiles((prev) => (prev.some((f) => f.path === path) ? prev : [...prev, filesMap[path]]));
      setActiveFilePath(path);
      socket?.emit('file-select', { roomId, filePath: path });
      return;
    }

    if (source === 'folder' && fileHandles.current[path]) {
      try {
        const file = await fileHandles.current[path].getFile();
        openFile({ name: item.name, path, language: getLanguageFromPath(path), content: await file.text() });
        return;
      } catch {
        notify(`Could not read ${item.name} from disk`, { type: 'error' });
        return;
      }
    }

    openFile({ name: item.name, path, language: getLanguageFromPath(path), content: '' });
  }, [filesMap, source, openFile, notify, socket, roomId]);

  const handleCreateFile = useCallback(async (targetPath, initialContent = '') => {
    const cleanPath = String(targetPath).replace(/\\/g, '/').replace(/^\/+/, '');
    if (!cleanPath) return;
    if (filesMap[cleanPath]) {
      notify('A file with that name already exists here', { type: 'error' });
      return;
    }

    const file = {
      name: cleanPath.split('/').pop(),
      path: cleanPath,
      language: getLanguageFromPath(cleanPath),
      content: initialContent
    };

    if (source === 'folder') {
      try {
        const segments = cleanPath.split('/');
        const name = segments.pop();
        let parent = dirHandles.current[folderRoot.current];
        for (const segment of segments) {
          parent = await parent.getDirectoryHandle(segment, { create: true });
        }
        fileHandles.current[cleanPath] = await parent.getFileHandle(name, { create: true });
      } catch {
        notify('Could not create that file on disk — permission may have expired', { type: 'error' });
        return;
      }
    } else {
      socket?.emit('file-create', { roomId, filePath: cleanPath, content: initialContent, language: file.language });
    }

    openFile(file);
  }, [filesMap, source, socket, roomId, openFile, notify]);

  const handleCreateFolder = useCallback(async (targetPath) => {
    const cleanPath = String(targetPath).replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    if (!cleanPath) return;
    if (source !== 'folder') {
      notify('Rooms hold a flat file list — type a path like src/app.js to group files', { type: 'info' });
      return;
    }
    try {
      let parent = dirHandles.current[folderRoot.current];
      for (const segment of cleanPath.split('/')) {
        parent = await parent.getDirectoryHandle(segment, { create: true });
      }
      notify(`${cleanPath} created`, { type: 'success' });
    } catch {
      notify('Could not create that folder', { type: 'error' });
    }
  }, [source, notify]);

  const handleRenameItem = useCallback((oldPath, newPath) => {
    const cleanPath = String(newPath).replace(/\\/g, '/').replace(/^\/+/, '');
    if (!cleanPath || cleanPath === oldPath) return;

    if (source === 'folder') {
      notify('Renaming files inside your own folder is disabled here — rename them in your OS and reopen', { type: 'warn' });
      return;
    }

    setFilesMap((prev) => {
      const next = { ...prev };
      const file = next[oldPath];
      if (!file) return prev;
      delete next[oldPath];
      next[cleanPath] = { ...file, path: cleanPath, name: cleanPath.split('/').pop(), language: getLanguageFromPath(cleanPath) };
      return next;
    });
    setOpenFiles((prev) => prev.map((f) => (f.path === oldPath ? { ...f, path: cleanPath, name: cleanPath.split('/').pop() } : f)));
    setActiveFilePath((current) => (current === oldPath ? cleanPath : current));
    socket?.emit('file-rename', { roomId, oldPath, newPath: cleanPath });
  }, [source, socket, roomId]);

  const handleDeleteItem = useCallback((targetPath) => {
    if (source === 'folder') {
      notify('Deleting from your own folder is disabled on purpose — remove it in your OS', { type: 'warn' });
      return;
    }
    const matches = dropPath(targetPath);
    setFilesMap((prev) => Object.fromEntries(Object.entries(prev).filter(([path]) => !matches(path))));
    setOpenFiles((prev) => prev.filter((f) => !matches(f.path)));
    setActiveFilePath((current) => (matches(current) ? null : current));
    socket?.emit('file-delete', { roomId, filePath: targetPath });
  }, [source, socket, roomId]);

  const handleCloseTab = useCallback((path) => {
    setOpenFiles((prev) => {
      const next = prev.filter((f) => f.path !== path);
      setActiveFilePath((current) => {
        if (current !== path) return current;
        if (!next.length) return null;
        const index = prev.findIndex((f) => f.path === path);
        return next[Math.min(Math.max(index, 0), next.length - 1)].path;
      });
      return next;
    });
  }, []);

  /* ----------------------------------------------------- folder picker */

  const handleOpenLocalFolder = useCallback(async () => {
    if (!window.showDirectoryPicker) {
      notify('Folder access needs Chrome or Edge. Room files still work in any browser.', { type: 'warn', title: 'Not supported here' });
      return;
    }
    try {
      const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      const handles = {};
      const directoryHandles = {};
      const files = {};

      const walk = async (handle, prefix) => {
        const nodes = [];
        for await (const [name, entry] of handle.entries()) {
          if (name.startsWith('.') || ['node_modules', 'dist', 'build', '.git'].includes(name)) continue;
          const path = prefix ? `${prefix}/${name}` : name;
          if (entry.kind === 'directory') {
            directoryHandles[path] = entry;
            nodes.push({ name, path, isDirectory: true, children: await walk(entry, path) });
          } else {
            handles[path] = entry;
            const leaf = { name, path, isDirectory: false, language: getLanguageFromPath(name) };
            files[path] = { name, path, language: leaf.language, content: undefined };
            nodes.push(leaf);
          }
        }
        return nodes.sort((a, b) => (a.isDirectory === b.isDirectory ? a.name.localeCompare(b.name) : a.isDirectory ? -1 : 1));
      };

      const nodes = await walk(dirHandle, dirHandle.name);
      fileHandles.current = handles;
      dirHandles.current = { [dirHandle.name]: dirHandle, ...directoryHandles };
      folderRoot.current = dirHandle.name;

      setLocalTree(nodes);
      setFilesMap(files);
      setOpenFiles([]);
      setActiveFilePath(null);
      setSource('folder');

      const paths = Object.keys(handles);
      const first = paths.find((path) => /(^|\/)(index|main|app)\.(html|jsx|tsx|js|ts)$/i.test(path)) || paths[0];
      if (first) {
        const file = await handles[first].getFile();
        openFile({ name: first.split('/').pop(), path: first, language: getLanguageFromPath(first), content: await file.text() });
      }
      notify(`${dirHandle.name} opened from your disk`, { type: 'success' });
    } catch (error) {
      if (error.name !== 'AbortError') notify(error.message || 'Could not open that folder', { type: 'error' });
    }
  }, [notify, openFile]);

  const handleCloseFolder = useCallback(() => {
    setSource('room');
    setLocalTree([]);
    fileHandles.current = {};
    dirHandles.current = {};
    folderRoot.current = '';
    loadRoom(roomPassword);
  }, [loadRoom, roomPassword]);

  /* ------------------------------------------------------- snippet lib */

  const requestSaveToLibrary = () => {
    if (!currentFile) return notify('Open a file first', { type: 'error' });
    if (!String(currentFile.content || '').trim()) return notify('That file is empty', { type: 'error' });
    if (!identity?.id) return navigate('/signup');
    setSnippetTitle(currentFile.name);
    setSaveTarget(true);
  };

  const confirmSaveToLibrary = async () => {
    try {
      await api.post('/user/me/snippets', {
        title: snippetTitle || currentFile.name,
        code: currentFile.content,
        language: currentFile.language || 'plaintext',
        tags: [roomId]
      });
      notify(`Saved “${snippetTitle}” to your library`, { type: 'success', title: 'Snippet saved' });
      pushFeed(`saved snippet: ${snippetTitle}`, 'event');
      setSaveTarget(false);
    } catch (error) {
      notify(error.response?.data?.message || 'Could not save the snippet', { type: 'error' });
    }
  };

  /* -------------------------------------------------------- AI actions */

  const applyAiCode = useCallback((code, language) => {
    if (!activeFilePath) {
      notify('Open a file before applying generated code', { type: 'warn' });
      return;
    }
    setFilesMap((prev) => ({
      ...prev,
      [activeFilePath]: { ...prev[activeFilePath], content: code, language: language || prev[activeFilePath]?.language }
    }));
    socket?.emit('code-change', { roomId, filePath: activeFilePath, content: code, language });
    setIsDirty(true);
    notify('Assistant output placed in the editor', { type: 'success' });
  }, [activeFilePath, socket, roomId, notify]);

  const createFileFromAi = useCallback(async (fileName, code, language) => {
    const extensions = { javascript: 'js', typescript: 'ts', python: 'py', html: 'html', css: 'css', markdown: 'md', json: 'json' };
    const path = fileName || `generated.${extensions[language] || 'txt'}`;
    await handleCreateFile(path, code);
  }, [handleCreateFile]);

  /* ------------------------------------------------------------ chat */

  const handleSendMessage = useCallback((text) => {
    socket?.emit('send-message', { roomId, text });
  }, [socket, roomId]);

  const handleSendPrivateMessage = useCallback((recipientUsername, text) => {
    socket?.emit('send-private-message', { roomId, recipientUsername, text });
  }, [socket, roomId]);

  const handleTypingStart = useCallback(() => {
    socket?.emit('typing-start', { roomId });
  }, [socket, roomId]);

  const handleTypingStop = useCallback(() => {
    socket?.emit('typing-stop', { roomId });
  }, [socket, roomId]);

  const openDirectMessage = useCallback((username) => {
    setRightPanel('chat');
    setDmTarget(username);
  }, []);

  /* ------------------------------------------------------- room link */

  const roomLink = useMemo(() => {
    const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
    return `${window.location.origin}${basePath}/workspace/${roomId}`;
  }, [roomId]);

  const copyRoomLink = async () => {
    try {
      await navigator.clipboard.writeText(roomLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return true;
    } catch {
      notify('Clipboard access was refused — copy the address bar instead', { type: 'warn' });
      return false;
    }
  };

  // Hosts rename or re-describe their room from the People panel; the server
  // owns the permission check, so a non-host just gets the 403 message back.
  const handleUpdateRoom = useCallback(async (patch) => {
    try {
      const response = await api.patch(`/rooms/${encodeURIComponent(roomId)}`, patch);
      const room = response.data?.room;
      setRoomMeta((prev) => ({
        ...(prev || { roomId }),
        title: room?.title || prev?.title,
        description: room?.description ?? prev?.description
      }));
      notify('Room details updated', { type: 'success' });
      return true;
    } catch (error) {
      notify(error.response?.data?.message || 'Could not update the room', { type: 'error' });
      return false;
    }
  }, [roomId, notify]);

  /* ------------------------------------------------- import / export */

  // Room files arrive from someone else's machine, so every import is written
  // through the same socket events a manual edit uses: peers see the files, the
  // room log records them and they survive a reload.
  const applyEntriesToRoom = useCallback((entries) => {
    const opened = [];
    entries.forEach((entry) => {
      const language = getLanguageFromPath(entry.path);
      const content = entry.content ?? '';
      const file = { name: entry.path.split('/').pop(), path: entry.path, language, content };
      const exists = Boolean(filesMap[entry.path]);

      setFilesMap((prev) => ({ ...prev, [entry.path]: { ...(prev[entry.path] || {}), ...file } }));
      if (exists) {
        socket?.emit('code-change', { roomId, filePath: entry.path, content, language });
      } else {
        socket?.emit('file-create', { roomId, filePath: entry.path, content, language });
      }
      opened.push(file);
    });

    if (opened.length) {
      const entryFile = opened.find((file) => /\.html$/i.test(file.path)) || opened[0];
      setOpenFiles((prev) => (prev.some((file) => file.path === entryFile.path) ? prev : [...prev, entryFile]));
      setActiveFilePath(entryFile.path);
      setShowPreview(true);
      pushFeed(`imported ${opened.length} file${opened.length === 1 ? '' : 's'} into the room`, 'event');
    }
  }, [filesMap, socket, roomId, pushFeed]);

  const runImport = useCallback(async (pick, label) => {
    if (source === 'folder') {
      notify('Close your local folder first — the × in the file tree header — so the import lands in the room, not on your disk', {
        type: 'warn',
        title: 'You are editing your own folder'
      });
      return;
    }

    setIsImporting(true);
    try {
      const picked = await pick();
      if (!picked) return;
      const { entries, skipped } = await readFilesForRoom(picked);
      if (!entries.length) {
        notify(skipped.length ? `Nothing text-based in that ${label}` : `That ${label} was empty`, { type: 'warn' });
        return;
      }
      applyEntriesToRoom(entries);
      notify(
        `${entries.length} file${entries.length === 1 ? '' : 's'} added from your ${label}${skipped.length ? ` · ${skipped.length} skipped` : ''}`,
        { type: 'success', title: 'Imported into the room' }
      );
      if (skipped.length) {
        notify(`Skipped: ${skipped.slice(0, 4).map((item) => item.path).join(', ')}${skipped.length > 4 ? '…' : ''}`, { type: 'info' });
      }
    } catch (error) {
      notify(error.message || 'That import did not finish', { type: 'error' });
    } finally {
      setIsImporting(false);
    }
  }, [source, applyEntriesToRoom, notify]);

  const handleImportFiles = useCallback(() => runImport(() => pickFiles(), 'selection'), [runImport]);
  const handleImportFolder = useCallback(() => runImport(() => pickFiles({ directory: true }), 'folder'), [runImport]);

  // Reading through the open folder handles means an import/export never sends
  // file content anywhere — it comes from, and goes back to, the visitor.
  const handleExportProject = useCallback(async () => {
    const paths = Object.keys(filesMap);
    if (!paths.length) {
      notify('This room has no files to save yet', { type: 'warn' });
      return;
    }

    const entries = [];
    for (const path of paths) {
      let content = filesMap[path]?.content;
      if (content === undefined && fileHandles.current[path]) {
        try {
          const handle = await fileHandles.current[path].getFile();
          content = await handle.text();
        } catch {
          content = undefined;
        }
      }
      if (typeof content === 'string') entries.push({ path, content });
    }

    if (!entries.length) {
      notify('Open the files once, then save them to your device', { type: 'warn' });
      return;
    }

    downloadProjectZip(roomMeta?.title || roomId, entries);
    notify(`${entries.length} file${entries.length === 1 ? '' : 's'} saved as a .zip on your device`, {
      type: 'success',
      title: 'Saved to your device'
    });
    pushFeed(`exported ${entries.length} files to a local zip`, 'event');
  }, [filesMap, roomId, roomMeta, notify, pushFeed]);

  /* ------------------------------------------------------ agent edits */

  // The agent proposes operations; this is the only place they touch state, so
  // a bad path or a model hallucination cannot reach the room unchecked.
  const applyProjectOps = useCallback((operations) => {
    if (!Array.isArray(operations) || !operations.length) {
      notify('The assistant proposed no file changes', { type: 'info' });
      return 0;
    }

    let changed = 0;
    operations.forEach((operation) => {
      const path = String(operation.path || '').replace(/\\/g, '/').replace(/^\.?\//, '');
      if (!path || path.includes('..') || path.startsWith('/')) return;

      if (operation.type === 'delete') {
        const matches = dropPath(path);
        setFilesMap((prev) => Object.fromEntries(Object.entries(prev).filter(([candidate]) => !matches(candidate))));
        setOpenFiles((prev) => prev.filter((file) => !matches(file.path)));
        setActiveFilePath((current) => (matches(current) ? null : current));
        socket?.emit('file-delete', { roomId, filePath: path });
        changed += 1;
        return;
      }

      if (typeof operation.content !== 'string') return;
      const language = getLanguageFromPath(path);
      const file = { name: path.split('/').pop(), path, language, content: operation.content };
      const exists = Boolean(filesMap[path]);

      setFilesMap((prev) => ({ ...prev, [path]: { ...(prev[path] || {}), ...file } }));
      setOpenFiles((prev) => (prev.some((item) => item.path === path) ? prev : [...prev, file]));
      if (exists) {
        socket?.emit('code-change', { roomId, filePath: path, content: operation.content, language });
      } else {
        socket?.emit('file-create', { roomId, filePath: path, content: operation.content, language });
      }
      changed += 1;
    });

    if (changed) {
      const first = operations.find((operation) => operation.type !== 'delete');
      if (first) setActiveFilePath(first.path.replace(/\\/g, '/').replace(/^\.?\//, ''));
      setShowPreview(true);
      setIsDirty(false);
      notify(`${changed} file${changed === 1 ? '' : 's'} updated in the room`, { type: 'success', title: 'Assistant applied' });
      pushFeed(`assistant changed ${changed} file${changed === 1 ? '' : 's'}`, 'event');
    }
    return changed;
  }, [filesMap, socket, roomId, notify, pushFeed]);

  /* -------------------------------------------------------- rendering */

  if (lockState === 'checking') {
    return (
      <div className="ws-boot">
        <span className="ws-boot-spinner" />
        <p>Opening {roomId}…</p>
      </div>
    );
  }

  if (lockState === 'error') {
    return (
      <div className="ws-boot">
        <div className="ws-lock">
          <h1>That room could not be loaded</h1>
          <p className="ws-lock-sub">The server did not respond. Check that it is running, then try again.</p>
          <button type="button" className="ws-btn" onClick={() => { setLockState('checking'); loadRoom(roomPassword); }}>
            Try again
          </button>
          <Link to="/" className="ws-lock-back">Back to home</Link>
        </div>
      </div>
    );
  }

  if (lockState === 'locked' || lockState === 'rejected') {
    return (
      <div className="ws-boot">
        <form
          className="ws-lock"
          onSubmit={(event) => {
            event.preventDefault();
            setLockState('checking');
            loadRoom(roomPassword);
          }}
        >
          <span className="ws-lock-icon"><Lock size={19} /></span>
          <h1>{roomMeta?.title ? roomMeta.title : 'This room is private'}</h1>
          <p className="ws-lock-sub">Enter the password the host set when creating the room.</p>
          {lockState === 'rejected' && <p className="ws-lock-bad">That password did not match.</p>}
          <input
            type="password"
            value={roomPassword}
            onChange={(event) => { setRoomPassword(event.target.value); if (lockState === 'rejected') setLockState('locked'); }}
            placeholder="Room password"
            autoFocus
            aria-label="Room password"
          />
          <button type="submit">Unlock room</button>
          <Link to="/" className="ws-lock-back">Back to home</Link>
        </form>
      </div>
    );
  }

  const statusTone = { connected: 'is-ok', disconnected: 'is-bad', connecting: 'is-wait', error: 'is-bad' }[connectionStatus];
  const otherPeople = activeUsers.filter((person) => person.socketId !== socket?.id);

  return (
    <div className={`ws-root ${theme === 'dark' ? 'dark-scope' : ''}`}>
      <header className="ws-topbar">
        <div className="ws-top-left">
          <button
            className={`ws-icon-btn ${showExplorer ? 'is-on' : ''}`}
            onClick={() => setShowExplorer((value) => !value)}
            title="Toggle file tree"
            aria-label="Toggle file tree"
          >
            {showExplorer ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
          </button>

          <div className="ws-room">
            <span className={`ws-live ${statusTone}`} title={`Socket ${connectionStatus}`} />
            <span className="ws-room-name" title={roomLink}>{roomMeta?.title || roomId}</span>
            {roomMeta?.isPrivate && <span className="ws-room-tag"><Lock size={10} /> private</span>}
            {guestMode && <span className="ws-room-tag is-guest"><ShieldAlert size={10} /> guest</span>}
          </div>

          <button className="ws-chip" onClick={copyRoomLink} title="Copy invite link">
            {copied ? <Check size={13} /> : <Link2 size={13} />}
            {copied ? 'Copied' : 'Invite'}
          </button>
        </div>

        <div className="ws-segmented">
          <button
            className={!showPreview && !showVideo ? 'is-on' : ''}
            onClick={() => { setShowPreview(false); setShowVideo(false); setVideoMaximized(false); }}
          >
            <Code2 size={13} /> Editor
          </button>
          <button
            className={showPreview ? 'is-on' : ''}
            onClick={() => { setShowPreview((value) => !value); setVideoMaximized(false); }}
          >
            {showPreview ? <Square size={13} /> : <Play size={13} />} Preview
          </button>
          <button
            className={showVideo ? 'is-on' : ''}
            onClick={() => { setShowVideo((value) => !value); setVideoMaximized(false); }}
          >
            <Video size={13} /> Call
          </button>
        </div>

        <div className="ws-top-right">
          <button
            type="button"
            className={`ws-presence${rightPanel === 'people' ? ' is-on' : ''}`}
            onClick={() => setRightPanel('people')}
            title={otherPeople.length ? otherPeople.map((p) => p.username).join(', ') : 'You are alone here'}
          >
            <span className="ws-presence-stack">
              {activeUsers.slice(0, 3).map((person) => (
                <span key={person.socketId || person.username} className="ws-presence-avatar">
                  {String(person.username || '?').slice(0, 1).toUpperCase()}
                </span>
              ))}
              {activeUsers.length === 0 && <span className="ws-presence-avatar">?</span>}
            </span>
            <span className="ws-presence-count">{activeUsers.length || 1}</span>
          </button>
          <button className="ws-chip" onClick={requestSaveToLibrary} disabled={!currentFile}>
            <Sparkles size={13} /> Snippet
          </button>
          {isAdmin && (
            <button className={`ws-chip ${rightPanel === 'activity' ? 'is-on' : ''}`} onClick={() => setRightPanel('activity')}>
              <Activity size={13} /> Log
            </button>
          )}
        </div>
      </header>

      <div className="ws-body">
        {showExplorer && (
          <aside className="ws-side">
            <FileExplorer
              fileTree={tree}
              activeFilePath={activeFilePath}
              onSelectFile={handleSelectFile}
              onCreateFile={handleCreateFile}
              onCreateFolder={handleCreateFolder}
              onRenameItem={handleRenameItem}
              onDeleteItem={handleDeleteItem}
              onOpenLocalFolder={handleOpenLocalFolder}
              onCloseFolder={handleCloseFolder}
              onImportFiles={handleImportFiles}
              onImportFolder={handleImportFolder}
              onExportProject={handleExportProject}
              onRefreshTree={() => (source === 'room' ? loadRoom(roomPassword) : handleOpenLocalFolder())}
              isLocalDiskSync={source === 'folder'}
              isImporting={isImporting}
              peers={peers}
            />
          </aside>
        )}

        <main className="ws-main">
          {videoMaximized ? (
            <VideoCallContainer
              socket={socket}
              roomId={roomId}
              username={identity?.username}
              activeUsers={activeUsers}
              theme={theme}
              isMaximized
              onToggleMaximize={() => setVideoMaximized(false)}
              onClose={() => { setShowVideo(false); setVideoMaximized(false); }}
            />
          ) : (
            <div className={`ws-grid${showPreview ? ' has-preview' : ''}${showVideo ? ' has-video' : ''}`}>
              <section className="ws-cell">
                {openFiles.length ? (
                  <SharedEditor
                    code={currentFile?.content ?? ''}
                    language={currentFile?.language || 'plaintext'}
                    onCodeChange={handleCodeChange}
                    onLanguageChange={handleLanguageChange}
                    openFiles={openFiles}
                    activeFilePath={activeFilePath}
                    onSelectTab={handleSelectFile}
                    onCloseTab={handleCloseTab}
                    onSaveActiveFile={handleSaveActiveFile}
                    onTogglePreview={() => setShowPreview((value) => !value)}
                    showLivePreview={showPreview}
                    isDirty={isDirty}
                    isSaving={isSaving}
                    isLocalDiskSync={source === 'folder'}
                    theme={theme === 'dark' ? 'pc-dark' : 'vs'}
                    socket={socket}
                    roomId={roomId}
                    username={identity?.username}
                    onPresenceChange={setPeers}
                  />
                ) : (
                  <div className="ws-empty">
                    <FolderTree size={28} />
                    <h2>Nothing open yet</h2>
                    <p>
                      {source === 'folder'
                        ? 'Pick a file on the left to edit it, or create a new one.'
                        : 'Create a file to start, or open a folder from your own machine.'}
                    </p>
                    <div className="ws-empty-actions">
                      <button className="ws-btn" onClick={() => handleCreateFile('index.html', STARTER_HTML)}>
                        Start an HTML file
                      </button>
                      <button className="ws-btn is-ghost" onClick={handleOpenLocalFolder}>
                        Open my folder
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {showPreview && (
                <section className="ws-cell">
                  <LivePreviewPanel
                    activeFileContent={currentFile?.content ?? ''}
                    activeFilePath={activeFilePath}
                    filesMap={filesMap}
                    onClose={() => setShowPreview(false)}
                  />
                </section>
              )}

              {showVideo && (
                <section className="ws-cell">
                  <VideoCallContainer
                    socket={socket}
                    roomId={roomId}
                    username={identity?.username}
                    activeUsers={activeUsers}
                    theme={theme}
                    isMaximized={false}
                    onToggleMaximize={() => setVideoMaximized(true)}
                    onClose={() => setShowVideo(false)}
                  />
                </section>
              )}
            </div>
          )}
        </main>

        <aside className="ws-rail">
          <div className="ws-rail-tabs">
            <button className={rightPanel === 'chat' ? 'is-on' : ''} onClick={() => setRightPanel('chat')}>
              <MessageSquare size={13} /> Chat
            </button>
            <button className={rightPanel === 'people' ? 'is-on' : ''} onClick={() => setRightPanel('people')}>
              <Users size={13} /> People
              <span className="ws-rail-count">{activeUsers.length || 1}</span>
            </button>
            <button className={rightPanel === 'ai' ? 'is-on' : ''} onClick={() => setRightPanel('ai')}>
              <Sparkles size={13} /> Assistant
            </button>
            {isAdmin && (
              <button className={rightPanel === 'activity' ? 'is-on' : ''} onClick={() => setRightPanel('activity')}>
                <Activity size={13} /> Log
              </button>
            )}
          </div>

          <div className="ws-rail-body">
            {rightPanel === 'chat' && (
              <ChatPanel
                messages={messages}
                privateMessages={privateMessages}
                onSendMessage={handleSendMessage}
                onSendPrivateMessage={handleSendPrivateMessage}
                currentUser={identity}
                activeUsers={activeUsers}
                typingUsers={typingUsers}
                onTypingStart={handleTypingStart}
                onTypingStop={handleTypingStop}
                directTo={dmTarget}
                onDirectConsumed={() => setDmTarget('')}
              />
            )}
            {rightPanel === 'people' && (
              <ParticipantsPanel
                users={activeUsers}
                currentUser={identity}
                socketId={socket?.id}
                roomMeta={roomMeta}
                roomLink={roomLink}
                onCopyLink={copyRoomLink}
                onMessageUser={openDirectMessage}
                typingUsers={typingUsers}
                guestMode={guestMode}
                onUpdateRoom={handleUpdateRoom}
                canEdit={Boolean(identity?.id && roomMeta?.createdBy?.id && String(identity.id) === String(roomMeta.createdBy.id)) || isAdmin}
              />
            )}
            {rightPanel === 'ai' && (
              <AiAssistantPanel
                activeCode={currentFile?.content ?? ''}
                activeFilePath={activeFilePath}
                language={currentFile?.language || 'plaintext'}
                filesMap={filesMap}
                onApplyCodeToEditor={applyAiCode}
                onCreateFileFromAi={createFileFromAi}
                onApplyProjectOps={applyProjectOps}
                username={identity?.username}
              />
            )}
            {rightPanel === 'activity' && <ActivityLogPanel logs={logs} />}
          </div>
        </aside>
      </div>

      {saveTarget && (
        <div className="ws-modal-backdrop" role="dialog" aria-modal="true" aria-label="Save snippet" onClick={() => setSaveTarget(false)}>
          <form
            className="ws-modal"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => { event.preventDefault(); confirmSaveToLibrary(); }}
          >
            <div className="ws-modal-head">
              <h2>Save to your library</h2>
              <button type="button" className="ws-icon-btn" onClick={() => setSaveTarget(false)} aria-label="Close"><X size={15} /></button>
            </div>
            <label className="ws-field">
              <span>Title</span>
              <input value={snippetTitle} onChange={(event) => setSnippetTitle(event.target.value)} autoFocus />
            </label>
            <p className="ws-modal-note">
              {currentFile?.name} · {(currentFile?.content || '').length.toLocaleString()} characters · {currentFile?.language}
            </p>
            <button type="submit" className="ws-btn is-wide">Save snippet</button>
          </form>
        </div>
      )}

      {isDirty && (
        <button className="ws-dirty" onClick={handleSaveActiveFile} title="Save (Ctrl+S)">
          <HardDrive size={12} /> {isSaving ? 'saving…' : 'unsaved'}
        </button>
      )}
    </div>
  );
};

const dropPath = (path) => (candidate) => Boolean(candidate) && (candidate === path || candidate.startsWith(`${path}/`));

export default WorkspacePage;
