import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { MessageSquare, Send, Smile, Lock, Globe, ChevronDown, CornerDownLeft } from 'lucide-react';
import { colorIndexFor, PRESENCE_COLORS } from '../lib/presence';
import '../styles/chat.css';

const EMOJI_LIST = ['👍', '🔥', '🚀', '🎉', '💡', '✅', '👏', '🙌', '🤝', '🐛', '👀', '⚡'];

const initialsOf = (name = '') => {
  const parts = String(name).replace(/[^a-zA-Z0-9 _-]/g, ' ').trim().split(/[\s_-]+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const timeOf = (message) => {
  if (message?.at) {
    const date = new Date(message.at);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }
  return message?.timestamp || '';
};

const dayKeyOf = (message) => {
  const date = message?.at ? new Date(message.at) : new Date();
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

const dayLabelOf = (message) => {
  const date = message?.at ? new Date(message.at) : new Date();
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const same = (a, b) => a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();

  if (same(date, today)) return 'Today';
  if (same(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
};

const nameOf = (person) => (typeof person === 'string' ? person : person?.username);

const GROUP_WINDOW_MS = 5 * 60 * 1000;

// Consecutive messages from the same author inside a five-minute window are
// rendered as one block, which is what makes a transcript readable instead of a
// wall of repeated names.
const buildRows = (thread) => {
  const rows = [];
  let lastDay = null;
  let previous = null;

  thread.forEach((message) => {
    const day = dayKeyOf(message);
    if (day !== lastDay) {
      rows.push({ type: 'day', key: `day-${day}-${rows.length}`, label: dayLabelOf(message) });
      lastDay = day;
      previous = null;
    }

    const at = message.at || 0;
    const sameAuthor = previous && previous.sender === message.sender;
    const closeInTime = previous && at && previous.at && at - previous.at < GROUP_WINDOW_MS;
    const grouped = Boolean(sameAuthor && (closeInTime || !at));

    rows.push({ type: 'message', key: message.id || `${message.sender}-${rows.length}`, message, grouped });
    previous = { ...message, at };
  });

  return rows;
};

const ChatPanel = ({
  messages = [],
  privateMessages = [],
  onSendMessage,
  onSendPrivateMessage,
  currentUser,
  activeUsers = [],
  typingUsers = [],
  onTypingStart,
  onTypingStop,
  directTo,
  onDirectConsumed
}) => {
  const [inputText, setInputText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [mode, setMode] = useState('group');
  const [recipient, setRecipient] = useState('');
  const [notice, setNotice] = useState('');
  const [atBottom, setAtBottom] = useState(true);
  const feedRef = useRef(null);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const typingSent = useRef(false);
  const typingTimer = useRef(null);

  const peers = useMemo(
    () => activeUsers.map(nameOf).filter((name) => name && name !== currentUser?.username),
    [activeUsers, currentUser?.username]
  );

  // Clicking "message" on someone in the People panel opens their thread here.
  useEffect(() => {
    if (!directTo) return;
    setMode('direct');
    setRecipient(directTo);
    onDirectConsumed?.();
  }, [directTo, onDirectConsumed]);

  useEffect(() => {
    if (mode === 'direct' && peers.length && (!recipient || !peers.includes(recipient))) {
      setRecipient(peers[0]);
    }
    if (mode === 'direct' && !peers.length) setRecipient('');
  }, [mode, peers, recipient]);

  const thread = useMemo(() => (mode === 'group'
    ? messages.filter((message) => !message.isPrivate)
    : privateMessages.filter((message) => (
      (message.sender === currentUser?.username && message.recipient === recipient)
      || (message.sender === recipient && message.recipient === currentUser?.username)
    ))), [mode, messages, privateMessages, recipient, currentUser?.username]);

  const rows = useMemo(() => buildRows(thread), [thread]);

  // Only follow new messages when the reader is already at the bottom; jumping
  // the transcript while someone scrolls back is the classic chat bug.
  useEffect(() => {
    if (atBottom) endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [rows.length, atBottom, mode, recipient]);

  useEffect(() => {
    setAtBottom(true);
  }, [mode, recipient]);

  const onScroll = () => {
    const node = feedRef.current;
    if (!node) return;
    const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
    setAtBottom(distance < 60);
  };

  const stopTyping = useCallback(() => {
    if (!typingSent.current) return;
    typingSent.current = false;
    onTypingStop?.();
  }, [onTypingStop]);

  const handleChange = (event) => {
    const value = event.target.value;
    setInputText(value);
    if (!value.trim()) {
      stopTyping();
      return;
    }
    if (!typingSent.current) {
      typingSent.current = true;
      onTypingStart?.();
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(stopTyping, 1800);
  };

  useEffect(() => () => clearTimeout(typingTimer.current), []);

  const send = (event) => {
    event?.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    if (mode === 'direct') {
      if (!recipient) {
        setNotice('Nobody else is in this room yet, so there is no one to message privately.');
        return;
      }
      onSendPrivateMessage?.(recipient, text);
    } else {
      onSendMessage?.(text);
    }

    setInputText('');
    setShowEmoji(false);
    setNotice('');
    setAtBottom(true);
    clearTimeout(typingTimer.current);
    stopTyping();
    inputRef.current?.focus();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  const insertEmoji = (emoji) => {
    setInputText((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  const typingLabel = typingUsers.filter(Boolean).slice(0, 3);

  return (
    <div className="cp-panel">
      <header className="cp-head">
        <div className="cp-head-copy">
          <h3 className="cp-title">{mode === 'group' ? 'Room chat' : 'Direct messages'}</h3>
          <p className="cp-sub">
            {mode === 'group'
              ? `${thread.length} message${thread.length === 1 ? '' : 's'} · visible to everyone here`
              : recipient ? `Private thread with @${recipient}` : 'Pick someone to message'}
          </p>
        </div>

        <div className="cp-modes" role="tablist" aria-label="Chat mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'group'}
            className={mode === 'group' ? 'is-on' : ''}
            onClick={() => { setMode('group'); setNotice(''); }}
            title="Room chat"
          >
            <Globe size={12} /> Room
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'direct'}
            className={mode === 'direct' ? 'is-on' : ''}
            onClick={() => { setMode('direct'); setNotice(''); }}
            title="Direct messages"
          >
            <Lock size={12} /> Direct
          </button>
        </div>
      </header>

      {mode === 'direct' && (
        <div className="cp-dmbar">
          <label className="cp-dmbar-label" htmlFor="cp-peer">To</label>
          <div className="cp-selectwrap">
            <select
              id="cp-peer"
              className="cp-peer-select"
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
            >
              {peers.length === 0 ? <option value="">No one else here yet</option> : null}
              {peers.map((name, index) => (
                <option key={name} value={name}>{name}{index === 0 ? ' · online' : ''}</option>
              ))}
            </select>
            <ChevronDown size={13} className="cp-selectwrap-icon" />
          </div>
        </div>
      )}

      <div className="cp-feed" ref={feedRef} onScroll={onScroll}>
        {rows.length === 0 ? (
          <div className="cp-empty">
            <span className="cp-empty-icon"><MessageSquare size={19} /></span>
            <strong>{mode === 'direct' ? 'No direct messages yet' : 'Start the conversation'}</strong>
            <p>
              {mode === 'direct'
                ? 'Direct messages are delivered only to the person you pick.'
                : 'Everyone in this room sees what you post here.'}
            </p>
          </div>
        ) : (
          rows.map((row) => {
            if (row.type === 'day') {
              return (
                <div className="cp-day" key={row.key}>
                  <span>{row.label}</span>
                </div>
              );
            }

            const { message, grouped } = row;
            const isMe = message.sender === currentUser?.username;
            const tint = PRESENCE_COLORS[colorIndexFor(message.sender || 'anon')];

            return (
              <article
                key={row.key}
                className={`cp-msg${grouped ? ' is-grouped' : ''}${isMe ? ' is-me' : ''}`}
              >
                {!grouped && (
                  <span className="cp-avatar" style={{ borderColor: tint.hex }} aria-hidden="true">
                    {initialsOf(message.sender)}
                  </span>
                )}
                <div className="cp-msg-body">
                  {!grouped && (
                    <div className="cp-meta">
                      <b>{isMe ? 'You' : message.sender}</b>
                      {(message.isPrivate || mode === 'direct') && (
                        <span className="cp-tag-dm"><Lock size={9} /> dm</span>
                      )}
                      <time>{timeOf(message)}</time>
                    </div>
                  )}
                  <p className="cp-text">{message.text}</p>
                </div>
              </article>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {!atBottom && (
        <button type="button" className="cp-jump" onClick={() => { setAtBottom(true); endRef.current?.scrollIntoView({ block: 'end' }); }}>
          Newest messages
        </button>
      )}

      {typingLabel.length > 0 && mode === 'group' && (
        <div className="cp-typing" aria-live="polite">
          <span className="cp-typing-dots" aria-hidden="true"><i /><i /><i /></span>
          {typingLabel.length === 1
            ? `${typingLabel[0]} is typing`
            : `${typingLabel.slice(0, -1).join(', ')} and ${typingLabel.at(-1)} are typing`}
        </div>
      )}

      {showEmoji && (
        <div className="cp-emoji" role="listbox" aria-label="Emoji">
          {EMOJI_LIST.map((emoji) => (
            <button key={emoji} type="button" onClick={() => insertEmoji(emoji)} aria-label={`Insert ${emoji}`}>
              {emoji}
            </button>
          ))}
        </div>
      )}

      {notice && <p className="cp-notice">{notice}</p>}

      <form className="cp-compose" onSubmit={send}>
        <div className="cp-inputwrap">
          <textarea
            ref={inputRef}
            className="cp-input"
            value={inputText}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={stopTyping}
            placeholder={mode === 'direct' ? `Message @${recipient || '…'}` : 'Message the room'}
            rows={1}
            maxLength={4000}
            aria-label="Chat message"
          />
          <div className="cp-compose-row">
            <button
              type="button"
              className={`cp-mini${showEmoji ? ' is-on' : ''}`}
              onClick={() => setShowEmoji((value) => !value)}
              aria-label="Insert emoji"
              aria-expanded={showEmoji}
            >
              <Smile size={15} />
            </button>
            <span className="cp-counter">
              {inputText.length > 3400 ? `${inputText.length}/4000` : <><CornerDownLeft size={10} /> Enter to send</>}
            </span>
            <button type="submit" className="cp-send" disabled={!inputText.trim()} aria-label="Send message">
              <Send size={14} />
              <span>Send</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ChatPanel;
