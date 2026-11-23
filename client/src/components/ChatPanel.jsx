import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MessageSquare, Send, Smile, Lock, Globe, ShieldAlert } from 'lucide-react';
import { colorIndexFor, PRESENCE_COLORS } from '../lib/presence';
import '../styles/rail.css';

const EMOJI_LIST = ['👍', '🔥', '🚀', '🎉', '💡', '✅', '👏', '🙌', '🤝', '🐛'];

const formatTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 5);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const nameOf = (person) => (typeof person === 'string' ? person : person?.username);

const ChatPanel = ({
  messages = [],
  privateMessages = [],
  onSendMessage,
  onSendPrivateMessage,
  currentUser,
  activeUsers = []
}) => {
  const [inputText, setInputText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [mode, setMode] = useState('group');
  const [recipient, setRecipient] = useState('');
  const [notice, setNotice] = useState('');
  const endRef = useRef(null);
  const inputRef = useRef(null);

  const peers = useMemo(
    () => activeUsers.map(nameOf).filter((name) => name && name !== currentUser?.username),
    [activeUsers, currentUser?.username]
  );

  useEffect(() => {
    if (mode === 'direct' && peers.length && (!recipient || !peers.includes(recipient))) {
      setRecipient(peers[0]);
    }
  }, [mode, peers, recipient]);

  const thread = mode === 'group'
    ? messages.filter((message) => !message.isPrivate)
    : privateMessages.filter((message) =>
      (message.sender === currentUser?.username && message.recipient === recipient) ||
      (message.sender === recipient && message.recipient === currentUser?.username));

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [thread.length, mode, recipient]);

  const send = (event) => {
    event.preventDefault();
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
  };

  return (
    <div className="cp-panel">
      <div className="cp-head">
        <div className="cp-modes" role="tablist" aria-label="Chat mode">
          <button
            role="tab"
            aria-selected={mode === 'group'}
            className={mode === 'group' ? 'is-on' : ''}
            onClick={() => setMode('group')}
          >
            <Globe size={12} /> Room
          </button>
          <button
            role="tab"
            aria-selected={mode === 'direct'}
            className={`is-dm ${mode === 'direct' ? 'is-on' : ''}`}
            onClick={() => setMode('direct')}
          >
            <Lock size={12} /> Direct
          </button>
        </div>

        {mode === 'direct' && (
          <select
            className="cp-peer-select"
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
            aria-label="Direct message recipient"
          >
            {peers.length === 0 ? <option value="">No one else here</option> : null}
            {peers.map((name) => (
              <option key={name} value={name}>@{name}</option>
            ))}
          </select>
        )}
      </div>

      {mode === 'direct' && recipient && (
        <div className="cp-dm-note">
          <span><ShieldAlert size={11} style={{ display: 'inline', verticalAlign: -2 }} /> Private thread with <strong>@{recipient}</strong></span>
          <span>room peers cannot read this</span>
        </div>
      )}

      <div className="cp-feed">
        {thread.length === 0 ? (
          <div className="cp-empty">
            <MessageSquare size={22} />
            <strong>{mode === 'direct' ? `Nothing sent to @${recipient || 'them'} yet` : 'The room has not spoken yet'}</strong>
            <span>{mode === 'direct' ? 'Direct messages stay between the two of you.' : 'Messages are kept in memory for this room only.'}</span>
          </div>
        ) : (
          thread.map((message, index) => {
            const isMe = message.sender === currentUser?.username;
            const tint = PRESENCE_COLORS[colorIndexFor(message.sender || 'anon')];
            return (
              <div
                key={message.id || `${message.timestamp}-${index}`}
                className={`cp-row ${isMe ? 'is-me' : ''} ${message.isPrivate || mode === 'direct' ? 'is-dm' : ''}`}
              >
                <div className="cp-meta">
                  {isMe ? (
                    <b>You</b>
                  ) : (
                    <>
                      <i
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 2,
                          background: tint.hex,
                          display: 'inline-block'
                        }}
                      />
                      <b>{message.sender}</b>
                    </>
                  )}
                  {(message.isPrivate || mode === 'direct') && (
                    <span className="cp-tag-dm"><Lock size={9} /> dm</span>
                  )}
                  <span>{formatTime(message.timestamp)}</span>
                </div>
                <div className="cp-bubble">{message.text}</div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {showEmoji && (
        <div className="cp-emoji">
          {EMOJI_LIST.map((emoji) => (
            <button key={emoji} type="button" onClick={() => { setInputText((prev) => prev + emoji); inputRef.current?.focus(); }}>
              {emoji}
            </button>
          ))}
        </div>
      )}

      {notice && <div className="cp-dm-note" style={{ background: 'rgba(144,144,144,0.1)', color: 'var(--bad)' }}>{notice}</div>}

      <form className="cp-compose" onSubmit={send}>
        <button
          type="button"
          className={`cp-mini ${showEmoji ? 'is-on' : ''}`}
          onClick={() => setShowEmoji((value) => !value)}
          aria-label="Insert emoji"
        >
          <Smile size={15} />
        </button>
        <input
          ref={inputRef}
          className="cp-input"
          value={inputText}
          onChange={(event) => setInputText(event.target.value)}
          placeholder={mode === 'direct' ? `Message @${recipient || '…'}` : 'Message the room'}
          maxLength={4000}
          aria-label="Chat message"
        />
        <button type="submit" className="cp-send" disabled={!inputText.trim()} aria-label="Send message">
          <Send size={14} />
        </button>
      </form>
    </div>
  );
};

export default ChatPanel;
