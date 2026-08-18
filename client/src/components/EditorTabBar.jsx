import React from 'react';
import { X, FileCode, FileText, File, Save, CheckCircle2, HardDrive, RefreshCw, Play, Square } from 'lucide-react';

export const getFileIcon = (filename = '') => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx':
      return <FileCode className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    case 'ts':
    case 'tsx':
      return <FileCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
    case 'py':
      return <FileCode className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
    case 'html':
      return <FileCode className="w-3.5 h-3.5 text-orange-400 shrink-0" />;
    case 'css':
      return <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
    case 'json':
      return <FileCode className="w-3.5 h-3.5 text-amber-300 shrink-0" />;
    case 'md':
      return <FileText className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
    case 'cpp':
    case 'c':
    case 'h':
      return <FileCode className="w-3.5 h-3.5 text-indigo-400 shrink-0" />;
    case 'rs':
      return <FileCode className="w-3.5 h-3.5 text-orange-300 shrink-0" />;
    default:
      return <File className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
  }
};

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
  isLocalDiskSync = false
}) => {
  if (openFiles.length === 0) return null;

  return (
    <div className="bg-[#0f131a] border-b border-white/[0.08] flex items-center justify-between px-2 overflow-x-auto select-none scrollbar-hide">
      {/* File Tabs List */}
      <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-hide">
        {openFiles.map((file) => {
          const isActive = file.path === activeFilePath;
          const fileName = file.name || file.path.split('/').pop();

          return (
            <div
              key={file.path}
              onClick={() => onSelectTab(file.path)}
              className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all duration-150 relative ${
                isActive
                  ? 'bg-white/[0.08] text-white border border-white/[0.12] shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
              title={file.path}
            >
              {/* File Extension Icon */}
              {getFileIcon(fileName)}

              {/* File Name */}
              <span className="truncate max-w-[140px]">{fileName}</span>

              {/* Dirty indicator */}
              {isActive && isDirty && (
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse shrink-0" title="Unsaved changes (Ctrl+S to save)" />
              )}

              {/* Close Tab Button */}
              {openFiles.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(file.path);
                  }}
                  className="p-0.5 rounded hover:bg-white/10 text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity ml-0.5"
                  title="Close Tab"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Right Controls: Run Preview, Save Button & Disk Sync Badge */}
      <div className="flex items-center gap-2 pl-3 py-1 shrink-0">
        {/* On-Demand Run Preview Button */}
        {onTogglePreview && (
          <button
            type="button"
            onClick={onTogglePreview}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
              showLivePreview
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/30'
            }`}
            title={showLivePreview ? 'Close Live Web Preview' : 'Run & Open Live Web Preview (Side-by-Side)'}
          >
            {showLivePreview ? (
              <>
                <Square className="w-3 h-3 fill-current" />
                <span>Close Preview</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" />
                <span>Run Preview</span>
              </>
            )}
          </button>
        )}

        {isLocalDiskSync && (
          <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
            <HardDrive className="w-3 h-3 text-emerald-400" />
            <span>VS Code Sync</span>
          </span>
        )}

        <button
          onClick={onSaveActiveFile}
          disabled={isSaving}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
            isDirty
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/30'
              : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/10'
          }`}
          title="Save File to Disk (Ctrl + S)"
        >
          {isSaving ? (
            <RefreshCw className="w-3 h-3 animate-spin text-white" />
          ) : (
            <Save className="w-3 h-3" />
          )}
          <span>{isSaving ? 'Saving...' : isDirty ? 'Save (Ctrl+S)' : 'Saved'}</span>
        </button>
      </div>
    </div>
  );
};

export default EditorTabBar;
