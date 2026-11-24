import React, { useMemo, useState } from 'react';
import { Crown, MessageSquare, Copy, Check, ShieldAlert, Users, Link2, Pencil, X, Loader2 } from 'lucide-react';
import { colorIndexFor, PRESENCE_COLORS } from '../lib/presence';
import '../styles/chat.css';

const initialsOf = (name = '') => {
  const parts = String(name).replace(/[^a-zA-Z0-9 _-]/g, ' ').trim().split(/[\s_-]+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const sinceLabel = (iso) => {
  if (!iso) return 'here now';
  const started = new Date(iso).getTime();
  if (Number.isNaN(started)) return 'here now';
  const minutes = Math.max(0, Math.round((Date.now() - started) / 60000));
  if (minutes < 1) return 'just joined';
  if (minutes < 60) return `${minutes}m in room`;
  const hours = Math.round(minutes / 60);
  return `${hours}h in room`;
};

const ParticipantsPanel = ({
  users = [],
  currentUser,
  socketId,
  roomMeta,
  roomLink,
  onCopyLink,
  onMessageUser,
  typingUsers = [],
  guestMode = false,
  onUpdateRoom,
  canEdit = false
}) => {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const people = useMemo(() => users.map((person) => {
    const isMe = person.socketId === socketId || person.username === currentUser?.username;
    return {
      ...person,
      isMe,
      isTyping: typingUsers.filter(Boolean).includes(person.username) && !isMe
    };
  }).sort((a, b) => {
    if (a.isHost !== b.isHost) return a.isHost ? -1 : 1;
    if (a.isMe !== b.isMe) return a.isMe ? -1 : 1;
    return String(a.username).localeCompare(String(b.username));
  }), [users, socketId, currentUser?.username, typingUsers]);

  const startEditing = () => {
    setDraftTitle(roomMeta?.title || '');
    setDraftDescription(roomMeta?.description || '');
    setEditing(true);
  };

  const saveDetails = async (event) => {
    event.preventDefault();
    if (!draftTitle.trim() || saving) return;
    setSaving(true);
    const ok = await onUpdateRoom?.({
      title: draftTitle.trim(),
      description: draftDescription.trim()
    });
    setSaving(false);
    if (ok) setEditing(false);
  };

  const copy = async () => {
    const ok = await onCopyLink?.();
    if (ok === false) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="pp-panel">
      <header className="pp-head">
        <div className="pp-head-copy">
          <h3 className="pp-title">People</h3>
          <p className="pp-sub">
            {people.length} in this room{roomMeta?.isPrivate ? ' · private' : ''}
          </p>
        </div>
        <span className="pp-count" title="People connected right now">
          <Users size={12} /> {people.length}
        </span>
      </header>

      {editing ? (
        <form className="pp-edit" onSubmit={saveDetails}>
          <label className="pp-edit-field">
            <span>Room name</span>
            <input
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value.slice(0, 80))}
              maxLength={80}
              autoFocus
            />
          </label>
          <label className="pp-edit-field">
            <span>Description</span>
            <textarea
              value={draftDescription}
              onChange={(event) => setDraftDescription(event.target.value.slice(0, 200))}
              rows={2}
              maxLength={200}
              placeholder="What is this room for?"
            />
          </label>
          <div className="pp-edit-actions">
            <button type="button" className="pp-edit-cancel" onClick={() => setEditing(false)}>
              <X size={12} /> Cancel
            </button>
            <button type="submit" className="pp-edit-save" disabled={saving || !draftTitle.trim()}>
              {saving ? <Loader2 size={12} className="pp-spin" /> : <Check size={12} />}
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      ) : (
        (roomMeta?.description || canEdit) && (
          <div className="pp-topic-row">
            <p className="pp-topic">
              {roomMeta?.description || 'No description yet.'}
            </p>
            {canEdit && (
              <button type="button" className="pp-action pp-action-edit" onClick={startEditing} title="Edit room details" aria-label="Edit room details">
                <Pencil size={12} />
              </button>
            )}
          </div>
        )
      )}

      <ul className="pp-list">
        {people.length === 0 ? (
          <li className="pp-empty">No one is connected right now.</li>
        ) : (
          people.map((person) => {
            const tint = PRESENCE_COLORS[colorIndexFor(person.username || 'anon')];
            return (
              <li key={person.socketId || person.username} className={`pp-row${person.isMe ? ' is-me' : ''}`}>
                <span className="pp-avatar" style={{ borderColor: tint.hex }} aria-hidden="true">
                  {initialsOf(person.username)}
                  <i className="pp-dot" />
                </span>

                <div className="pp-id">
                  <span className="pp-name">
                    {person.username}
                    {person.isMe && <em className="pp-you">you</em>}
                  </span>
                  <span className="pp-role">
                    {person.isHost ? <><Crown size={10} /> host</> : person.role || 'member'}
                    <span className="pp-sep">·</span>
                    {person.isTyping ? <em className="pp-typing">typing…</em> : sinceLabel(person.joinedAt)}
                  </span>
                </div>

                {!person.isMe && onMessageUser && (
                  <button
                    type="button"
                    className="pp-action"
                    onClick={() => onMessageUser(person.username)}
                    title={`Message ${person.username}`}
                    aria-label={`Message ${person.username}`}
                  >
                    <MessageSquare size={13} />
                  </button>
                )}
              </li>
            );
          })
        )}
      </ul>

      <div className="pp-invite">
        <div className="pp-invite-head">
          <Link2 size={12} />
          <span>Invite to this room</span>
        </div>
        <div className="pp-invite-row">
          <code>{roomMeta?.roomId || 'room'}</code>
          <button type="button" className="pp-copy" onClick={copy}>
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
        <p className="pp-invite-note">
          {roomMeta?.isPrivate
            ? 'Share the password separately — the link alone will not open a private room.'
            : 'Anyone with this link can join and edit alongside you.'}
        </p>
        {guestMode && (
          <p className="pp-guest"><ShieldAlert size={11} /> You are a guest — your handle lasts for this session.</p>
        )}
      </div>
    </div>
  );
};

export default ParticipantsPanel;
