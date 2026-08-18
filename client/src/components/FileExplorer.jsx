import React, { useState, useRef, useEffect } from 'react';
import {
  Folder,
  FolderOpen,
  File,
  FilePlus,
  FolderPlus,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Trash2,
  Edit2,
  Sparkles,
  Search,
  Check,
  X,
  Laptop,
  ChevronsDownUp,
  ChevronsUpDown
} from 'lucide-react';

import { getFileIcon } from './EditorTabBar';

// Recursive Tree Node Component
const TreeNode = ({
  item,
  activeFilePath,
  onSelectFile,
  onCreateFileInFolder,
  onCreateFolderInFolder,
  onRenameItem,
  onDeleteItem,
  globalExpandState,
  depth = 0
}) => {
  const [isOpen, setIsOpen] = useState(depth < 2);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(item.name);
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const inputRef = useRef(null);

  // Sync with global expand/collapse state
  useEffect(() => {
    if (globalExpandState !== undefined && globalExpandState !== null) {
      setIsOpen(globalExpandState);
    }
  }, [globalExpandState]);

  useEffect(() => {
    if (isRenaming || showNewFileInput || showNewFolderInput) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isRenaming, showNewFileInput, showNewFolderInput]);

  const handleRenameSubmit = (e) => {
    e.preventDefault();
    if (renameValue.trim() && renameValue !== item.name) {
      const parentDir = item.path.includes('/') ? item.path.substring(0, item.path.lastIndexOf('/')) : '';
      const newPath = parentDir ? `${parentDir}/${renameValue.trim()}` : renameValue.trim();
      onRenameItem(item.path, newPath);
    }
    setIsRenaming(false);
  };

  const handleCreateSubmit = (e, isFolder) => {
    e.preventDefault();
    if (newItemName.trim()) {
      const targetPath = item.path ? `${item.path}/${newItemName.trim()}` : newItemName.trim();
      if (isFolder) {
        onCreateFolderInFolder(targetPath);
      } else {
        onCreateFileInFolder(targetPath);
      }
      setNewItemName('');
      setShowNewFileInput(false);
      setShowNewFolderInput(false);
      setIsOpen(true);
    }
  };

  const isDirectory = item.isDirectory || (item.children && item.children.length >= 0);
  const isActive = !isDirectory && item.path === activeFilePath;

  return (
    <div className="select-none">
      {/* Node Row */}
      <div
        className={`group flex items-center justify-between py-1 px-2 rounded-lg text-xs cursor-pointer transition-colors duration-150 ${
          isActive
            ? 'bg-indigo-600/25 text-white border border-indigo-500/30 font-semibold'
            : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
        }`}
        style={{ paddingLeft: `${Math.max(8, depth * 14 + 6)}px` }}
        onClick={() => {
          if (isDirectory) {
            setIsOpen(!isOpen);
          } else {
            onSelectFile(item);
          }
        }}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {isDirectory ? (
            <>
              {isOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              )}
              {isOpen ? (
                <FolderOpen className="w-4 h-4 text-indigo-400 shrink-0" />
              ) : (
                <Folder className="w-4 h-4 text-indigo-400 shrink-0" />
              )}
            </>
          ) : (
            <>
              <span className="w-3.5 shrink-0" />
              {getFileIcon(item.name)}
            </>
          )}

          {/* Name or Rename Input */}
          {isRenaming ? (
            <form onSubmit={handleRenameSubmit} className="flex-1" onClick={(e) => e.stopPropagation()}>
              <input
                ref={inputRef}
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={handleRenameSubmit}
                className="w-full bg-[#0a0c10] border border-indigo-500 text-white rounded px-1.5 py-0.5 text-xs outline-none"
              />
            </form>
          ) : (
            <span className="truncate">{item.name}</span>
          )}
        </div>

        {/* Action icons on hover */}
        {!isRenaming && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
            {isDirectory && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNewFileInput(true);
                    setIsOpen(true);
                  }}
                  className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white"
                  title="New File in Folder"
                >
                  <FilePlus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNewFolderInput(true);
                    setIsOpen(true);
                  }}
                  className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white"
                  title="New Subfolder"
                >
                  <FolderPlus className="w-3 h-3" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsRenaming(true);
              }}
              className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white"
              title="Rename"
            >
              <Edit2 className="w-3 h-3" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
                  onDeleteItem(item.path);
                }
              }}
              className="p-1 hover:bg-rose-500/20 rounded text-slate-400 hover:text-rose-400"
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Inline New File Input in Folder */}
      {showNewFileInput && (
        <form
          onSubmit={(e) => handleCreateSubmit(e, false)}
          className="flex items-center gap-1 py-1"
          style={{ paddingLeft: `${(depth + 1) * 14 + 14}px` }}
        >
          <File className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="filename.js"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onBlur={() => setShowNewFileInput(false)}
            className="flex-1 bg-[#0a0c10] border border-indigo-500 text-white rounded px-1.5 py-0.5 text-xs outline-none"
          />
        </form>
      )}

      {/* Inline New Subfolder Input */}
      {showNewFolderInput && (
        <form
          onSubmit={(e) => handleCreateSubmit(e, true)}
          className="flex items-center gap-1 py-1"
          style={{ paddingLeft: `${(depth + 1) * 14 + 14}px` }}
        >
          <Folder className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="folder_name"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onBlur={() => setShowNewFolderInput(false)}
            className="flex-1 bg-[#0a0c10] border border-indigo-500 text-white rounded px-1.5 py-0.5 text-xs outline-none"
          />
        </form>
      )}

      {/* Recursive Children Rendering */}
      {isDirectory && isOpen && item.children && item.children.length > 0 && (
        <div className="flex flex-col">
          {item.children.map((child) => (
            <TreeNode
              key={child.path}
              item={child}
              activeFilePath={activeFilePath}
              onSelectFile={onSelectFile}
              onCreateFileInFolder={onCreateFileInFolder}
              onCreateFolderInFolder={onCreateFolderInFolder}
              onRenameItem={onRenameItem}
              onDeleteItem={onDeleteItem}
              globalExpandState={globalExpandState}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FileExplorer = ({
  fileTree = [],
  activeFilePath,
  onSelectFile,
  onCreateFile,
  onCreateFolder,
  onRenameItem,
  onDeleteItem,
  onRefreshTree,
  onSyncLocalWorkspace,
  onOpenLocalFolder,
  onCloseFolder,
  isLocalDiskSync = false,
  isLoading = false
}) => {
  const folderIsOpen = fileTree.length > 0;
  const [searchTerm, setSearchTerm] = useState('');
  const [showRootFileInput, setShowRootFileInput] = useState(false);
  const [showRootFolderInput, setShowRootFolderInput] = useState(false);
  const [rootItemName, setRootItemName] = useState('');
  const [globalExpandState, setGlobalExpandState] = useState(null);
  const rootInputRef = useRef(null);

  useEffect(() => {
    if (showRootFileInput || showRootFolderInput) {
      rootInputRef.current?.focus();
    }
  }, [showRootFileInput, showRootFolderInput]);

  const handleRootCreate = (e, isFolder) => {
    e.preventDefault();
    if (rootItemName.trim()) {
      if (isFolder) {
        onCreateFolder(rootItemName.trim());
      } else {
        onCreateFile(rootItemName.trim());
      }
      setRootItemName('');
      setShowRootFileInput(false);
      setShowRootFolderInput(false);
    }
  };

  // Toggle Collapse All / Expand All
  const handleToggleExpandAll = (expand) => {
    setGlobalExpandState(expand);
    // Reset after trigger so user can still manually toggle individual folders
    setTimeout(() => setGlobalExpandState(null), 300);
  };

  // Filter tree recursively
  const filterTree = (nodes, query) => {
    if (!query) return nodes;
    const lowerQuery = query.toLowerCase();

    return nodes.reduce((acc, node) => {
      const matches = node.name.toLowerCase().includes(lowerQuery);
      if (node.isDirectory && node.children) {
        const filteredChildren = filterTree(node.children, query);
        if (matches || filteredChildren.length > 0) {
          acc.push({ ...node, children: filteredChildren });
        }
      } else if (matches) {
        acc.push(node);
      }
      return acc;
    }, []);
  };

  const displayedTree = filterTree(fileTree, searchTerm);

  return (
    <div className="flex flex-col h-full bg-[#0d1117] border border-white/[0.08] rounded-2xl shadow-xl overflow-hidden">
      
      {/* Explorer Header */}
      <div className="bg-[#111620] px-3.5 py-3 border-b border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
          <Laptop className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="text-xs font-bold text-white tracking-wider uppercase truncate">
            {folderIsOpen ? 'EXPLORER' : 'WORKSPACE EXPLORER'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-0.5 shrink-0">
          {folderIsOpen && (
            <>
              <button
                type="button"
                onClick={() => {
                  setShowRootFileInput(true);
                  setShowRootFolderInput(false);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                title="New File"
              >
                <FilePlus className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowRootFolderInput(true);
                  setShowRootFileInput(false);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                title="New Folder"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handleToggleExpandAll(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                title="Expand All"
              >
                <ChevronsUpDown className="w-3.5 h-3.5 text-indigo-400" />
              </button>

              <button
                type="button"
                onClick={() => handleToggleExpandAll(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                title="Collapse All"
              >
                <ChevronsDownUp className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={onRefreshTree}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
              </button>

              {/* ── Close Folder Button ── */}
              <button
                type="button"
                onClick={onCloseFolder}
                className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                title="Close Folder"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Open / Change Folder Quick Action — only show when no folder is open */}
      {!folderIsOpen && window.showDirectoryPicker && (
        <div className="p-2.5 border-b border-white/[0.06]">
          <button
            onClick={onOpenLocalFolder}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all group cursor-pointer"
            title="Open your project folder from your computer"
          >
            <FolderOpen className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
            <span>Open Folder</span>
          </button>
        </div>
      )}


      {/* Search Bar */}
      <div className="p-2 border-b border-white/[0.06]">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#080b11] border border-white/[0.08] focus:border-indigo-500 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Root Inline New File Input */}
      {showRootFileInput && (
        <form
          onSubmit={(e) => handleRootCreate(e, false)}
          className="p-2 border-b border-indigo-500/40 bg-indigo-500/[0.05] flex items-center gap-2"
        >
          <FilePlus className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <input
            ref={rootInputRef}
            type="text"
            placeholder="new_file.js"
            value={rootItemName}
            onChange={(e) => setRootItemName(e.target.value)}
            onBlur={() => setShowRootFileInput(false)}
            className="flex-1 bg-[#0a0c10] border border-indigo-500 text-white rounded px-2 py-1 text-xs outline-none"
          />
          <button type="submit" className="text-emerald-400 hover:text-emerald-300"><Check className="w-3.5 h-3.5" /></button>
          <button type="button" onClick={() => setShowRootFileInput(false)} className="text-slate-400 hover:text-white"><X className="w-3.5 h-3.5" /></button>
        </form>
      )}

      {/* Root Inline New Folder Input */}
      {showRootFolderInput && (
        <form
          onSubmit={(e) => handleRootCreate(e, true)}
          className="p-2 border-b border-indigo-500/40 bg-indigo-500/[0.05] flex items-center gap-2"
        >
          <FolderPlus className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <input
            ref={rootInputRef}
            type="text"
            placeholder="new_folder"
            value={rootItemName}
            onChange={(e) => setRootItemName(e.target.value)}
            onBlur={() => setShowRootFolderInput(false)}
            className="flex-1 bg-[#0a0c10] border border-indigo-500 text-white rounded px-2 py-1 text-xs outline-none"
          />
          <button type="submit" className="text-emerald-400 hover:text-emerald-300"><Check className="w-3.5 h-3.5" /></button>
          <button type="button" onClick={() => setShowRootFolderInput(false)} className="text-slate-400 hover:text-white"><X className="w-3.5 h-3.5" /></button>
        </form>
      )}



      {/* Tree Content */}
      <div className="flex-1 p-2 overflow-y-auto space-y-0.5 scrollbar-hide min-h-[250px]">
        {displayedTree.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-6 gap-4 h-full min-h-[200px]">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-indigo-400 opacity-80" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-300 mb-1">No folder open</p>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Open your project folder<br />to see files here
              </p>
            </div>
            {onOpenLocalFolder && (
              <button
                onClick={onOpenLocalFolder}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                Open Folder
              </button>
            )}
          </div>
        ) : (
          displayedTree.map((item) => (
            <TreeNode
              key={item.path}
              item={item}
              activeFilePath={activeFilePath}
              onSelectFile={onSelectFile}
              onCreateFileInFolder={onCreateFile}
              onCreateFolderInFolder={onCreateFolder}
              onRenameItem={onRenameItem}
              onDeleteItem={onDeleteItem}
              globalExpandState={globalExpandState}
            />
          ))
        )}
      </div>

    </div>

  );
};

export default FileExplorer;
