import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Folder, FolderOpen, FilePlus, FolderPlus, RefreshCw, ChevronRight, ChevronDown,
  Trash2, Edit2, Search, Check, X, HardDrive, Users, FolderTree,
  Upload, FolderInput, Download
} from 'lucide-react';
import { FileGlyph } from './EditorTabBar';
import { PRESENCE_COLORS, colorIndexFor } from '../lib/presence';
import '../styles/explorer.css';

// Two-step delete instead of window.confirm(): a native dialog blocks the socket
// thread and cannot be styled, and it is easy to fire past by accident.
const TreeNode = ({
  item,
  depth,
  activeFilePath,
  peers,
  expandSignal,
  onSelectFile,
  onCreateIn,
  onRenameItem,
  onDeleteItem,
  onRequestDelete,
  pendingDeletePath
}) => {
  const isDirectory = item.isDirectory === true || Array.isArray(item.children);
  const [open, setOpen] = useState(depth < 2 || isDirectory === false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(item.name);
  const [creating, setCreating] = useState(null); // 'file' | 'folder' | null
  const [createName, setCreateName] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    setRenameValue(item.name);
  }, [item.name]);

  // Focus the inline field whenever one appears.
  useEffect(() => {
    if (renaming || creating) {
      inputRef.current?.focus();
      inputRef.current?.select?.();
    }
  }, [renaming, creating]);

  // Expand / collapse everything, driven by a counter so repeated clicks still fire.
  useEffect(() => {
    if (!isDirectory || expandSignal.value === 0) return;
    setOpen(expandSignal.open);
  }, [expandSignal, isDirectory]);

  const here = peers.filter((peer) => peer.filePath === item.path);
  const isActive = !isDirectory && item.path === activeFilePath;

  const commitRename = () => {
    const next = renameValue.trim();
    setRenaming(false);
    if (!next || next === item.name) return;
    const parent = item.path.includes('/') ? item.path.slice(0, item.path.lastIndexOf('/')) : '';
    onRenameItem(item.path, parent ? `${parent}/${next}` : next);
  };

  const commitCreate = () => {
    const name = createName.trim();
    const kind = creating;
    setCreateName('');
    setCreating(null);
    if (!name || !kind) return;
    setOpen(true);
    onCreateIn(`${item.path}/${name}`, kind);
  };

  const childPrefix = `${Math.min(depth, 8) * 11 + 8}px`;

  return (
    <div className="fe-node">
      <div
        className={`fe-row ${isActive ? 'is-active' : ''} ${pendingDeletePath === item.path ? 'is-armed' : ''}`}
        style={{ paddingLeft: childPrefix }}
        onClick={() => (isDirectory ? setOpen((value) => !value) : onSelectFile(item))}
        role="treeitem"
        aria-expanded={isDirectory ? open : undefined}
        aria-selected={isActive}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (isDirectory) setOpen((value) => !value); else onSelectFile(item);
          }
        }}
      >
        <span className="fe-twisty">
          {isDirectory ? (open ? <ChevronDown size={12} /> : <ChevronRight size={12} />) : null}
        </span>

        {isDirectory ? (
          open
            ? <FolderOpen size={13} style={{ color: 'var(--brand-text)' }} />
            : <Folder size={13} style={{ color: 'var(--ink-faint)' }} />
        ) : (
          <FileGlyph name={item.name} />
        )}

        {renaming ? (
          <input
            ref={inputRef}
            className="fe-inline-input"
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            onClick={(event) => event.stopPropagation()}
            onBlur={commitRename}
            onKeyDown={(event) => {
              if (event.key === 'Enter') { event.preventDefault(); commitRename(); }
              if (event.key === 'Escape') { setRenameValue(item.name); setRenaming(false); }
            }}
            aria-label={`Rename ${item.name}`}
          />
        ) : (
          <span className="fe-name" title={item.path}>{item.name}</span>
        )}

        {here.length > 0 && !renaming && (
          <span className="fe-presence" title={`${here.map((peer) => peer.username).join(', ')} is in this file`}>
            {here.slice(0, 3).map((peer) => (
              <i key={peer.socketId} style={{ background: PRESENCE_COLORS[colorIndexFor(peer.socketId)].hex }} />
            ))}
          </span>
        )}

        {!renaming && (
          <span className="fe-tools">
            {isDirectory && (
              <>
                <button
                  type="button"
                  className="fe-tool"
                  title="New file here"
                  aria-label={`New file in ${item.name}`}
                  onClick={(event) => { event.stopPropagation(); setOpen(true); setCreating('file'); }}
                >
                  <FilePlus size={12} />
                </button>
                <button
                  type="button"
                  className="fe-tool"
                  title="New subfolder here"
                  aria-label={`New folder in ${item.name}`}
                  onClick={(event) => { event.stopPropagation(); setOpen(true); setCreating('folder'); }}
                >
                  <FolderPlus size={12} />
                </button>
              </>
            )}
            <button
              type="button"
              className="fe-tool"
              title={isDirectory ? 'Rename folder' : 'Rename file'}
              aria-label={`Rename ${item.name}`}
              onClick={(event) => { event.stopPropagation(); setRenaming(true); }}
            >
              <Edit2 size={12} />
            </button>
            <button
              type="button"
              className="fe-tool is-danger"
              title={isDirectory ? 'Delete folder and its files' : 'Delete file'}
              aria-label={`Delete ${item.name}`}
              onClick={(event) => { event.stopPropagation(); onRequestDelete(item.path, item.name, isDirectory); }}
            >
              <Trash2 size={12} />
            </button>
          </span>
        )}
      </div>

      {pendingDeletePath === item.path && (
        <div className="fe-arm" style={{ paddingLeft: childPrefix }}>
          <span>Delete <b>{item.name}</b>{item.isDirectory ? ' and everything inside it' : ''}?</span>
          <button type="button" className="fe-arm-yes" onClick={() => onDeleteItem(item.path)}>Delete</button>
          <button type="button" className="fe-arm-no" onClick={() => onRequestDelete(null)}>Keep</button>
        </div>
      )}

      {creating && (
        <div className="fe-create" style={{ paddingLeft: `${Math.min(depth + 1, 8) * 11 + 8}px` }}>
          {creating === 'file' ? <FilePlus size={12} /> : <FolderPlus size={12} />}
          <input
            ref={inputRef}
            className="fe-inline-input"
            value={createName}
            placeholder={creating === 'file' ? 'name.js' : 'folder'}
            onChange={(event) => setCreateName(event.target.value)}
            onBlur={commitCreate}
            onKeyDown={(event) => {
              if (event.key === 'Enter') { event.preventDefault(); commitCreate(); }
              if (event.key === 'Escape') { setCreateName(''); setCreating(null); }
            }}
            aria-label={creating === 'file' ? 'New file name' : 'New folder name'}
          />
        </div>
      )}

      {isDirectory && open && item.children?.length > 0 && (
        <div className="fe-children" role="group">
          {item.children.map((child) => (
            <TreeNode
              key={child.path}
              item={child}
              depth={depth + 1}
              activeFilePath={activeFilePath}
              peers={peers}
              expandSignal={expandSignal}
              onSelectFile={onSelectFile}
              onCreateIn={onCreateIn}
              onRenameItem={onRenameItem}
              onDeleteItem={onDeleteItem}
              onRequestDelete={onRequestDelete}
              pendingDeletePath={pendingDeletePath}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const filterTree = (nodes, query) => {
  if (!query) return nodes;
  const needle = query.toLowerCase();

  const walk = (list) => list.reduce((acc, node) => {
    const selfMatches = node.name.toLowerCase().includes(needle);
    if (node.isDirectory) {
      const children = walk(node.children || []);
      // When the folder itself matches, keep its whole subtree — a search for
      // "src" that shows an empty folder is worse than no search at all.
      if (selfMatches) acc.push(node);
      else if (children.length) acc.push({ ...node, children });
    } else if (selfMatches) {
      acc.push(node);
    }
    return acc;
  }, []);

  return walk(nodes);
};

const FileExplorer = ({
  fileTree = [],
  activeFilePath,
  peers = [],
  onSelectFile,
  onCreateFile,
  onCreateFolder,
  onRenameItem,
  onDeleteItem,
  onRefreshTree,
  onOpenLocalFolder,
  onCloseFolder,
  onImportFiles,
  onImportFolder,
  onExportProject,
  isLocalDiskSync = false,
  isImporting = false,
  isLoading = false
}) => {
  const [search, setSearch] = useState('');
  const [rootCreate, setRootCreate] = useState(null);
  const [rootName, setRootName] = useState('');
  const [expandSignal, setExpandSignal] = useState({ value: 0, open: true });
  const [pendingDelete, setPendingDelete] = useState(null);
  const rootInputRef = useRef(null);

  useEffect(() => {
    if (rootCreate) rootInputRef.current?.focus();
  }, [rootCreate]);

  const commitRootCreate = () => {
    const name = rootName.trim();
    const kind = rootCreate;
    setRootName('');
    setRootCreate(null);
    if (!name || !kind) return;
    if (kind === 'folder') onCreateFolder(name);
    else onCreateFile(name);
  };

  const bump = (open) => setExpandSignal((prev) => ({ value: prev.value + 1, open }));

  const tree = useMemo(() => filterTree(fileTree, search.trim()), [fileTree, search]);
  const fileCount = useMemo(() => {
    const count = (nodes) => nodes.reduce((total, node) => (node.isDirectory ? total + count(node.children || []) : total + 1), 0);
    return count(fileTree);
  }, [fileTree]);

  const rootPrefix = fileTree[0]?.path?.split('/')[0] || '';

  return (
    <div className="fe-panel">
      <div className="fe-head">
        <div className="fe-title">
          <FolderTree size={13} />
          <strong>{isLocalDiskSync ? rootPrefix || 'Your folder' : 'Room files'}</strong>
          {isLocalDiskSync && <span className="fe-source"><HardDrive size={9} /> on disk</span>}
        </div>
        <div className="fe-tools-static">
          <button type="button" className="fe-tool" title="New file" aria-label="New file" onClick={() => { setRootCreate('file'); setRootName(''); }}>
            <FilePlus size={13} />
          </button>
          {onImportFiles && (
            <button
              type="button"
              className={`fe-tool ${isImporting ? 'is-spin' : ''}`}
              title="Import files into this room"
              aria-label="Import files"
              disabled={isImporting}
              onClick={onImportFiles}
            >
              <Upload size={13} />
            </button>
          )}
          {onImportFolder && (
            <button
              type="button"
              className="fe-tool"
              title="Import a whole project folder into this room"
              aria-label="Import folder"
              disabled={isImporting}
              onClick={onImportFolder}
            >
              <FolderInput size={13} />
            </button>
          )}
          {onExportProject && (
            <button
              type="button"
              className="fe-tool"
              title="Download this room as a .zip on your device"
              aria-label="Download project zip"
              onClick={onExportProject}
            >
              <Download size={13} />
            </button>
          )}
          <button type="button" className="fe-tool" title="New folder" aria-label="New folder" onClick={() => { setRootCreate('folder'); setRootName(''); }}>
            <FolderPlus size={13} />
          </button>
          <button type="button" className="fe-tool" title="Expand all" aria-label="Expand all folders" onClick={() => bump(true)}>
            <ChevronDown size={13} />
          </button>
          <button type="button" className="fe-tool" title="Collapse all" aria-label="Collapse all folders" onClick={() => bump(false)}>
            <ChevronRight size={13} />
          </button>
          <button type="button" className={`fe-tool ${isLoading ? 'is-spin' : ''}`} title="Reload the tree" aria-label="Reload tree" onClick={onRefreshTree}>
            <RefreshCw size={12} />
          </button>
          {isLocalDiskSync && (
            <button type="button" className="fe-tool is-danger" title="Close your folder, go back to room files" aria-label="Close folder" onClick={onCloseFolder}>
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="fe-search">
        <Search size={12} />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Filter by name"
          aria-label="Filter files"
        />
        {search && (
          <button type="button" onClick={() => setSearch('')} aria-label="Clear filter"><X size={11} /></button>
        )}
      </div>

      {rootCreate && (
        <div className="fe-root-create">
          {rootCreate === 'file' ? <FilePlus size={12} /> : <FolderPlus size={12} />}
          <input
            ref={rootInputRef}
            className="fe-inline-input"
            value={rootName}
            placeholder={rootCreate === 'file' ? 'e.g. src/app.js' : 'e.g. components'}
            onChange={(event) => setRootName(event.target.value)}
            onBlur={commitRootCreate}
            onKeyDown={(event) => {
              if (event.key === 'Enter') { event.preventDefault(); commitRootCreate(); }
              if (event.key === 'Escape') { setRootName(''); setRootCreate(null); }
            }}
            aria-label={rootCreate === 'file' ? 'New file path' : 'New folder name'}
          />
          {/* preventDefault on mousedown keeps the input from blurring (and
              therefore committing) before this click registers. */}
          <button type="button" className="fe-confirm" onMouseDown={(event) => event.preventDefault()} onClick={commitRootCreate} aria-label="Create"><Check size={12} /></button>
          <button type="button" className="fe-cancel" onMouseDown={(event) => event.preventDefault()} onClick={() => { setRootName(''); setRootCreate(null); }} aria-label="Cancel"><X size={12} /></button>
        </div>
      )}

      <div className="fe-tree" role="tree" aria-label="Project files">
        {tree.length === 0 ? (
          <div className="fe-blank">
            <FolderOpen size={22} />
            <strong>{search ? `Nothing called “${search}”` : isLocalDiskSync ? 'That folder is empty' : 'No files yet'}</strong>
            <span>
              {search
                ? 'Clear the filter to see everything.'
                : isLocalDiskSync
                  ? 'Anything you ignored (dotfiles, node_modules, dist) stays out of the tree.'
                  : 'Create one, or open a folder from your own machine.'}
            </span>
            {!search && !isLocalDiskSync && (
              <>
                <button type="button" className="fe-cta" onClick={() => onCreateFile('index.html', '<!DOCTYPE html>\n<html>\n  <body>\n    <h1>Hello</h1>\n  </body>\n</html>\n')}>
                  New file
                </button>
                {onOpenLocalFolder && (
                  <button type="button" className="fe-cta is-ghost" onClick={onOpenLocalFolder}>
                    Open my folder
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          tree.map((item) => (
            <TreeNode
              key={item.path}
              item={item}
              depth={0}
              activeFilePath={activeFilePath}
              peers={peers}
              expandSignal={expandSignal}
              onSelectFile={onSelectFile}
              onCreateIn={(path, kind) => (kind === 'folder' ? onCreateFolder(path) : onCreateFile(path))}
              onRenameItem={onRenameItem}
              onDeleteItem={(path) => { onDeleteItem(path); setPendingDelete(null); }}
              onRequestDelete={(path, name, isDir) => setPendingDelete(path ? { path, name, isDir } : null)}
              pendingDeletePath={pendingDelete?.path === item.path ? item.path : null}
            />
          ))
        )}
      </div>

      <div className="fe-foot">
        <span>{fileCount} {fileCount === 1 ? 'file' : 'files'}</span>
        {peers.length > 0 && (
          <span className="fe-foot-peers">
            <Users size={10} /> {new Set(peers.map((peer) => peer.username)).size} editing
          </span>
        )}
        <span className="fe-foot-mode">{isLocalDiskSync ? 'your disk' : 'room store'}</span>
        {onExportProject && (
          <button type="button" className="fe-download" onClick={onExportProject} title="Save this room to your device">
            <Download size={10} /> save
          </button>
        )}
      </div>
    </div>
  );
};

export default FileExplorer;
