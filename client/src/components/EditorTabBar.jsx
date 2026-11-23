import React from 'react';
import { X, FileCode, FileText, File, Save, HardDrive, Play, Square, RefreshCw } from 'lucide-react';
import { PRESENCE_COLORS, colorIndexFor } from '../lib/presence';
import '../styles/editor.css';

// Monochrome UI: every glyph uses the muted ink token, so the tree stays calm.
const ICON_BY_EXT = {
  js: ['FileCode', 'var(--ink-faint)'],
  mjs: ['FileCode', 'var(--ink-faint)'],
  cjs: ['FileCode', 'var(--ink-faint)'],
  jsx: ['FileCode', 'var(--ink-faint)'],
  ts: ['FileCode', 'var(--ink-faint)'],
  tsx: ['FileCode', 'var(--ink-faint)'],
  py: ['FileCode', 'var(--ink-faint)'],
  html: ['FileCode', 'var(--ink-faint)'],
  htm: ['FileCode', 'var(--ink-faint)'],
  css: ['FileCode', 'var(--ink-faint)'],
  scss: ['FileCode', 'var(--ink-faint)'],
  json: ['FileCode', 'var(--ink-faint)'],
  md: ['FileText', 'var(--ink-faint)'],
  markdown: ['FileText', 'var(--ink-faint)'],
  c: ['FileCode', 'var(--ink-faint)'],
  h: ['FileCode', 'var(--ink-faint)'],
  cpp: ['FileCode', 'var(--ink-faint)'],
  rs: ['FileCode', 'var(--ink-faint)'],
  go: ['FileCode', 'var(--ink-faint)'],
  sh: ['FileCode', 'var(--ink-faint)'],
  sql: ['FileCode', 'var(--ink-faint)'],
  yml: ['FileCode', 'var(--ink-faint)'],
  yaml: ['FileCode', 'var(--ink-faint)']
};

const ICONS = { FileCode, FileText, File };

export const FileGlyph = ({ name = '' }) => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const [icon, tint] = ICON_BY_EXT[ext] || ['File', 'var(--ink-faint)'];
  const Icon = ICONS[icon] || File;
  return <Icon size={13} style={{ color: tint, flexShrink: 0 }} />;
};

// Kept for FileExplorer, which imports this helper.
export const getFileIcon = (name = '') => <FileGlyph name={name} />;

const EditorTabBar = ({
  openFiles = [],
  activeFilePath,
  onSelectTab,
  onCloseTab,
  onSaveActiveFile,
  onTogglePreview,
  showLivePreview = false,
  isDirty = false,
  isSaving = false,
  isLocalDiskSync = false,
  peers = []
}) => {
  if (!openFiles.length) return null;

  return (
    <div className="et-bar">
      <div className="et-tabs" role="tablist" aria-label="Open files">
        {openFiles.map((file) => {
          const name = file.name || file.path.split('/').pop();
          const isActive = file.path === activeFilePath;
          const onFile = peers.filter((peer) => peer.filePath === file.path);
          const firstPeer = onFile[0];

          return (
            <button
              key={file.path}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelectTab?.(file)}
              title={onFile.length ? `${name} — ${onFile.map((p) => p.username).join(', ')} here` : file.path}
              className={`et-tab ${isActive ? 'is-active' : ''}${onFile.length && !isActive ? ' is-remote' : ''}`}
              style={firstPeer ? { '--et-peer': PRESENCE_COLORS[colorIndexFor(firstPeer.socketId)].hex } : undefined}
            >
              <FileGlyph name={name} />
              <span className="et-tab-name">{name}</span>

              {onFile.length > 0 && (
                <span className="et-tab-peers">
                  {onFile.slice(0, 3).map((peer) => (
                    <i
                      key={peer.socketId}
                      className="et-peer-tick"
                      style={{ background: PRESENCE_COLORS[colorIndexFor(peer.socketId)].hex }}
                    />
                  ))}
                </span>
              )}

              {isActive && isDirty && <span className="et-peer-tick" style={{ background: 'var(--warn)' }} />}

              {openFiles.length > 1 && (
                <span
                  role="button"
                  tabIndex={-1}
                  aria-label={`Close ${name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onCloseTab?.(file.path);
                  }}
                  className="et-close"
                >
                  <X size={11} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="et-actions">
        {isLocalDiskSync && (
          <span className="et-disk" title="Editing files straight from your own folder">
            <HardDrive size={11} /> ON DISK
          </span>
        )}

        {onTogglePreview && (
          <button
            type="button"
            onClick={onTogglePreview}
            className={`et-btn ${showLivePreview ? 'is-stop' : 'is-run'}`}
            title={showLivePreview ? 'Hide the live preview' : 'Render the project side by side'}
          >
            {showLivePreview ? <Square size={12} /> : <Play size={12} />}
            {showLivePreview ? 'Stop' : 'Run'}
          </button>
        )}

        <button
          type="button"
          onClick={onSaveActiveFile}
          disabled={isSaving}
          className={`et-btn ${isDirty ? 'is-dirty' : ''}`}
          title="Save (Ctrl+S)"
        >
          {isSaving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
          {isSaving ? 'Saving' : isDirty ? 'Save' : 'Saved'}
        </button>
      </div>
    </div>
  );
};

export default EditorTabBar;
