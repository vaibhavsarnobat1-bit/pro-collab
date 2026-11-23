import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Activity, Edit3, UserPlus, LogOut, Video, Monitor, FilePlus, Trash2, Pencil, MessageSquare, Info } from 'lucide-react';
import '../styles/rail.css';

const ACTION_META = {
  EDITED: { icon: Edit3, tint: 'var(--brand-text)', label: 'edit' },
  JOINED: { icon: UserPlus, tint: 'var(--ok)', label: 'join' },
  LEFT: { icon: LogOut, tint: 'var(--bad)', label: 'leave' },
  CALL: { icon: Video, tint: 'var(--violet)', label: 'call' },
  SCREEN: { icon: Monitor, tint: 'var(--warn)', label: 'share' },
  CREATED: { icon: FilePlus, tint: 'var(--cyan)', label: 'file' },
  DELETED: { icon: Trash2, tint: 'var(--bad)', label: 'file' },
  RENAMED: { icon: Pencil, tint: 'var(--cyan)', label: 'file' },
  MESSAGE: { icon: MessageSquare, tint: 'var(--lime)', label: 'chat' }
};

const at = (index) => index < 3;

const clockText = (value) => {
  if (!value) return 'now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'now';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'EDITED', label: 'Edits' },
  { id: 'JOINED', label: 'People' },
  { id: 'FILE', label: 'Files' },
  { id: 'CALL', label: 'Calls' }
];

const matches = (log, filter) => {
  if (filter === 'all') return true;
  if (filter === 'FILE') return ['CREATED', 'DELETED', 'RENAMED'].includes(log.action);
  if (filter === 'JOINED') return ['JOINED', 'LEFT'].includes(log.action);
  if (filter === 'CALL') return ['CALL', 'SCREEN'].includes(log.action);
  return log.action === filter;
};

const ActivityLogPanel = ({ logs = [] }) => {
  const [filter, setFilter] = useState('all');
  const firstId = logs[0]?.id;
  const seen = useRef(firstId);

  useEffect(() => {
    seen.current = firstId;
  }, [firstId]);

  const rows = useMemo(() => logs.filter((log) => matches(log, filter)).slice(0, 120), [logs, filter]);

  return (
    <div className="al-panel">
      <div className="al-head">
        <div className="al-title">
          <span className="al-mark"><Activity size={13} /></span>
          <div>
            <strong>Room history</strong>
            <small>who changed what, newest first</small>
          </div>
        </div>
        <span className="al-count">{logs.length}</span>
      </div>

      <div className="al-filter">
        {FILTERS.map((item) => (
          <button key={item.id} type="button" className={filter === item.id ? 'is-on' : ''} onClick={() => setFilter(item.id)}>
            {item.label}
          </button>
        ))}
      </div>

      <div className="al-feed">
        {rows.length === 0 ? (
          <div className="al-empty">
            <Info size={20} />
            <strong>{logs.length ? 'Nothing matches that filter' : 'No activity recorded yet'}</strong>
            <span>{logs.length ? 'Pick another filter above.' : 'Joins, edits and file operations land here as they happen.'}</span>
          </div>
        ) : (
          rows.map((log, index) => {
            const meta = ACTION_META[log.action] || { icon: Activity, tint: 'var(--ink-faint)', label: (log.action || 'event').toLowerCase() };
            const Icon = meta.icon;
            return (
              <div key={log.id || `${log.timestamp}-${index}`} className={`al-row ${at(index) && log.id !== seen.current ? 'is-fresh' : ''}`}>
                <span className="al-icon" style={{ color: meta.tint }}><Icon size={13} /></span>
                <div className="al-body">
                  <div className="al-line1">
                    <span className="al-who">{log.username || 'someone'}</span>
                    <span className="al-when">{clockText(log.timestamp)}</span>
                  </div>
                  <p className="al-what">{log.details || log.message || meta.label}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ActivityLogPanel;
