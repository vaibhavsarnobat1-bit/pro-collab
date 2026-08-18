import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Smile,
  User,
  Users,
  Lock,
  Globe,
  ChevronDown,
  Sparkles,
  ShieldAlert
} from 'lucide-react';

const EMOJI_LIST = ['👍', '🔥', '🚀', '❤️', '🎉', '💻', '💡', '✅', '😂', '👏'];

const ChatPanel = ({
  messages = [],
  privateMessages = [],
  onSendMessage,
  onSendPrivateMessage,
  currentUser,
  activeUsers = []
}) => {
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [chatMode, setChatMode] = useState('group'); // 'group' | 'direct'
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  // Other connected users (excluding self)
  const peerUsers = activeUsers.filter(
    (u) => (typeof u === 'string' ? u : u.username) !== currentUser?.username
  );

  // Auto-select first peer when switching to direct message mode
  useEffect(() => {
    if (chatMode === 'direct' && peerUsers.length > 0 && !selectedRecipient) {
      const firstPeer = typeof peerUsers[0] === 'string' ? peerUsers[0] : peerUsers[0].username;
      setSelectedRecipient(firstPeer);
    }
  }, [chatMode, peerUsers, selectedRecipient]);

  // Filter messages based on active mode
  const displayedMessages = chatMode === 'group'
    ? messages.filter((m) => !m.isPrivate)
    : privateMessages.filter(
        (m) =>
          (m.sender === currentUser?.username && m.recipient === selectedRecipient) ||
          (m.sender === selectedRecipient && m.recipient === currentUser?.username)
      );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayedMessages, chatMode]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    if (chatMode === 'direct') {
      if (!selectedRecipient) {
        alert('Please select a member to send a private direct message.');
        return;
      }
      if (onSendPrivateMessage) {
        onSendPrivateMessage(selectedRecipient, inputText.trim());
      }
    } else {
      if (onSendMessage) {
        onSendMessage(inputText.trim());
      }
    }

    setInputText('');
    setShowEmojiPicker(false);
  };

  const addEmoji = (emoji) => {
    setInputText((prev) => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1117] rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden select-none">
      
      {/* Header & Mode Switcher */}
      <div className="bg-[#111620] px-3.5 py-2.5 border-b border-white/[0.08] flex items-center justify-between gap-2 shrink-0">
        
        {/* Mode Toggle Tabs */}
        <div className="flex items-center gap-1 bg-[#080b11] p-1 rounded-xl border border-white/[0.08]">
          <button
            onClick={() => setChatMode('group')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              chatMode === 'group'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span># Group Chat</span>
          </button>

          <button
            onClick={() => setChatMode('direct')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              chatMode === 'direct'
                ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>1-on-1 DM</span>
          </button>
        </div>

        {/* Recipient Dropdown in Direct Message Mode */}
        {chatMode === 'direct' && (
          <div className="flex items-center gap-1">
            <select
              value={selectedRecipient}
              onChange={(e) => setSelectedRecipient(e.target.value)}
              className="bg-[#161b24] border border-purple-500/40 text-purple-200 text-xs font-semibold rounded-lg px-2 py-1 outline-none cursor-pointer max-w-[130px] truncate"
            >
              {peerUsers.length === 0 ? (
                <option value="">No peers online</option>
              ) : (
                peerUsers.map((u) => {
                  const name = typeof u === 'string' ? u : u.username;
                  return (
                    <option key={name} value={name} className="bg-[#121620] text-white">
                      @{name}
                    </option>
                  );
                })
              )}
            </select>
          </div>
        )}
      </div>

      {/* Direct Message Header Notice */}
      {chatMode === 'direct' && (
        <div className="px-3.5 py-1.5 bg-purple-500/10 border-b border-purple-500/20 flex items-center justify-between text-[11px] text-purple-300 font-semibold">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-purple-400" />
            <span>Private Chat with <strong className="text-white">@{selectedRecipient || 'Member'}</strong></span>
          </div>
          <span className="text-[10px] text-purple-400/80">Only you & @{selectedRecipient || 'Member'} can see</span>
        </div>
      )}

      {/* Messages Feed */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2.5 min-h-[140px] select-text">
        {displayedMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-6">
            <MessageSquare className="w-7 h-7 text-slate-600 mb-1.5 opacity-50" />
            <span className="text-xs font-semibold text-slate-400">
              {chatMode === 'direct'
                ? `No private messages with @${selectedRecipient || 'member'}`
                : 'No group messages yet'}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5">
              {chatMode === 'direct' ? 'Say hi in 1-on-1 private chat!' : 'Start the discussion with the room!'}
            </span>
          </div>
        ) : (
          displayedMessages.map((msg, index) => {
            const isMe = msg.sender === currentUser?.username;
            return (
              <div
                key={msg.id || index}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-0.5`}
              >
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium px-1">
                  <span className="font-bold text-slate-300">{isMe ? 'You' : msg.sender}</span>
                  {msg.isPrivate && (
                    <span className="text-purple-400 text-[9px] font-semibold flex items-center gap-0.5">
                      <Lock className="w-2.5 h-2.5" /> Direct
                    </span>
                  )}
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                </div>

                <div
                  className={`px-3 py-2 rounded-2xl max-w-[85%] text-xs leading-relaxed shadow-md break-words ${
                    isMe
                      ? msg.isPrivate
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-br-none'
                        : 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-br-none'
                      : 'bg-[#161b24] text-slate-100 border border-white/[0.08] rounded-bl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Emoji Picker Popup */}
      {showEmojiPicker && (
        <div className="p-2 bg-[#0a0d14] border-t border-white/[0.08] grid grid-cols-5 gap-1 animate-in fade-in slide-in-from-bottom-2">
          {EMOJI_LIST.map((emoji) => (
            <button
              key={emoji}
              onClick={() => addEmoji(emoji)}
              className="p-1.5 hover:bg-white/[0.08] rounded text-sm transition-colors flex items-center justify-center cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Chat Input Bar */}
      <form
        onSubmit={handleSend}
        className="p-2.5 bg-[#111620] border-t border-white/[0.08] flex items-center gap-2 shrink-0"
      >
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className={`p-2 rounded-xl transition-colors cursor-pointer ${
            showEmojiPicker
              ? 'bg-indigo-600/30 text-indigo-300'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
          }`}
          title="Pick Emoji"
        >
          <Smile className="w-4 h-4" />
        </button>

        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            chatMode === 'direct'
              ? `Private message to @${selectedRecipient || 'member'}...`
              : 'Message #group chat (press Enter to send)...'
          }
          className="flex-1 bg-[#080b11] border border-white/[0.1] focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none transition-all"
        />

        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl transition-all shadow-md shadow-indigo-600/30 shrink-0 cursor-pointer"
          title="Send Message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

    </div>
  );
};

export default ChatPanel;
