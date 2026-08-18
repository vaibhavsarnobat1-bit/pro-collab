import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import SharedEditor from '../components/SharedEditor';
import FileExplorer from '../components/FileExplorer';
import ChatPanel from '../components/ChatPanel';
import ActivityLogPanel from '../components/ActivityLogPanel';
import VideoCallContainer from '../components/VideoCallContainer';
import LivePreviewPanel from '../components/LivePreviewPanel';
import {
  Monitor, Video, MessageSquare, Activity, Copy, Check, Users, Sparkles,
  Code2, X, Settings, Bell, Search, PanelLeftClose, PanelLeft, HardDrive,
  FolderTree, RefreshCw, Play, Square, Layout, Layers, Maximize2, Minimize2
} from 'lucide-react';

// Start with NO default files — workspace is clean until user opens their folder
const DEFAULT_FILES = {};


const getLanguageFromPath = (filePath = '') => {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const map = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    html: 'html',
    css: 'css',
    json: 'json',
    md: 'markdown',
    cpp: 'cpp',
    c: 'c',
    h: 'cpp',
    rs: 'rust',
    go: 'go',
    java: 'java'
  };
  return map[ext] || 'plaintext';
};

const WorkspacePage = () => {
  const { roomId: paramRoomId } = useParams();
  const roomId = paramRoomId || 'default-room';
  
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  // Multi-File & Explorer States — start completely empty
  const [filesMap, setFilesMap] = useState({});
  const [fileTree, setFileTree] = useState([]);
  const [openFiles, setOpenFiles] = useState([]);
  const [activeFilePath, setActiveFilePath] = useState(null);
  const [showExplorer, setShowExplorer] = useState(true);
  const [isLocalDiskSync, setIsLocalDiskSync] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTreeLoading, setIsTreeLoading] = useState(false);

  // Stores FileSystemFileHandle for each file so we can read content on-demand
  const fileHandlesMap = useRef({});

  // On-demand Live Web Run Preview state (Default hidden)
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [isVideoMaximized, setIsVideoMaximized] = useState(false);

  // General Room States
  const [activeUsers, setActiveUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [messages, setMessages] = useState([]);
  const [privateMessages, setPrivateMessages] = useState([]);
  const [copied, setCopied] = useState(false);
  
  // Workspace Modes: 'editor' | 'split' (Code + Video) | 'video' (Full HD Call)
  const [activeTab, setActiveTab] = useState('editor');
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  // Convert flat filesMap into a tree structure for fallback
  const generateTreeFromFilesMap = (files) => {
    return Object.values(files).map((f) => ({
      name: f.name || f.path,
      path: f.path,
      isDirectory: false,
      language: f.language
    }));
  };

  // Fetch Local Disk Workspace Tree (from VS Code / Antigravity directory)
  const fetchLocalWorkspaceTree = async () => {
    setIsTreeLoading(true);
    try {
      const response = await api.get('/fs/tree');
      if (response.data.tree) {
        setFileTree(response.data.tree);
        setIsLocalDiskSync(true);
      }
    } catch (err) {
      console.warn('Could not load local filesystem tree, using room files:', err.message);
      setIsLocalDiskSync(false);
    } finally {
      setIsTreeLoading(false);
    }
  };

  // Initial Room Data Load (no default files fallback)
  useEffect(() => {
    const fetchRoomData = async () => {
      try {
        const response = await api.get(`/rooms/${roomId}`);
        if (response.data.room) {
          const roomFiles = response.data.room.files || {};
          if (Object.keys(roomFiles).length > 0) {
            setFilesMap(roomFiles);
            if (!isLocalDiskSync) {
              setFileTree(generateTreeFromFilesMap(roomFiles));
            }
          }
        }
        if (response.data.logs) setLogs(response.data.logs);
        if (response.data.messages) setMessages(response.data.messages);
      } catch (err) {
        console.error('Failed to load room data:', err);
      }
    };

    fetchRoomData();
    // Note: fetchLocalWorkspaceTree() is NOT called on startup.
    // Files only load when the user explicitly clicks "Open Folder".
  }, [roomId]);


  // Socket setup & Event listeners
  useEffect(() => {
    if (!socket || !user) return;

    socket.emit('join-room', { roomId, user });

    socket.on('connect', () => setConnectionStatus('connected'));
    socket.on('disconnect', () => setConnectionStatus('disconnected'));
    socket.on('connect_error', () => setConnectionStatus('error'));

    // Multi-File Code Update from other peers
    socket.on('code-updated', ({ filePath = 'index.html', content }) => {
      setFilesMap((prev) => {
        const existing = prev[filePath] || { name: filePath.split('/').pop(), path: filePath, language: getLanguageFromPath(filePath) };
        return {
          ...prev,
          [filePath]: { ...existing, content }
        };
      });
    });

    // Language Update
    socket.on('language-updated', ({ filePath = 'index.html', language: newLang }) => {
      setFilesMap((prev) => {
        if (!prev[filePath]) return prev;
        return {
          ...prev,
          [filePath]: { ...prev[filePath], language: newLang }
        };
      });
    });

    // File Operations broadcasts
    socket.on('file-created-broadcast', ({ file }) => {
      if (!file) return;
      setFilesMap((prev) => ({ ...prev, [file.path]: file }));
      if (isLocalDiskSync) {
        fetchLocalWorkspaceTree();
      } else {
        setFileTree((prev) => [...prev, { name: file.name, path: file.path, isDirectory: false, language: file.language }]);
      }
    });

    socket.on('file-deleted-broadcast', ({ filePath }) => {
      setFilesMap((prev) => {
        const next = { ...prev };
        delete next[filePath];
        return next;
      });
      setOpenFiles((prev) => prev.filter((f) => f.path !== filePath));
      if (isLocalDiskSync) {
        fetchLocalWorkspaceTree();
      } else {
        setFileTree((prev) => prev.filter((f) => f.path !== filePath));
      }
    });

    socket.on('file-renamed-broadcast', ({ oldPath, newPath }) => {
      setFilesMap((prev) => {
        const next = { ...prev };
        if (next[oldPath]) {
          const file = next[oldPath];
          delete next[oldPath];
          file.path = newPath;
          file.name = newPath.split('/').pop();
          next[newPath] = file;
        }
        return next;
      });
      setOpenFiles((prev) =>
        prev.map((f) => (f.path === oldPath ? { ...f, path: newPath, name: newPath.split('/').pop() } : f))
      );
      if (activeFilePath === oldPath) {
        setActiveFilePath(newPath);
      }
      if (isLocalDiskSync) {
        fetchLocalWorkspaceTree();
      }
    });

    socket.on('room-users-updated', (users) => setActiveUsers(users));
    socket.on('activity-logged', (newLog) => setLogs((prev) => [newLog, ...prev]));
    
    // Group Message
    socket.on('receive-message', (msgObj) => setMessages((prev) => [...prev, msgObj]));

    // 1-on-1 Private Direct Message
    socket.on('receive-private-message', (dmObj) => {
      if (dmObj.recipient === user.username || dmObj.sender === user.username) {
        setPrivateMessages((prev) => [...prev, dmObj]);
      }
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('code-updated');
      socket.off('language-updated');
      socket.off('file-created-broadcast');
      socket.off('file-deleted-broadcast');
      socket.off('file-renamed-broadcast');
      socket.off('room-users-updated');
      socket.off('activity-logged');
      socket.off('receive-message');
      socket.off('receive-private-message');
    };
  }, [socket, roomId, user, activeFilePath, isLocalDiskSync]);

  // Active File Data — only when a file is actually selected
  const currentFile = activeFilePath
    ? (filesMap[activeFilePath] || {
        name: activeFilePath.split('/').pop(),
        path: activeFilePath,
        language: getLanguageFromPath(activeFilePath),
        content: ''
      })
    : null;

  // Code change in active file
  const handleCodeChange = (newContent, lineNumber) => {
    setIsDirty(true);
    setFilesMap((prev) => ({
      ...prev,
      [activeFilePath]: {
        ...currentFile,
        content: newContent
      }
    }));

    if (socket) {
      socket.emit('code-change', {
        roomId,
        filePath: activeFilePath,
        content: newContent,
        lineNumber,
        language: currentFile.language
      });
    }
  };

  // Language change for active file
  const handleLanguageChange = (newLang) => {
    setFilesMap((prev) => ({
      ...prev,
      [activeFilePath]: {
        ...currentFile,
        language: newLang
      }
    }));

    if (socket) {
      socket.emit('language-change', {
        roomId,
        filePath: activeFilePath,
        language: newLang
      });
    }
  };

  // Select a file from File Explorer — read content directly from browser file handle
  const handleSelectFile = async (item) => {
    if (item.isDirectory) return;

    const path = item.path;
    setActiveFilePath(path);

    // If we already loaded this file's content, just switch to it
    if (filesMap[path] && filesMap[path].content !== undefined) {
      setOpenFiles((prev) => {
        if (!prev.some((f) => f.path === path)) {
          return [...prev, filesMap[path]];
        }
        return prev;
      });
      return;
    }

    // Try reading via stored FileSystemFileHandle (browser File System Access API)
    const handle = fileHandlesMap.current[path];
    if (handle) {
      try {
        const file = await handle.getFile();
        const content = await file.text();
        const fileData = {
          name: item.name || path.split('/').pop(),
          path,
          language: getLanguageFromPath(path),
          content
        };
        setFilesMap((prev) => ({ ...prev, [path]: fileData }));
        setOpenFiles((prev) => {
          const without = prev.filter((f) => f.path !== path);
          return [...without, fileData];
        });
        return;
      } catch (err) {
        console.error('Error reading file from handle:', err);
      }
    }

    // Fallback: try backend API (for server-side disk sync)
    if (isLocalDiskSync) {
      try {
        const response = await api.get(`/fs/file?filePath=${encodeURIComponent(path)}`);
        const fileData = {
          name: response.data.name || path.split('/').pop(),
          path: response.data.path || path,
          language: response.data.language || getLanguageFromPath(path),
          content: response.data.content !== undefined ? response.data.content : ''
        };
        setFilesMap((prev) => ({ ...prev, [path]: fileData }));
        setOpenFiles((prev) => {
          const without = prev.filter((f) => f.path !== path);
          return [...without, fileData];
        });
        return;
      } catch (err) {
        console.error('Error fetching file from server:', err);
      }
    }

    // Last resort: open as empty file
    const fileData = {
      name: item.name || path.split('/').pop(),
      path,
      language: getLanguageFromPath(path),
      content: ''
    };
    setFilesMap((prev) => ({ ...prev, [path]: fileData }));
    setOpenFiles((prev) => {
      if (!prev.some((f) => f.path === path)) return [...prev, fileData];
      return prev;
    });

    if (socket) {
      socket.emit('file-select', { roomId, filePath: path });
    }
  };

  // Select Open Tab
  const handleSelectTab = (path) => {
    setActiveFilePath(path);
    if (socket) {
      socket.emit('file-select', { roomId, filePath: path });
    }
  };

  // Close Tab
  const handleCloseTab = (path) => {
    const nextOpen = openFiles.filter((f) => f.path !== path);
    setOpenFiles(nextOpen);
    if (activeFilePath === path && nextOpen.length > 0) {
      setActiveFilePath(nextOpen[nextOpen.length - 1].path);
    }
  };

  // Save Active File to Local Disk & Room Store
  const handleSaveActiveFile = async () => {
    setIsSaving(true);
    try {
      if (isLocalDiskSync) {
        await api.post('/fs/save', {
          filePath: activeFilePath,
          content: currentFile.content
        });
      }
      setIsDirty(false);
    } catch (err) {
      console.error('Save to disk error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Create New File
  const handleCreateFile = async (targetPath, initialContent = '') => {
    const cleanPath = targetPath.replace(/\\/g, '/');
    const lang = getLanguageFromPath(cleanPath);
    const content = initialContent || `// New file: ${cleanPath}\n`;

    try {
      if (isLocalDiskSync) {
        await api.post('/fs/create', {
          targetPath: cleanPath,
          isDirectory: false,
          initialContent: content
        });
        await fetchLocalWorkspaceTree();
      }

      const newFileObj = {
        name: cleanPath.split('/').pop(),
        path: cleanPath,
        language: lang,
        content
      };

      setFilesMap((prev) => ({ ...prev, [cleanPath]: newFileObj }));
      setOpenFiles((prev) => {
        if (!prev.some((f) => f.path === cleanPath)) {
          return [...prev, newFileObj];
        }
        return prev;
      });
      setActiveFilePath(cleanPath);

      if (socket) {
        socket.emit('file-create', {
          roomId,
          filePath: cleanPath,
          content,
          language: lang
        });
      }
    } catch (err) {
      console.error('Error creating file:', err);
    }
  };

  // Create New Folder
  const handleCreateFolder = async (targetPath) => {
    const cleanPath = targetPath.replace(/\\/g, '/');
    try {
      if (isLocalDiskSync) {
        await api.post('/fs/create', {
          targetPath: cleanPath,
          isDirectory: true
        });
        await fetchLocalWorkspaceTree();
      }
    } catch (err) {
      console.error('Error creating folder:', err);
    }
  };

  // Rename File / Folder
  const handleRenameItem = async (oldPath, newPath) => {
    try {
      if (isLocalDiskSync) {
        await api.post('/fs/rename', { oldPath, newPath });
        await fetchLocalWorkspaceTree();
      }

      setFilesMap((prev) => {
        const next = { ...prev };
        if (next[oldPath]) {
          const file = next[oldPath];
          delete next[oldPath];
          file.path = newPath;
          file.name = newPath.split('/').pop();
          next[newPath] = file;
        }
        return next;
      });

      setOpenFiles((prev) =>
        prev.map((f) => (f.path === oldPath ? { ...f, path: newPath, name: newPath.split('/').pop() } : f))
      );

      if (activeFilePath === oldPath) {
        setActiveFilePath(newPath);
      }

      if (socket) {
        socket.emit('file-rename', { roomId, oldPath, newPath });
      }
    } catch (err) {
      console.error('Error renaming item:', err);
    }
  };

  // Delete File / Folder
  const handleDeleteItem = async (targetPath) => {
    try {
      if (isLocalDiskSync) {
        await api.post('/fs/delete', { targetPath });
        await fetchLocalWorkspaceTree();
      }

      setFilesMap((prev) => {
        const next = { ...prev };
        delete next[targetPath];
        return next;
      });

      setOpenFiles((prev) => prev.filter((f) => f.path !== targetPath));
      if (activeFilePath === targetPath) {
        const remaining = openFiles.filter((f) => f.path !== targetPath);
        if (remaining.length > 0) {
          setActiveFilePath(remaining[0].path);
        }
      }

      if (socket) {
        socket.emit('file-delete', { roomId, filePath: targetPath });
      }
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };

  // Open Local Folder via File System Access API — stores file handles for on-demand reading
  const handleOpenCustomLocalFolder = async () => {
    if (!window.showDirectoryPicker) {
      alert('Please use Google Chrome or Edge to use the folder picker.');
      return;
    }

    try {
      const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      const newHandles = {};

      // Recursively read directory, store file handles
      const readDirRecursive = async (handle, path = '') => {
        const entries = [];
        for await (const [name, entry] of handle.entries()) {
          // Skip hidden files, node_modules, build dirs
          if (
            name.startsWith('.') ||
            name === 'node_modules' ||
            name === 'dist' ||
            name === 'build' ||
            name === '.git'
          ) continue;

          const currentPath = path ? `${path}/${name}` : name;

          if (entry.kind === 'directory') {
            const children = await readDirRecursive(entry, currentPath);
            entries.push({ name, path: currentPath, isDirectory: true, children });
          } else {
            // Store file handle for later content reading
            newHandles[currentPath] = entry;
            entries.push({
              name,
              path: currentPath,
              isDirectory: false,
              language: getLanguageFromPath(name)
            });
          }
        }
        // Sort: folders first, then files, both alphabetically
        entries.sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        });
        return entries;
      };

      const tree = await readDirRecursive(dirHandle, dirHandle.name);
      fileHandlesMap.current = newHandles;

      // Clear state first
      setOpenFiles([]);
      setActiveFilePath(null);
      setFilesMap({});
      setFileTree(tree);
      setIsLocalDiskSync(true);

      // ── Auto-open first file (like VS Code) ──
      // Priority: README > index.* > any first file found
      const allPaths = Object.keys(newHandles);
      const priority = ['readme.md', 'readme.txt', 'index.html', 'index.js', 'index.ts', 'index.jsx', 'index.tsx', 'main.js', 'main.ts', 'app.js', 'app.ts', 'app.jsx', 'app.tsx'];
      
      let firstFilePath = allPaths.find((p) =>
        priority.includes(p.split('/').pop().toLowerCase())
      ) || allPaths[0];

      if (firstFilePath && newHandles[firstFilePath]) {
        try {
          const fileHandle = newHandles[firstFilePath];
          const file = await fileHandle.getFile();
          const content = await file.text();
          const fileName = firstFilePath.split('/').pop();
          const fileData = {
            name: fileName,
            path: firstFilePath,
            language: getLanguageFromPath(fileName),
            content
          };
          setFilesMap({ [firstFilePath]: fileData });
          setOpenFiles([fileData]);
          setActiveFilePath(firstFilePath);
        } catch (e) {
          console.warn('Could not auto-open first file:', e);
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error opening folder:', err);
      }
    }
  };

  // Close Folder — reset everything back to clean state
  const handleCloseFolder = () => {
    setFileTree([]);
    setFilesMap({});
    setOpenFiles([]);
    setActiveFilePath(null);
    setIsLocalDiskSync(false);
    setIsDirty(false);
    fileHandlesMap.current = {};   // Clear all stored file handles
  };

  // Group Chat message send
  const handleSendMessage = (text) => {
    if (socket) {
      socket.emit('send-message', { roomId, text, sender: user?.username });
    }
  };

  // 1-on-1 Direct Private Message send
  const handleSendPrivateMessage = (recipientUsername, text) => {
    if (socket) {
      socket.emit('send-private-message', {
        roomId,
        recipientUsername,
        text,
        sender: user?.username
      });
    }
  };

  // Copy Room Link
  const copyRoomLink = () => {
    const link = `${window.location.origin}/workspace/${roomId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartCall = () => {
    setIsVideoCallActive(true);
    setActiveTab('video');
    if (socket) socket.emit('join-call', { roomId });
  };

  const handleLeaveCall = () => {
    setIsVideoCallActive(false);
    setIsVideoMaximized(false);
    setActiveTab('editor');
    if (socket) socket.emit('leave-call', { roomId });
  };

  const toggleLivePreview = () => {
    setShowLivePreview((prev) => !prev);
  };

  const statusColors = {
    connected: 'bg-emerald-400',
    disconnected: 'bg-rose-400',
    connecting: 'bg-amber-400',
    error: 'bg-rose-400'
  };

  const isFullVideoMode = activeTab === 'video' || isVideoMaximized;
  const isAdmin = user?.role === 'admin';

  return (
    <div className="h-[calc(100vh-64px)] mt-16 flex flex-col bg-[#0a0c10] overflow-hidden select-none">
      
      {/* Workspace Top Header Bar */}
      <div className="bg-[#0d0f12]/95 backdrop-blur-2xl border-b border-white/[0.08] px-4 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0 z-20">
        
        {/* Left Info & Sidebar Toggle */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={() => setShowExplorer(!showExplorer)}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              showExplorer
                ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                : 'bg-white/[0.04] border-white/10 text-slate-400 hover:text-white'
            }`}
            title="Toggle File Explorer Sidebar (Ctrl + B)"
          >
            {showExplorer ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${statusColors[connectionStatus]} animate-pulse`} />
            <span className="text-xs font-bold text-white truncate max-w-[180px]">Room: {roomId}</span>
          </div>

          <button
            onClick={copyRoomLink}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white text-xs font-semibold rounded-full transition-all duration-200 group cursor-pointer"
            title="Copy Invite Link"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />}
            <span className="hidden sm:inline">{copied ? 'Link Copied!' : 'Copy Link'}</span>
          </button>
        </div>

        {/* Center: On-Demand Run Preview Button & Mode Switchers */}
        <div className="flex items-center gap-1.5 bg-white/[0.04] p-1 rounded-full border border-white/[0.08] overflow-x-auto scrollbar-hide">
          {/* Main On-Demand Run Preview Toggle Button */}
          <button
            onClick={toggleLivePreview}
            className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
              showLivePreview
                ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md shadow-rose-600/30'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/30 font-extrabold'
            }`}
            title={showLivePreview ? 'Close Live Web Preview' : 'Run & Preview Website in Real-Time'}
          >
            {showLivePreview ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Close Preview</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current animate-pulse" />
                <span>▶ Run Live Preview</span>
              </>
            )}
          </button>

          <div className="w-[1px] h-4 bg-white/10 mx-1" />

          {/* Full Editor Only */}
          <button
            onClick={() => {
              setActiveTab('editor');
              setIsVideoMaximized(false);
            }}
            className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
              activeTab === 'editor' && !isFullVideoMode
                ? 'bg-white text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Code2 className={`w-3.5 h-3.5 ${activeTab === 'editor' && !isFullVideoMode ? 'text-slate-950' : 'text-slate-400'}`} />
            <span>Editor</span>
          </button>

          {/* Split Video Call */}
          <button
            onClick={() => {
              setActiveTab('split');
              setIsVideoCallActive(true);
              setIsVideoMaximized(false);
            }}
            className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
              activeTab === 'split' && !isVideoMaximized
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Video className={`w-3.5 h-3.5 ${activeTab === 'split' && !isVideoMaximized ? 'text-white' : 'text-indigo-400'}`} />
            <span>Code + Video</span>
          </button>

          {/* Full HD Video Call */}
          <button
            onClick={() => {
              setActiveTab('video');
              setIsVideoCallActive(true);
              setIsVideoMaximized(true);
            }}
            className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
              isFullVideoMode
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Video className={`w-3.5 h-3.5 ${isFullVideoMode ? 'text-white' : 'text-purple-400'}`} />
            <span>HD Video Call (Full)</span>
          </button>
        </div>

        {/* Right Active Users & Actions */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 bg-indigo-500/10 px-3 py-1.5 rounded-full border border-indigo-500/20">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-xs text-indigo-300 font-semibold">{activeUsers.length || 1} Connected</span>
          </div>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 border border-white/10 transition-all duration-200 cursor-pointer"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Workspace Layout with Left File Explorer Sidebar */}
      <div className="flex-1 p-3 flex gap-3 overflow-hidden min-h-0 relative">
        
        {/* Left Collapsible File Explorer Sidebar (240px) */}
        {showExplorer && (
          <div className="w-60 shrink-0 hidden md:flex flex-col h-full animate-fade-in overflow-hidden">
            <FileExplorer
              fileTree={fileTree}
              activeFilePath={activeFilePath}
              onSelectFile={handleSelectFile}
              onCreateFile={handleCreateFile}
              onCreateFolder={handleCreateFolder}
              onRenameItem={handleRenameItem}
              onDeleteItem={handleDeleteItem}
              onRefreshTree={fetchLocalWorkspaceTree}
              onSyncLocalWorkspace={fetchLocalWorkspaceTree}
              onOpenLocalFolder={handleOpenCustomLocalFolder}
              onCloseFolder={handleCloseFolder}
              isLocalDiskSync={isLocalDiskSync}
              isLoading={isTreeLoading}
            />
          </div>
        )}

        {/* Dynamic Center Work Area */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 h-full overflow-hidden min-h-0">
          
          {/* Full Screen HD Video Mode (Spans entire 12 columns) */}
          {isFullVideoMode ? (
            <div className="lg:col-span-12 h-full min-h-0 animate-fade-in overflow-hidden">
              <VideoCallContainer
                socket={socket}
                roomId={roomId}
                currentUser={user}
                onLeaveCall={handleLeaveCall}
                isMaximized={true}
                onToggleMaximize={() => {
                  setIsVideoMaximized(false);
                  setActiveTab('split');
                }}
              />
            </div>
          ) : (
            /* Split / Standard Editor Mode */
            <>
              <div className={`${showLivePreview || activeTab === 'split' ? 'lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-3' : 'lg:col-span-8 flex flex-col'} h-full min-h-0 overflow-hidden`}>
                
                {/* Left Box: Monaco Editor or Empty State */}
                <div className="h-full flex flex-col min-h-0 overflow-hidden">
                  {currentFile ? (
                    <SharedEditor
                      code={currentFile.content || ''}
                      language={currentFile.language || 'javascript'}
                      onCodeChange={handleCodeChange}
                      onLanguageChange={handleLanguageChange}
                      openFiles={openFiles}
                      activeFilePath={activeFilePath}
                      onSelectTab={handleSelectTab}
                      onCloseTab={handleCloseTab}
                      onSaveActiveFile={handleSaveActiveFile}
                      onTogglePreview={toggleLivePreview}
                      showLivePreview={showLivePreview}
                      isDirty={isDirty}
                      isSaving={isSaving}
                      isLocalDiskSync={isLocalDiskSync}
                    />
                  ) : (
                    /* ── Empty State: No file open ── */
                    <div className="h-full flex flex-col items-center justify-center bg-[#0d1117] rounded-2xl border border-white/[0.07] select-none">
                      <div className="flex flex-col items-center gap-5 text-center px-8 max-w-sm">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                          <FolderTree className="w-7 h-7 text-indigo-400" />
                        </div>
                        <div>
                          <h3 className="text-white font-bold text-lg mb-2">No File Open</h3>
                          <p className="text-slate-400 text-sm leading-relaxed">
                            Open your project folder from the sidebar to start coding. All your files will appear here.
                          </p>
                        </div>
                        <button
                          onClick={handleOpenCustomLocalFolder}
                          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-all duration-200 shadow-lg shadow-indigo-600/30 cursor-pointer"
                        >
                          <FolderTree className="w-4 h-4" />
                          Open Folder
                        </button>
                        <p className="text-slate-600 text-xs">or click a file in the sidebar to open it</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Box: Live Web Preview */}
                {showLivePreview && currentFile && (
                  <div className="h-full flex flex-col min-h-0 overflow-hidden">
                    <LivePreviewPanel
                      activeFileContent={currentFile.content || ''}
                      activeFilePath={activeFilePath}
                      filesMap={filesMap}
                      onClose={() => setShowLivePreview(false)}
                    />
                  </div>
                )}

                {/* Right Box in Split Video Mode */}
                {!showLivePreview && activeTab === 'split' && (
                  <div className="h-full flex flex-col min-h-0 overflow-hidden">
                    <VideoCallContainer
                      socket={socket}
                      roomId={roomId}
                      currentUser={user}
                      onLeaveCall={handleLeaveCall}
                      isMaximized={false}
                      onToggleMaximize={() => setIsVideoMaximized(true)}
                    />
                  </div>
                )}

              </div>

              {/* Right Panels: Chat (with 1-on-1 DM & Group) & Activity Log (Admin Only) */}
              <div className="lg:col-span-4 flex flex-col gap-3 h-full min-h-0 overflow-hidden">
                
                {/* Chat Panel: Takes full 100% height for regular users, top half for admin */}
                <div className={`${isAdmin ? 'h-1/2' : 'h-full'} min-h-0 flex flex-col`}>
                  <ChatPanel
                    messages={messages}
                    privateMessages={privateMessages}
                    onSendMessage={handleSendMessage}
                    onSendPrivateMessage={handleSendPrivateMessage}
                    currentUser={user}
                    activeUsers={activeUsers}
                  />
                </div>

                {/* Admin Only: Live Activity Log */}
                {isAdmin && (
                  <div className="h-1/2 min-h-0 flex flex-col animate-fade-in">
                    <ActivityLogPanel logs={logs} />
                  </div>
                )}

              </div>
            </>
          )}

        </div>

      </div>

    </div>
  );
};

export default WorkspacePage;