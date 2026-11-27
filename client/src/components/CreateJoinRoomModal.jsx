import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, Lock, Globe, Plus, LogIn, Users, X, ArrowRight, KeyRound,
  Link2, AlertCircle, RefreshCw, FileCode2, Layers, Server, LayoutTemplate
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const cleanRoomId = (raw) =>
  String(raw)
    .trim()
    .replace(/^https?:\/\/[^/]+\/(pro-collab\/)?(workspace|demo)\//, '')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 40);

const slugBase = (title) => cleanRoomId(title)
  .toLowerCase()
  .replace(/^-+|-+$/g, '')
  .slice(0, 22) || 'room';

const suggestId = (title) => `${slugBase(title)}-${Math.random().toString(36).slice(2, 6)}`;

const TEMPLATES = [
  { id: 'blank', name: 'Blank canvas', icon: FileCode2, hint: '4 files' },
  { id: 'landing', name: 'Landing page', icon: LayoutTemplate, hint: '2 files' },
  { id: 'react', name: 'React app', icon: Layers, hint: '4 files' },
  { id: 'node', name: 'Node service', icon: Server, hint: '3 files' }
];

const CreateJoinRoomModal = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState('create');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [template, setTemplate] = useState('blank');
  const [customId, setCustomId] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [joinId, setJoinId] = useState('');
  const [openRooms, setOpenRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const firstFieldRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const roomPath = (roomId) => (user ? `/workspace/${roomId}` : `/demo/${roomId}`);

  useEffect(() => {
    if (!isOpen) return undefined;
    document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => firstFieldRef.current?.focus(), 90);

    let cancelled = false;
    setRoomsLoading(true);
    api
      .get('/rooms')
      .then((res) => { if (!cancelled) setOpenRooms(res.data?.rooms || []); })
      .catch(() => { if (!cancelled) setOpenRooms([]); })
      .finally(() => { if (!cancelled) setRoomsLoading(false); });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const resolvedCode = useMemo(
    () => (customId.trim() ? cleanRoomId(customId) : suggestId(title || 'room')),
    [customId, title]
  );

  if (!isOpen) return null;

  const reset = () => { setError(''); setBusy(false); };

  const submitCreate = async (event) => {
    event.preventDefault();
    if (title.trim().length < 2) return setError('Give the room a name of at least two characters.');
    if (isPrivate && password.length < 4) return setError('A locked room needs a password of at least 4 characters.');

    setBusy(true);
    setError('');
    try {
      await api.post('/rooms', {
        roomId: resolvedCode,
        title: title.trim(),
        description: description.trim(),
        template,
        isPrivate,
        password: isPrivate ? password : ''
      });
      navigate(roomPath(resolvedCode));
      onClose();
    } catch (err) {
      setBusy(false);
      setError(err?.response?.data?.message || 'The server could not open this room. Is it running?');
    }
  };

  const submitJoin = (event) => {
    event.preventDefault();
    const roomId = cleanRoomId(joinId);
    if (!roomId) return setError('Paste a room code or an invite link.');
    navigate(roomPath(roomId));
    onClose();
  };

  const enter = (roomId) => {
    navigate(roomPath(roomId));
    onClose();
  };

  const fieldStyle = { display: 'flex', flexDirection: 'column', gap: 7 };
  const orangeBtn = {
    background: 'linear-gradient(135deg, #ff7a45, #f97316)',
    color: '#ffffff',
    boxShadow: '0 10px 26px -10px rgba(255, 122, 69, 0.7)',
    border: 0,
  };
  const ghostBtn = {
    background: 'var(--lp-surface-2)',
    color: 'var(--lp-fg)',
    border: '1px solid var(--lp-line)',
  };

  return (
    <div
      className="lp-page"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: 'rgba(10, 10, 12, 0.65)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div
        className="lp-orange-glow"
        aria-hidden="true"
        style={{ position: 'fixed', width: 760, height: 560, top: '50%', left: '50%', marginLeft: -380, marginTop: -280, zIndex: 0 }}
      />

      <div
        className="lp-depth lp-surface lp-sq"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cm-title"
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 620,
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '28px 28px 24px',
          animation: 'lp-modal-in .4s cubic-bezier(.22,1,.36,1) both',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <h2 id="cm-title" style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--lp-fg)' }}>Start collaborating</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--lp-muted)', fontSize: 13.5 }}>One room, one shared buffer.</p>
          </div>
          <button type="button" className="lp-btn lp-btn-ghost lp-round" onClick={onClose} aria-label="Close" style={{ width: 34, height: 34, padding: 0 }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
          <button
            type="button"
            className="lp-btn"
            style={tab === 'create' ? orangeBtn : ghostBtn}
            onClick={() => { setTab('create'); reset(); }}
          >
            <Plus size={14} /> New room
          </button>
          <button
            type="button"
            className="lp-btn"
            style={tab === 'join' ? orangeBtn : ghostBtn}
            onClick={() => { setTab('join'); reset(); }}
          >
            <LogIn size={14} /> Join with code
          </button>
        </div>

        {tab === 'create' ? (
          <form onSubmit={submitCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label style={fieldStyle}>
              <span style={{ fontSize: 13, color: 'var(--lp-muted)', fontWeight: 500 }}>Room name</span>
              <input className="lp-input lp-modal-input" ref={firstFieldRef} type="text" value={title} onChange={(e) => { setTitle(e.target.value); setError(''); }} placeholder="Payments refactor" maxLength={60} />
            </label>

            <label style={fieldStyle}>
              <span style={{ fontSize: 13, color: 'var(--lp-muted)', fontWeight: 500 }}>Description (optional)</span>
              <textarea className="lp-input lp-modal-input" value={description} onChange={(e) => { setDescription(e.target.value.slice(0, 200)); setError(''); }} placeholder="What are we building?" rows={2} style={{ resize: 'vertical' }} />
            </label>

            <div style={fieldStyle}>
              <span style={{ fontSize: 13, color: 'var(--lp-muted)', fontWeight: 500 }}>Start from</span>
              <div className="lp-modal-templates">
                {TEMPLATES.map((item) => {
                  const Icon = item.icon;
                  const active = template === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="lp-btn"
                      onClick={() => setTemplate(item.id)}
                      style={{
                        flexDirection: 'column',
                        padding: '10px 8px',
                        gap: 6,
                        background: active ? 'rgba(255, 122, 69, 0.14)' : 'var(--lp-surface-2)',
                        color: active ? '#ff7a45' : 'var(--lp-fg)',
                        border: active ? '1px solid #ff7a45' : '1px solid var(--lp-line)',
                      }}
                    >
                      <Icon size={16} />
                      <span style={{ fontSize: 12 }}>{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <label style={fieldStyle}>
              <span style={{ fontSize: 13, color: 'var(--lp-muted)', fontWeight: 500 }}>Room code</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <KeyRound size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--lp-muted)' }} />
                  <input className="lp-input lp-modal-input" type="text" value={customId} onChange={(e) => { setCustomId(cleanRoomId(e.target.value)); setError(''); }} placeholder={resolvedCode} maxLength={40} style={{ paddingLeft: 34 }} />
                </div>
                <button type="button" className="lp-btn" style={ghostBtn} onClick={() => { setCustomId(suggestId(title || 'room')); setError(''); }} aria-label="Generate code">
                  <RefreshCw size={14} />
                </button>
              </div>
            </label>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', border: '1px solid var(--lp-line)', borderRadius: 12, background: 'var(--lp-surface-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {isPrivate ? <Lock size={15} style={{ color: '#ff7a45' }} /> : <Globe size={15} style={{ color: 'var(--lp-muted)' }} />}
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--lp-fg)' }}>{isPrivate ? 'Private room' : 'Public room'}</div>
                  <div style={{ fontSize: 12, color: 'var(--lp-muted)' }}>{isPrivate ? 'Password required' : 'Listed publicly'}</div>
                </div>
              </div>
              <button
                type="button"
                className="lp-btn"
                onClick={() => { setIsPrivate(!isPrivate); setError(''); }}
                style={isPrivate ? { ...orangeBtn, padding: '7px 14px' } : { ...ghostBtn, padding: '7px 14px' }}
              >
                {isPrivate ? 'Private' : 'Public'}
              </button>
            </div>

            {isPrivate && (
              <label style={fieldStyle}>
                <span style={{ fontSize: 13, color: 'var(--lp-muted)', fontWeight: 500 }}>Password</span>
                <input className="lp-input lp-modal-input" type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} placeholder="At least 4 characters" autoComplete="new-password" maxLength={72} />
              </label>
            )}

            {error && (
              <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444', fontSize: 13.5 }}>
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <button type="submit" className="lp-btn" disabled={busy} style={{ ...orangeBtn, width: '100%', padding: '13px 18px', fontSize: 15, fontWeight: 600 }}>
              {busy ? <><Loader2 size={15} /> Creating…</> : <>Create and enter <ArrowRight size={15} /></>}
            </button>
          </form>
        ) : (
          <form onSubmit={submitJoin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label style={fieldStyle}>
              <span style={{ fontSize: 13, color: 'var(--lp-muted)', fontWeight: 500 }}>Room code or invite link</span>
              <div style={{ position: 'relative' }}>
                <Link2 size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--lp-muted)' }} />
                <input className="lp-input lp-modal-input" ref={firstFieldRef} type="text" value={joinId} onChange={(e) => { setJoinId(e.target.value); setError(''); }} placeholder="payments-refactor-4f2a" maxLength={200} style={{ paddingLeft: 34 }} />
              </div>
            </label>

            {error && (
              <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444', fontSize: 13.5 }}>
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <button type="submit" className="lp-btn" style={{ ...orangeBtn, width: '100%', padding: '13px 18px', fontSize: 15, fontWeight: 600 }}>
              Enter room <ArrowRight size={15} />
            </button>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--lp-muted)' }}>Open rooms</span>
                <span style={{ fontSize: 12, color: 'var(--lp-muted)' }}>{openRooms.length}</span>
              </div>
              {roomsLoading ? (
                <p style={{ color: 'var(--lp-muted)', fontSize: 14 }}>Looking for public rooms…</p>
              ) : openRooms.length === 0 ? (
                <p style={{ color: 'var(--lp-muted)', fontSize: 14 }}>No public rooms right now.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto' }}>
                  {openRooms.slice(0, 8).map((room) => (
                    <li key={room.roomId}>
                      <button type="button" className="lp-btn" onClick={() => enter(room.roomId)} style={{ ...ghostBtn, width: '100%', justifyContent: 'space-between' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Users size={14} style={{ color: '#ff7a45' }} /> {room.title || room.roomId}
                        </span>
                        <ArrowRight size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </form>
        )}

        <div style={{ marginTop: 18, textAlign: 'center', fontSize: 13, color: 'var(--lp-muted)' }}>
          Just looking?{' '}
          <button type="button" className="lp-btn lp-btn-ghost" onClick={() => { navigate('/demo'); onClose(); }} style={{ padding: '4px 8px', color: '#ff7a45' }}>
            Open demo room
          </button>
        </div>

        <style>{`
          @keyframes lp-modal-in {
            from { opacity: 0; transform: translateY(16px) scale(0.97); }
            to { opacity: 1; transform: none; }
          }
          .lp-modal-input:focus {
            outline: 2px solid #ff7a45 !important;
            outline-offset: 2px;
          }
        `}</style>
      </div>
    </div>
  );
};

export default CreateJoinRoomModal;
