import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, Lock, Globe, Plus, LogIn, Users, X, ArrowRight, KeyRound,
  Link2, AlertCircle, RefreshCw, FileCode2, Layers, Server, LayoutTemplate
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../styles/modal.css';

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
  {
    id: 'blank',
    name: 'Blank canvas',
    hint: 'Runnable HTML demo',
    icon: FileCode2,
    files: '4 files',
    blurb: 'HTML, CSS and JS wired together so the preview works immediately.'
  },
  {
    id: 'landing',
    name: 'Landing page',
    hint: 'Semantic HTML + CSS',
    icon: LayoutTemplate,
    files: '2 files',
    blurb: 'A clean marketing page with system-font typography and no dependencies.'
  },
  {
    id: 'react',
    name: 'React app',
    hint: 'Vite scaffold',
    icon: Layers,
    files: '4 files',
    blurb: 'App and entry files, ready for you to paste into a local Vite project.'
  },
  {
    id: 'node',
    name: 'Node service',
    hint: 'HTTP server',
    icon: Server,
    files: '3 files',
    blurb: 'Minimal server with package.json, Logging and README included.'
  }
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

  // /workspace/* is JWT-protected; guests reach the same page through /demo/*.
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

  const selectedTemplate = TEMPLATES.find((item) => item.id === template) || TEMPLATES[0];

  if (!isOpen) return null;

  const reset = () => {
    setError('');
    setBusy(false);
  };

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

  return (
    <div className="cm-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="cm-card" role="dialog" aria-modal="true" aria-labelledby="cm-title">
        <header className="cm-head">
          <div className="cm-head-copy">
            <span className="cm-kicker">Workspace</span>
            <h2 id="cm-title" className="cm-title">Start collaborating</h2>
            <p className="cm-sub">One room, one shared buffer, everyone's edits live at once.</p>
          </div>
          <button type="button" className="cm-close" onClick={onClose} aria-label="Close">
            <X size={15} />
          </button>
        </header>

        <div className="cm-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'create'}
            className={`cm-tab${tab === 'create' ? ' is-on' : ''}`}
            onClick={() => { setTab('create'); reset(); }}
          >
            <Plus size={14} /> New room
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'join'}
            className={`cm-tab${tab === 'join' ? ' is-on' : ''}`}
            onClick={() => { setTab('join'); reset(); }}
          >
            <LogIn size={14} /> Join with code
          </button>
        </div>

        {tab === 'create' ? (
          <div className="cm-panes">
            <form className="cm-form" onSubmit={submitCreate} noValidate>
              <label className="cm-field">
                <span className="cm-label">Room name</span>
                <input
                  ref={firstFieldRef}
                  type="text"
                  value={title}
                  onChange={(event) => { setTitle(event.target.value); setError(''); }}
                  placeholder="Payments refactor"
                  maxLength={60}
                />
              </label>

              <label className="cm-field">
                <span className="cm-label">
                  Description
                  <em>optional · shown to everyone who joins</em>
                </span>
                <textarea
                  value={description}
                  onChange={(event) => { setDescription(event.target.value.slice(0, 200)); setError(''); }}
                  placeholder="What are we building in here?"
                  rows={2}
                />
                <span className="cm-counter">{description.length}/200</span>
              </label>

              <div className="cm-field">
                <span className="cm-label">Start from</span>
                <div className="cm-templates" role="radiogroup" aria-label="Room template">
                  {TEMPLATES.map((item) => {
                    const Icon = item.icon;
                    const active = template === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        className={`cm-template${active ? ' is-on' : ''}`}
                        onClick={() => setTemplate(item.id)}
                      >
                        <Icon size={15} className="cm-template-icon" />
                        <span className="cm-template-name">{item.name}</span>
                        <span className="cm-template-hint">{item.files}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="cm-hint">{selectedTemplate.blurb}</p>
              </div>

              <label className="cm-field">
                <span className="cm-label">
                  Room code
                  <em>used in the invite link</em>
                </span>
                <div className="cm-idwrap">
                  <KeyRound size={14} />
                  <input
                    type="text"
                    value={customId}
                    onChange={(event) => { setCustomId(cleanRoomId(event.target.value)); setError(''); }}
                    placeholder={resolvedCode}
                    maxLength={40}
                  />
                  <button
                    type="button"
                    className="cm-rand"
                    onClick={() => { setCustomId(suggestId(title || 'room')); setError(''); }}
                    title="Generate another code"
                    aria-label="Generate another room code"
                  >
                    <RefreshCw size={13} />
                  </button>
                </div>
              </label>

              <div className={`cm-access${isPrivate ? ' is-locked' : ''}`}>
                <div className="cm-access-row">
                  <span className="cm-access-icon">{isPrivate ? <Lock size={13} /> : <Globe size={13} />}</span>
                  <div className="cm-access-copy">
                    <strong>{isPrivate ? 'Private room' : 'Public room'}</strong>
                    <em>{isPrivate ? 'Listed nowhere. Password required.' : 'Appears in the public room list.'}</em>
                  </div>
                  <button
                    type="button"
                    className={`cm-switch${isPrivate ? ' is-on' : ''}`}
                    role="switch"
                    aria-checked={isPrivate}
                    aria-label="Password protect this room"
                    onClick={() => { setIsPrivate(!isPrivate); setError(''); }}
                  >
                    <span />
                  </button>
                </div>

                {isPrivate && (
                  <label className="cm-field cm-field-inline">
                    <span className="cm-label">Password</span>
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => { setPassword(event.target.value); setError(''); }}
                      placeholder="At least 4 characters"
                      autoComplete="new-password"
                      maxLength={72}
                    />
                  </label>
                )}
              </div>

              {error && <p className="cm-error"><AlertCircle size={13} /> {error}</p>}

              <button type="submit" className="cm-go" disabled={busy}>
                {busy ? <><Loader2 size={15} className="cm-spin" /> Creating room…</> : <>Create and enter <ArrowRight size={15} /></>}
              </button>
            </form>

            <aside className="cm-aside" aria-label="Room preview">
              <span className="cm-aside-label">Preview</span>
              <div className="cm-preview">
                <div className="cm-preview-top">
                  <span className={`cm-preview-badge${isPrivate ? ' is-private' : ''}`}>
                    {isPrivate ? <Lock size={10} /> : <Globe size={10} />}
                    {isPrivate ? 'Private' : 'Public'}
                  </span>
                  <span className="cm-preview-template">{selectedTemplate.name}</span>
                </div>
                <h3 className="cm-preview-title">{title.trim() || 'Untitled room'}</h3>
                <p className="cm-preview-desc">
                  {description.trim() || 'No description yet — add one so people know what they are joining.'}
                </p>
                <div className="cm-preview-foot">
                  <code>{resolvedCode}</code>
                  <span className="cm-preview-people"><Users size={11} /> 1</span>
                </div>
              </div>

              <ul className="cm-checklist">
                <li>Edits sync live to everyone in the room</li>
                <li>Live preview updates as you type</li>
                <li>Export the whole project as a zip</li>
              </ul>
            </aside>
          </div>
        ) : (
          <div className="cm-panes is-single">
            <form className="cm-form" onSubmit={submitJoin} noValidate>
              <label className="cm-field">
                <span className="cm-label">Room code or invite link</span>
                <div className="cm-idwrap">
                  <Link2 size={14} />
                  <input
                    ref={firstFieldRef}
                    type="text"
                    value={joinId}
                    onChange={(event) => { setJoinId(event.target.value); setError(''); }}
                    placeholder="payments-refactor-4f2a"
                    maxLength={200}
                  />
                </div>
              </label>

              {error && <p className="cm-error"><AlertCircle size={13} /> {error}</p>}

              <button type="submit" className="cm-go is-alt">
                Enter room <ArrowRight size={15} />
              </button>

              <div className="cm-list">
                <div className="cm-list-head">
                  <span>Open rooms right now</span>
                  <span className="cm-count">{openRooms.length}</span>
                </div>

                {roomsLoading ? (
                  <p className="cm-list-empty">Looking for public rooms…</p>
                ) : openRooms.length === 0 ? (
                  <p className="cm-list-empty">Nothing is public at the moment. A private room still opens with its code.</p>
                ) : (
                  <ul>
                    {openRooms.slice(0, 8).map((room) => (
                      <li key={room.roomId}>
                        <button type="button" className="cm-row" onClick={() => enter(room.roomId)}>
                          <span className="cm-row-main">
                            <span className="cm-row-name">{room.title || room.roomId}</span>
                            <span className="cm-row-desc">
                              {room.description || `Room code · ${room.roomId}`}
                            </span>
                          </span>
                          <span className="cm-row-meta">
                            <span className="cm-row-peers"><Users size={11} /> {room.occupants || 0}</span>
                            <ArrowRight size={13} className="cm-row-go" />
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </form>
          </div>
        )}

        <p className="cm-foot">
          Just looking?{' '}
          <button type="button" className="cm-linkish" onClick={() => { navigate('/demo'); onClose(); }}>
            Open the demo room
          </button>{' '}
          — no account needed.
        </p>
      </div>
    </div>
  );
};

export default CreateJoinRoomModal;
