import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Lock, PlusCircle, LogIn, Users, X, ArrowRight, KeyRound, Link2, AlertCircle, Check } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../styles/modal.css';

const cleanRoomId = (raw) =>
  String(raw)
    .trim()
    .replace(/^https?:\/\/[^/]+\/(pro-collab\/)?(workspace|demo)\//, '')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 40);

const suggestId = (title) => {
  const base = cleanRoomId(title).toLowerCase().replace(/^-+|-+$/g, '').slice(0, 22) || 'room';
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
};

const CreateJoinRoomModal = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState('create');
  const [title, setTitle] = useState('');
  const [customId, setCustomId] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [joinId, setJoinId] = useState('');
  const [openRooms, setOpenRooms] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const firstFieldRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  // /workspace/* is JWT-protected; guests reach the same page through /demo/*.
  const roomPath = (roomId) => (user ? `/workspace/${roomId}` : `/demo/${roomId}`);

  useEffect(() => {
    if (!isOpen) return undefined;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => firstFieldRef.current?.focus(), 80);
    let cancelled = false;
    api
      .get('/rooms')
      .then((res) => { if (!cancelled) setOpenRooms(res.data?.rooms || []); })
      .catch(() => { if (!cancelled) setOpenRooms([]); });
    return () => {
      cancelled = true;
      clearTimeout(t);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const reset = () => {
    setError('');
    setBusy(false);
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    if (title.trim().length < 2) return setError('Give the room a name of at least two characters.');
    const roomId = customId.trim() ? cleanRoomId(customId) : suggestId(title);
    if (isPrivate && password.length < 4) return setError('A locked room needs at least 4 characters of password.');

    setBusy(true);
    setError('');
    try {
      await api.post('/rooms', {
        roomId,
        title: title.trim(),
        isPrivate,
        password: isPrivate ? password : ''
      });
      navigate(roomPath(roomId));
      onClose();
    } catch (err) {
      setBusy(false);
      setError(err?.response?.data?.message || 'The server could not open this room. Is it running?');
    }
  };

  const submitJoin = async (e) => {
    e.preventDefault();
    const roomId = cleanRoomId(joinId);
    if (!roomId) return setError('Paste a room code or an invite link.');
    navigate(roomPath(roomId));
    onClose();
  };

  const enter = (roomId) => {
    navigate(roomPath(roomId));
    onClose();
  };

  return (
    <div className="cm-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cm-card" role="dialog" aria-modal="true" aria-labelledby="cm-title">
        <button type="button" className="cm-close" onClick={onClose} aria-label="Close">
          <X size={15} />
        </button>

        <header className="cm-head">
          <span className="cm-mark"><Users size={17} /></span>
          <div>
            <h2 id="cm-title" className="cm-title">Rooms</h2>
            <p className="cm-sub">Open a workspace for your team, or walk into one that is already running.</p>
          </div>
        </header>

        <div className="cm-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'create'}
            className={`cm-tab${tab === 'create' ? ' is-on' : ''}`}
            onClick={() => { setTab('create'); reset(); }}
          >
            <PlusCircle size={14} /> Open a new room
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'join'}
            className={`cm-tab${tab === 'join' ? ' is-on' : ''}`}
            onClick={() => { setTab('join'); reset(); }}
          >
            <LogIn size={14} /> Join with a code
          </button>
        </div>

        {tab === 'create' ? (
          <form className="cm-form" onSubmit={submitCreate} noValidate>
            <label className="cm-field">
              <span className="cm-label">Room name</span>
              <input
                ref={firstFieldRef}
                type="text"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setError(''); }}
                placeholder="Payments refactor, Tuesday pair session…"
                maxLength={60}
              />
            </label>

            <label className="cm-field">
              <span className="cm-label">
                Room code
                <em>optional — we generate one if you leave it blank</em>
              </span>
              <div className="cm-idwrap">
                <KeyRound size={14} />
                <input
                  type="text"
                  value={customId}
                  onChange={(e) => { setCustomId(cleanRoomId(e.target.value)); setError(''); }}
                  placeholder={title.trim().length > 1 ? suggestId(title) : 'payments-fix-4f2a'}
                  maxLength={40}
                />
              </div>
            </label>

            <button
              type="button"
              className={`cm-lock-toggle${isPrivate ? ' is-on' : ''}`}
              onClick={() => { setIsPrivate(!isPrivate); setError(''); }}
              aria-pressed={isPrivate}
            >
              <span className="cm-lock-icon"><Lock size={14} /></span>
              <span className="cm-lock-text">
                <strong>{isPrivate ? 'Password protected' : 'Anyone with the code can enter'}</strong>
                <em>{isPrivate ? 'Only people you give the password to will get in.' : 'Turn this on to keep the room off the public list.'}</em>
              </span>
              <span className="cm-switch" aria-hidden="true" />
            </button>

            {isPrivate && (
              <label className="cm-field">
                <span className="cm-label">Room password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="At least 4 characters"
                  autoComplete="off"
                  maxLength={72}
                />
              </label>
            )}

            {error && <p className="cm-error"><AlertCircle size={13} /> {error}</p>}

            <button type="submit" className="cm-go" disabled={busy}>
              {busy ? <><Loader2 size={15} className="cm-spin" /> Opening…</> : <>Create and enter <ArrowRight size={15} /></>}
            </button>
          </form>
        ) : (
          <form className="cm-form" onSubmit={submitJoin} noValidate>
            <label className="cm-field">
              <span className="cm-label">Room code or invite link</span>
              <div className="cm-idwrap">
                <Link2 size={14} />
                <input
                  ref={firstFieldRef}
                  type="text"
                  value={joinId}
                  onChange={(e) => { setJoinId(e.target.value); setError(''); }}
                  placeholder="payments-fix-4f2a, or paste the whole link"
                  maxLength={200}
                />
              </div>
            </label>

            {error && <p className="cm-error"><AlertCircle size={13} /> {error}</p>}

            <button type="submit" className="cm-go is-alt" disabled={busy}>
              Enter room <ArrowRight size={15} />
            </button>

            <div className="cm-list">
              <p className="cm-list-head">
                Rooms open right now
                <span className="cm-count">{openRooms.length}</span>
              </p>
              {openRooms.length === 0 ? (
                <p className="cm-list-empty">
                  Nothing is public at the moment. A locked room still opens if you have its code.
                </p>
              ) : (
                <ul>
                  {openRooms.slice(0, 6).map((r) => (
                    <li key={r.roomId}>
                      <button type="button" className="cm-row" onClick={() => enter(r.roomId)}>
                        <span className="cm-row-name">{r.title || r.roomId}</span>
                        <span className="cm-row-code">{r.roomId}</span>
                        <span className="cm-row-peers">
                          <Users size={12} /> {r.occupants || 0}
                        </span>
                        <Check size={14} className="cm-row-go" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </form>
        )}

        <p className="cm-foot">
          Not sure yet? <button type="button" className="cm-linkish" onClick={() => { navigate('/demo'); onClose(); }}>Walk into the demo room</button> — it needs no account.
        </p>
      </div>
    </div>
  );
};

export default CreateJoinRoomModal;
