import React from 'react';
import { Activity, Edit3, UserPlus, LogOut, Video, Monitor, AlertCircle } from 'lucide-react';

const getActionIcon = (action) => {
  switch (action) {
    case 'EDITED':
      return <Edit3 className="w-3.5 h-3.5 text-indigo-400" />;
    case 'JOINED':
      return <UserPlus className="w-3.5 h-3.5 text-teal-400" />;
    case 'LEFT':
      return <LogOut className="w-3.5 h-3.5 text-rose-400" />;
    case 'CALL':
      return <Video className="w-3.5 h-3.5 text-purple-400" />;
    case 'SCREEN':
      return <Monitor className="w-3.5 h-3.5 text-amber-400" />;
    default:
      return <Activity className="w-3.5 h-3.5 text-slate-400" />;
  }
};

const ActivityLogPanel = ({ logs = [] }) => {
  return (
    <div className="flex flex-col h-full bg-slate-900/90 rounded-xl border border-slate-800 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-teal-400 animate-pulse" />
          <span className="text-xs font-extrabold text-white tracking-wide">LIVE ACTIVITY LOG</span>
        </div>
        <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-800 text-slate-400 rounded-md border border-slate-700">
          Who changed what
        </span>
      </div>

      {/* Activity List */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2.5 min-h-[220px]">
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-8">
            <Activity className="w-8 h-8 text-slate-600 mb-2 opacity-50" />
            <span className="text-xs font-medium">No activity recorded yet</span>
            <span className="text-[11px] text-slate-600 mt-0.5">Edits and joins will show up live</span>
          </div>
        ) : (
          logs.map((item, index) => (
            <div
              key={item.id || index}
              className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-colors flex items-start gap-2.5"
            >
              <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 shrink-0 mt-0.5">
                {getActionIcon(item.action)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold text-slate-200 truncate">{item.username}</span>
                  <span className="text-[10px] text-slate-500 font-mono shrink-0">
                    {item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Just now'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug break-words">
                  {item.details || item.action}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ActivityLogPanel;
