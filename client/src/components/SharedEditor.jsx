import React, { useRef, useState, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { Layers } from 'lucide-react';
import EditorTabBar from './EditorTabBar';
import { PRESENCE_COLORS, colorIndexFor } from '../lib/presence';
import '../styles/editor.css';

const LANGUAGES = [
  ['javascript', 'JavaScript'],
  ['typescript', 'TypeScript'],
  ['python', 'Python'],
  ['html', 'HTML'],
  ['css', 'CSS'],
  ['json', 'JSON'],
  ['markdown', 'Markdown'],
  ['cpp', 'C++'],
  ['rust', 'Rust'],
  ['go', 'Go'],
  ['java', 'Java'],
  ['sql', 'SQL'],
  ['yaml', 'YAML'],
  ['shell', 'Shell'],
  ['plaintext', 'Plain text']
];

const CURSOR_EMIT_MS = 90;
const SNAPSHOT_EMIT_MS = 700;
const PEER_TIMEOUT_MS = 25000;

const SharedEditor = ({
  code,
  language,
  onCodeChange,
  onLanguageChange,
  openFiles = [],
  activeFilePath = null,
  onSelectTab,
  onCloseTab,
  onSaveActiveFile,
  onTogglePreview,
  showLivePreview = false,
  isDirty = false,
  isSaving = false,
  isLocalDiskSync = false,
  theme = 'vs-dark',
  socket,
  roomId,
  username,
  onPresenceChange
}) => {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const caretRef = useRef(null);
  const applyingRemote = useRef(false);
  const lastCursorEmit = useRef(0);
  const lastSnapshot = useRef(0);
  const peersRef = useRef(new Map());
  const labelsRef = useRef(new Map());
  const notifyTimer = useRef(null);

  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [charCount, setCharCount] = useState(code ? code.length : 0);
  const [livePeers, setLivePeers] = useState([]);

  // Latest props for handlers that must not re-bind on every render.
  const latest = useRef({ activeFilePath, roomId, onCodeChange, onPresenceChange });
  latest.current = { activeFilePath, roomId, onCodeChange, onPresenceChange };

  /* ------------------------------------------------------------- presence */

  const publishPresence = useCallback(() => {
    const now = Date.now();
    const rows = [];
    peersRef.current.forEach((peer, socketId) => {
      if (now - peer.seenAt > PEER_TIMEOUT_MS) {
        peersRef.current.delete(socketId);
        return;
      }
      rows.push({ socketId, username: peer.username, filePath: peer.filePath });
    });
    setLivePeers(rows);
    latest.current.onPresenceChange?.(rows);
  }, []);

  const schedulePresence = useCallback(() => {
    if (notifyTimer.current) return;
    notifyTimer.current = setTimeout(() => {
      notifyTimer.current = null;
      publishPresence();
    }, 250);
  }, [publishPresence]);

  useEffect(() => () => clearTimeout(notifyTimer.current), []);

  /* ------------------------------------------------------- remote caret */

  const syncCaretLabel = (editor, monaco, socketId, name, cursor, colorIndex) => {
    const position = { lineNumber: cursor.lineNumber, column: cursor.column };
    const className = `pc-caret-tag pc-caret-tag-${colorIndex}`;
    let entry = labelsRef.current.get(socketId);

    if (!entry) {
      const dom = document.createElement('div');
      dom.className = className;
      dom.textContent = name;
      const holder = { dom, position, widget: null };
      holder.widget = {
        getId: () => 'pc-caret-label-' + socketId,
        getDomNode: () => dom,
        getPosition: () => ({
          position: holder.position,
          preference: [monaco.editor.ContentWidgetPositionPreference?.EXACT ?? 1]
        })
      };
      labelsRef.current.set(socketId, holder);
      editor.addContentWidget(holder.widget);
      entry = holder;
    }

    entry.position = position;
    if (entry.dom.textContent !== name) entry.dom.textContent = name;
    if (entry.dom.className !== className) entry.dom.className = className;
    editor.layoutContentWidget(entry.widget, {
      position,
      width: entry.dom.offsetWidth || 40,
      height: entry.dom.offsetHeight || 16
    });
  };

  const dropCaretLabels = useCallback((editor) => {
    const ed = editor || editorRef.current;
    labelsRef.current.forEach((entry) => ed?.removeContentWidget(entry.widget));
    labelsRef.current.clear();
  }, []);

  const paintRemoteCarets = useCallback(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const file = latest.current.activeFilePath;
    const now = Date.now();
    const decorations = [];
    const aliveLabels = new Set();

    // The AMD build exposes TrackedRangeStickiness, the ESM build
    // DecorationStickyConstants; the raw string is valid for both.
    const neverShrink =
      monaco.editor.TrackedRangeStickiness?.NEVER_SHRINK ??
      monaco.editor.DecorationStickyConstants?.NeverShrink ??
      'neverShrink';

    peersRef.current.forEach((peer, socketId) => {
      if (now - peer.seenAt > PEER_TIMEOUT_MS) {
        peersRef.current.delete(socketId);
        schedulePresence();
        return;
      }
      if (peer.filePath !== file || !peer.cursor) return;

      const model = editor.getModel();
      if (!model) return;

      // A peer can be on a line that a local edit has since removed, so the
      // position is clamped to the live model before it becomes a decoration.
      const lineNumber = Math.min(Math.max(peer.cursor.lineNumber || 1, 1), model.getLineCount());
      const column = Math.min(Math.max(peer.cursor.column || 1, 1), model.getLineMaxColumn(lineNumber));
      const colorIndex = peer.colorIndex ?? colorIndexFor(socketId);
      peer.colorIndex = colorIndex;
      const caretRange = new monaco.Range(lineNumber, column, lineNumber, column);

      decorations.push({
        range: caretRange,
        options: {
          className: `pc-caret pc-caret-${colorIndex}`,
          stickiness: neverShrink,
          overviewRuler: { color: PRESENCE_COLORS[colorIndex].hex, position: 4 }
        }
      });

      // Monaco only injects after-content into non-zero-width inline
      // decorations, so the name plate is a content widget instead.
      aliveLabels.add(socketId);
      syncCaretLabel(editor, monaco, socketId, peer.username, { lineNumber, column }, colorIndex);

      if (peer.selection) {
        const s = peer.selection;
        const selRange = model.validateRange(
          new monaco.Range(s.startLineNumber, s.startColumn, s.endLineNumber, s.endColumn)
        );
        if (!selRange.isEmpty()) {
          decorations.push({
            range: selRange,
            options: { className: `pc-selection pc-selection-${colorIndex}`, stickiness: neverShrink }
          });
        }
      }
    });

    labelsRef.current.forEach((entry, socketId) => {
      if (aliveLabels.has(socketId)) return;
      editor.removeContentWidget(entry.widget);
      labelsRef.current.delete(socketId);
    });

    caretRef.current?.set(decorations);
  }, [schedulePresence]);

  /* ------------------------------------------------------ socket wiring */

  useEffect(() => {
    if (!socket || !roomId) return;

    const onDelta = ({ filePath, changes, senderSocketId, author }) => {
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      if (!editor || !monaco || !Array.isArray(changes)) return;
      if (filePath !== latest.current.activeFilePath) return;

      const model = editor.getModel();
      if (!model) return;

      // Clamp every range to the current document before replaying. A peer that
      // missed a delta can otherwise send a range past the last line, which
      // Monaco would reject and silently drop the whole batch.
      const lineCount = model.getLineCount();
      const edits = [];
      let outOfBounds = false;

      for (const change of changes) {
        const r = change.range;
        if (!r) continue;
        const startLine = Math.min(Math.max(r.startLineNumber, 1), lineCount);
        const endLine = Math.min(Math.max(r.endLineNumber, 1), lineCount);
        const startCol = Math.min(Math.max(r.startColumn, 1), model.getLineMaxColumn(startLine));
        const endCol = Math.min(Math.max(r.endColumn, 1), model.getLineMaxColumn(endLine));

        if (r.startLineNumber > lineCount || r.endLineNumber > lineCount) outOfBounds = true;
        edits.push({ range: new monaco.Range(startLine, startCol, endLine, endCol), text: change.text, forceMoveMarkers: true });
      }

      if (outOfBounds) {
        // Ranges no longer describe this document — ask for the stored copy.
        socket.emit('sync-request', { roomId, filePath }, (res) => {
          if (res?.ok && typeof res.content === 'string') {
            applyingRemote.current = true;
            editor.setValue(res.content);
            applyingRemote.current = false;
          }
        });
        return;
      }

      if (!edits.length) return;

      applyingRemote.current = true;
      try {
        editor.executeEdits('remote-peer', edits);
      } finally {
        applyingRemote.current = false;
      }
      // The buffer changed underneath, so the snapshot we hold is stale.
      setCharCount(model.getValue().length);
      if (author) {
        const peer = peersRef.current.get(senderSocketId) || { username: author, colorIndex: colorIndexFor(senderSocketId) };
        peer.username = author;
        peer.filePath = filePath;
        peer.seenAt = Date.now();
        peersRef.current.set(senderSocketId, peer);
        schedulePresence();
      }
      paintRemoteCarets();
    };

    const onSnapshot = ({ filePath, content, senderSocketId, author }) => {
      if (filePath !== latest.current.activeFilePath) return;
      const editor = editorRef.current;
      if (!editor) return;
      if (editor.getModel()?.getValue() === content) return;

      applyingRemote.current = true;
      try {
        editor.setValue(content);
      } finally {
        applyingRemote.current = false;
      }
      setCharCount(content.length);
      paintRemoteCarets();
    };

    const onCursor = ({ socketId, username: name, filePath, cursor, selection }) => {
      const existing = peersRef.current.get(socketId);
      const peer = existing || { username: name, filePath, colorIndex: colorIndexFor(socketId) };
      peer.colorIndex = peer.colorIndex ?? colorIndexFor(socketId);
      peer.username = name;
      peer.filePath = filePath;
      peer.cursor = cursor;
      peer.selection = selection;
      peer.seenAt = Date.now();
      peersRef.current.set(socketId, peer);
      paintRemoteCarets();
      schedulePresence();
    };

    const onVanished = ({ socketId }) => {
      if (peersRef.current.delete(socketId)) {
        paintRemoteCarets();
        schedulePresence();
      }
    };

    socket.on('code-delta-applied', onDelta);
    socket.on('code-updated', onSnapshot);
    socket.on('cursor-updated', onCursor);
    socket.on('cursor-vanished', onVanished);

    return () => {
      socket.off('code-delta-applied', onDelta);
      socket.off('code-updated', onSnapshot);
      socket.off('cursor-updated', onCursor);
      socket.off('cursor-vanished', onVanished);
    };
  }, [socket, roomId, paintRemoteCarets, schedulePresence, publishPresence]);

  // Clear stale decorations when switching files.
  useEffect(() => {
    caretRef.current?.set([]);
    dropCaretLabels();
  }, [activeFilePath, dropCaretLabels]);

  // Keep the buffer in step with content loaded from outside (opening a file,
  // room bootstrap, saving to disk).
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || applyingRemote.current) return;
    const model = editor.getModel();
    if (!model) return;
    if (typeof code === 'string' && model.getValue() !== code && !editor.hasTextFocus()) {
      applyingRemote.current = true;
      editor.setValue(code);
      applyingRemote.current = false;
    }
    setCharCount(code ? code.length : 0);
  }, [code, activeFilePath]);

  useEffect(() => {
    monacoRef.current?.editor?.setTheme(theme);
  }, [theme]);

  /* --------------------------------------------------------- local edits */

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    caretRef.current = editor.createDecorationsCollection([]);

    monaco.editor.defineTheme('pc-dark', {
      base: 'vs-dark', inherit: true, rules: [],
      colors: { 'editor.background': '#0f0f0f', 'editorGutter.background': '#0f0f0f' }
    });
    monaco.editor.setTheme(theme);

    editor.onDidChangeModelContent((event) => {
      if (applyingRemote.current) return;

      const changes = event.changes.map((change) => ({
        range: {
          startLineNumber: change.range.startLineNumber,
          startColumn: change.range.startColumn,
          endLineNumber: change.range.endLineNumber,
          endColumn: change.range.endColumn
        },
        text: change.text
      }));

      const value = editor.getValue();
      setCharCount(value.length);

      const filePath = latest.current.activeFilePath;
      if (!filePath) return;

      latest.current.onCodeChange?.(value, changes, filePath);

      const now = Date.now();
      if (now - lastSnapshot.current > SNAPSHOT_EMIT_MS) {
        lastSnapshot.current = now;
        socket?.emit('code-change', { roomId, filePath, content: value, language });
      }
    });

    const pushCursor = () => {
      const filePath = latest.current.activeFilePath;
      if (!filePath || !socket) return;
      const selection = editor.getSelection();
      if (!selection) return;

      const now = Date.now();
      if (now - lastCursorEmit.current < CURSOR_EMIT_MS) return;
      lastCursorEmit.current = now;

      setCursorPos({ line: selection.positionLineNumber, col: selection.positionColumn });
      socket.emit('cursor-change', {
        roomId,
        filePath,
        cursor: { lineNumber: selection.positionLineNumber, column: selection.positionColumn },
        selection: {
          startLineNumber: selection.startLineNumber,
          startColumn: selection.startColumn,
          endLineNumber: selection.endLineNumber,
          endColumn: selection.endColumn
        }
      });
    };

    editor.onDidChangeCursorPosition(pushCursor);
    editor.onDidChangeCursorSelection(pushCursor);

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => onSaveActiveFile?.());
  };

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        onSaveActiveFile?.();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onSaveActiveFile]);

  useEffect(() => {
    socket?.emit('cursor-leave', { roomId });
  }, [activeFilePath, socket, roomId]);

  const peersHere = livePeers.filter((peer) => peer.filePath === activeFilePath);

  return (
    <div className="pc-editor-frame">
      <EditorTabBar
        openFiles={openFiles}
        activeFilePath={activeFilePath}
        onSelectTab={onSelectTab}
        onCloseTab={onCloseTab}
        onSaveActiveFile={onSaveActiveFile}
        onTogglePreview={onTogglePreview}
        showLivePreview={showLivePreview}
        isDirty={isDirty}
        isSaving={isSaving}
        isLocalDiskSync={isLocalDiskSync}
        peers={livePeers}
      />

      <div className="pc-editor-body">
        {activeFilePath ? (
          <Editor
            height="100%"
            path={activeFilePath}
            language={language}
            defaultValue={code}
            theme={theme}
            onMount={handleEditorDidMount}
            loading={<span className="pc-editor-loading">Loading editor…</span>}
            options={{
              fontSize: 13.5,
              fontFamily: "'Fira Code', 'JetBrains Mono', 'Cascadia Code', monospace",
              fontLigatures: true,
              minimap: { enabled: true, maxColumn: 76, renderCharacters: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              smoothScrolling: true,
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              lineNumbers: 'on',
              renderLineHighlight: 'all',
              padding: { top: 14, bottom: 14 },
              bracketPairColorization: { enabled: true },
              guides: { bracketPairs: true },
              wordWrap: 'off',
              renderWhitespace: 'selection',
              roundedSelection: true,
              scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 }
            }}
          />
        ) : (
          <div className="pc-editor-empty">
            <p className="pc-editor-empty-title">No file open</p>
            <p className="pc-editor-empty-sub">Pick something from the tree, or create a new file to start typing together.</p>
          </div>
        )}
      </div>

      <div className="pc-editor-status">
        <div className="pc-status-left">
          <span className="pc-status-file">{activeFilePath || '—'}</span>
          <span className="pc-status-dot">/</span>
          <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
          <span className="pc-status-dot">/</span>
          <span>{charCount.toLocaleString()} chars</span>
        </div>

        <div className="pc-status-right">
          {peersHere.length > 0 && (
            <div className="pc-status-peers" title={peersHere.map((p) => p.username).join(', ')}>
              {peersHere.slice(0, 4).map((peer) => (
                <span
                  key={peer.socketId}
                  className="pc-peer-dot"
                  style={{ background: PRESENCE_COLORS[peer.colorIndex ?? colorIndexFor(peer.socketId)].hex }}
                >
                  {peer.username.slice(0, 1).toUpperCase()}
                </span>
              ))}
              <span>{peersHere.length} {peersHere.length === 1 ? 'other here' : 'others here'}</span>
            </div>
          )}

          <span className="pc-status-dot">/</span>
          <label className="pc-lang-picker">
            <Layers size={12} />
            <select value={language} onChange={(e) => onLanguageChange(e.target.value)} aria-label="Syntax language">
              {LANGUAGES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <span className="pc-status-dot">/</span>
          <span className={`pc-sync-state ${socket?.connected ? 'is-live' : 'is-off'}`}>
            <i />
            {socket?.connected ? 'synced' : 'offline'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SharedEditor;
