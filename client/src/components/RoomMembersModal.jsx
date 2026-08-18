import React, { useState } from 'react';
import { Users, X, Copy, Check, Share2, Video, ShieldCheck, UserCheck, Radio, Sparkles, Link2 } from 'lucide-react';

const RoomMembersModal = ({ isOpen, onClose, roomId, activeUsers, onStartCall }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const roomLink = `${window.location.origin}/workspace/${roomId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(roomLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Fallback if activeUsers is empty or single user
  const displayUsers = activeUsers && activeUsers.length > 0 
    ? activeUsers 
    : [{ username: 'You (Current User)', role: 'Owner', socketId: 'local' }];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-[#111318] border border-white/10 rounded-2xl sm:rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.85)] overflow-hidden relative animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#161b22]/90 px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Group Members & Invite</h2>
              <p className="text-xs text-slate-400">Room Code: <span className="font-mono text-indigo-300 font-bold">{roomId}</span></p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Quick Share Link Box */}
          <div className="p-4 rounded-2xl bg-indigo-500/[0.06] border border-indigo-500/20 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-indigo-300">
              <span className="flex items-center gap-1.5">
                <Link2 className="w-4 h-4 text-indigo-400" />
                Share Invite Link to Everyone
              </span>
              <span className="text-[10px] bg-indigo-500/20 px-2 py-0.5 rounded text-indigo-300 font-mono">PUBLIC JOIN</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={roomLink}
                className="flex-1 bg-white/[0.04] border border-white/10 text-xs font-mono text-slate-300 px-3.5 py-2.5 rounded-xl outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Members List Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                Connected Group Members ({displayUsers.length})
              </span>
              <span className="text-[11px] text-slate-500 font-normal">Real-time occupancy</span>
            </div>

            <div className="space-y-2.5">
              {displayUsers.map((u, idx) => {
                const username = typeof u === 'string' ? u : u.username || `User ${idx + 1}`;
                const role = typeof u === 'object' && u.role ? u.role : (idx === 0 ? 'Group Admin' : 'Member');

                return (
                  <div
                    key={idx}
                    className="p-3 bg-white/[0.02] rounded-2xl border border-white/[0.06] flex items-center justify-between hover:border-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-extrabold flex items-center justify-center border border-white/10 shadow-md">
                        {username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{username}</span>
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5 block capitalize">
                          {role} • Active Sockets
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        Active on Web
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Actions Footer inside Modal */}
          <div className="pt-2 flex items-center justify-between border-t border-white/[0.08]">
            <span className="text-xs text-slate-400">Want to start a video call with everyone?</span>
            <button
              onClick={() => {
                onClose();
                if (onStartCall) onStartCall();
              }}
              className="px-4 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Video className="w-4 h-4 text-purple-300 animate-pulse" />
              <span>Start Group Call</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default RoomMembersModal;
