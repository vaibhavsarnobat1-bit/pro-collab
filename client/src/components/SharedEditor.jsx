import React, { useRef, useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Layers, CheckCircle2, HardDrive, FileCode2, Sparkles, Terminal } from 'lucide-react';
import EditorTabBar from './EditorTabBar';

const SharedEditor = ({
  code,
  language,
  onCodeChange,
  onLanguageChange,
  openFiles = [],
  activeFilePath = 'index.js',
  onSelectTab,
  onCloseTab,
  onSaveActiveFile,
  onTogglePreview,
  showLivePreview = false,
  isDirty = false,
  isSaving = false,
  isLocalDiskSync = false,
  theme = 'vs-dark'
}) => {
  const editorRef = useRef(null);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [charCount, setCharCount] = useState(code ? code.length : 0);

  useEffect(() => {
    setCharCount(code ? code.length : 0);
  }, [code]);

  // Handle Ctrl+S / Cmd+S save keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (onSaveActiveFile) {
          onSaveActiveFile();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSaveActiveFile]);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Track cursor position
    editor.onDidChangeCursorPosition((e) => {
      setCursorPos({
        line: e.position.lineNumber,
        col: e.position.column
      });
    });

    // Add Save action to Monaco Command Palette (Ctrl+S)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (onSaveActiveFile) {
        onSaveActiveFile();
      }
    });
  };

  const handleContentChange = (value, event) => {
    if (value !== undefined) {
      let editedLine = null;
      if (event && event.changes && event.changes.length > 0) {
        editedLine = event.changes[0].range.startLineNumber;
      }
      onCodeChange(value, editedLine);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1117] rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl">
      
      {/* Top File Tabs Bar */}
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
      />

      {/* Monaco Editor Container */}
      <div className="flex-1 w-full relative min-h-[350px]">
        <Editor
          height="100%"
          language={language}
          value={code}
          theme={theme}
          onMount={handleEditorDidMount}
          onChange={handleContentChange}
          options={{
            fontSize: 14,
            fontFamily: "'Fira Code', 'JetBrains Mono', 'Cascadia Code', monospace",
            fontLigatures: true,
            minimap: { enabled: true, maxColumn: 80 },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            lineNumbers: 'on',
            renderLineHighlight: 'all',
            padding: { top: 10, bottom: 10 },
            bracketPairColorization: { enabled: true },
            wordWrap: 'on'
          }}
        />
      </div>

      {/* Editor Status Bar */}
      <div className="bg-[#0b0e14] border-t border-white/[0.08] px-3.5 py-1.5 flex items-center justify-between text-[11px] text-slate-400 font-mono select-none">
        <div className="flex items-center gap-3">
          <span className="text-slate-300 font-semibold truncate max-w-[220px]">
            {activeFilePath}
          </span>
          <span className="text-slate-600">•</span>
          <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="hidden sm:inline">{charCount} chars</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Language Selector */}
          <div className="flex items-center gap-1">
            <Layers className="w-3 h-3 text-slate-500" />
            <select
              value={language}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="bg-transparent text-[11px] font-semibold text-slate-300 outline-none cursor-pointer hover:text-white"
            >
              <option value="javascript" className="bg-[#161b22]">JavaScript</option>
              <option value="typescript" className="bg-[#161b22]">TypeScript</option>
              <option value="python" className="bg-[#161b22]">Python</option>
              <option value="html" className="bg-[#161b22]">HTML</option>
              <option value="css" className="bg-[#161b22]">CSS</option>
              <option value="json" className="bg-[#161b22]">JSON</option>
              <option value="markdown" className="bg-[#161b22]">Markdown</option>
              <option value="cpp" className="bg-[#161b22]">C++</option>
              <option value="rust" className="bg-[#161b22]">Rust</option>
              <option value="go" className="bg-[#161b22]">Go</option>
              <option value="java" className="bg-[#161b22]">Java</option>
              <option value="plaintext" className="bg-[#161b22]">Plain Text</option>
            </select>
          </div>

          <span className="text-slate-600 hidden md:inline">•</span>
          <span className="hidden md:inline">UTF-8</span>

          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1 text-emerald-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live Sync
          </span>
        </div>
      </div>

    </div>
  );
};

export default SharedEditor;
