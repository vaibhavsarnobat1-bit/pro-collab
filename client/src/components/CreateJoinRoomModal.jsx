import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, LogIn, Users, Code, KeyRound, Sparkles, X, ArrowRight, CheckCircle2, AlertCircle, Loader2, Rocket, Terminal, Copy, Check } from 'lucide-react';

const CreateJoinRoomModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('create');
  const [groupName, setGroupName] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [customRoomId, setCustomRoomId] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalRef = useRef(null);
  const navigate = useNavigate();

  const presets = [
    { name: 'Pair Programming', lang: 'javascript', id: 'pair-prog-101', icon: Code, badgeColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
    { name: 'WebDev Frontend', lang: 'typescript', id: 'frontend-review', icon: Rocket, badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
    { name: 'Python Data Lab', lang: 'python', id: 'python-lab-404', icon: Terminal, badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  ];

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        modalRef.current?.querySelector('input, select')?.focus();
      }, 100);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const validateCreateForm = () => {
    const errors = {};
    if (!groupName.trim()) errors.groupName = 'Workspace / Room name is required';
    if (customRoomId.trim() && customRoomId.length < 3) errors.customRoomId = 'Room ID must be at least 3 characters';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateJoinForm = () => {
    const errors = {};
    if (!joinRoomId.trim()) errors.joinRoomId = 'Room ID or invite link is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!validateCreateForm()) return;
    setIsSubmitting(true);
    const finalRoomId = customRoomId.trim() || 'room_' + Date.now().toString(36);
    await new Promise(r => setTimeout(r, 400));
    navigate(`/workspace/${finalRoomId}`);
    onClose();
    setIsSubmitting(false);
  };

  const handleJoinGroup = async (e) => {
    e.preventDefault();
    if (!validateJoinForm()) return;
    setIsSubmitting(true);
    const cleanId = joinRoomId.trim().replace(/^.*\/workspace\//, '');
    await new Promise(r => setTimeout(r, 400));
    navigate(`/workspace/${cleanId}`);
    onClose();
    setIsSubmitting(false);
  };

  const handleQuickPreset = (preset) => {
    setGroupName(preset.name);
    setLanguage(preset.lang);
    setCustomRoomId(preset.id);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        ref={modalRef}
        className="w-full max-w-lg bg-[#111318] border border-white/10 rounded-2xl sm:rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.85)] backdrop-blur-2xl p-6 sm:p-8 relative overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Ambient background glows */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full bg-white/[0.04] border border-white/10 hover:border-white/20 transition-all duration-200 group z-20"
          aria-label="Close modal"
        >
          <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-6 relative z-10">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 flex-shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 id="modal-title" className="text-lg sm:text-xl font-bold text-white tracking-tight">Create or Join Workspace</h2>
            <p className="text-xs text-slate-400 mt-0.5">Launch a real-time collaborative developer room with Monaco Editor & Video</p>
          </div>
        </div>

        {/* Modal Tabs */}
        <div className="grid grid-cols-2 gap-1.5 bg-white/[0.04] p-1.5 rounded-xl border border-white/[0.08] mb-6 relative z-10">
          <button
            onClick={() => { setActiveTab('create'); setFormErrors({}); }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 ${
              activeTab === 'create'
                ? 'bg-white text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <PlusCircle className={`w-3.5 h-3.5 ${activeTab === 'create' ? 'text-slate-950' : 'text-slate-400'}`} />
            <span>Create Room</span>
          </button>

          <button
            onClick={() => { setActiveTab('join'); setFormErrors({}); }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 ${
              activeTab === 'join'
                ? 'bg-white text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className={`w-3.5 h-3.5 ${activeTab === 'join' ? 'text-slate-950' : 'text-slate-400'}`} />
            <span>Join Room</span>
          </button>
        </div>

        {/* Quick Presets */}
        {activeTab === 'create' && (
          <div className="mb-5 relative z-10">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Quick Room Presets:
            </p>
            <div className="grid grid-cols-3 gap-2">
              {presets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleQuickPreset(preset)}
                  className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] hover:border-indigo-500/40 text-left text-xs transition-all duration-200 group"
                >
                  <p className="font-semibold text-slate-200 group-hover:text-white truncate">{preset.name}</p>
                  <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${preset.badgeColor}`}>
                    {preset.lang}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab 1: Create Group Form */}
        {activeTab === 'create' ? (
          <form onSubmit={handleCreateGroup} className="space-y-4 relative z-10" noValidate>
            <div>
              <label htmlFor="groupName" className="block text-xs font-semibold text-slate-300 mb-1.5">Workspace / Project Name</label>
              <div className="relative">
                <input
                  id="groupName"
                  type="text"
                  value={groupName}
                  onChange={(e) => { setGroupName(e.target.value); if (formErrors.groupName) setFormErrors({...formErrors, groupName: ''}); }}
                  placeholder="e.g. Pro-Collab Pair Room"
                  className={`input-field ${formErrors.groupName ? 'input-field-error' : ''}`}
                  required
                  aria-invalid={!!formErrors.groupName}
                />
                <Code className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>
              {formErrors.groupName && (
                <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {formErrors.groupName}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="language" className="block text-xs font-semibold text-slate-300 mb-1.5">Primary Language</label>
              <div className="relative">
                <select
                  id="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="input-field appearance-none pr-10 bg-[#161b22] text-xs text-slate-200 cursor-pointer"
                >
                  <option value="javascript">JavaScript / React</option>
                  <option value="typescript">TypeScript</option>
                  <option value="python">Python</option>
                  <option value="html">HTML / Web</option>
                  <option value="css">CSS</option>
                  <option value="cpp">C++</option>
                  <option value="java">Java</option>
                  <option value="go">Go</option>
                  <option value="rust">Rust</option>
                </select>
                <Code className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>
            </div>

            <div>
              <label htmlFor="customRoomId" className="block text-xs font-semibold text-slate-300 mb-1.5">Custom Room Code (Optional)</label>
              <div className="relative">
                <input
                  id="customRoomId"
                  type="text"
                  value={customRoomId}
                  onChange={(e) => { setCustomRoomId(e.target.value); if (formErrors.customRoomId) setFormErrors({...formErrors, customRoomId: ''}); }}
                  placeholder="e.g. dev-room-101"
                  className={`input-field text-xs ${formErrors.customRoomId ? 'input-field-error' : ''}`}
                />
                <KeyRound className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-white hover:bg-slate-100 active:scale-[0.98] text-slate-950 font-bold py-3.5 rounded-xl shadow-lg shadow-white/5 transition-all duration-200 flex items-center justify-center gap-2 text-sm mt-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Launching Room...</span>
                </>
              ) : (
                <>
                  <span>Create Workspace & Enter</span>
                  <ArrowRight className="w-4 h-4 text-slate-950" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* Tab 2: Join Group Form */
          <form onSubmit={handleJoinGroup} className="space-y-4 relative z-10" noValidate>
            <div>
              <label htmlFor="joinRoomId" className="block text-xs font-semibold text-slate-300 mb-1.5">Enter Room ID or Invite Link</label>
              <div className="relative">
                <input
                  id="joinRoomId"
                  type="text"
                  value={joinRoomId}
                  onChange={(e) => { setJoinRoomId(e.target.value); if (formErrors.joinRoomId) setFormErrors({...formErrors, joinRoomId: ''}); }}
                  placeholder="e.g. dev-room-101 or full URL"
                  className={`input-field text-xs ${formErrors.joinRoomId ? 'input-field-error' : ''}`}
                  required
                  autoFocus
                />
                <LogIn className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 pointer-events-none" />
              </div>
              {formErrors.joinRoomId && (
                <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {formErrors.joinRoomId}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all duration-200 flex items-center justify-center gap-2 text-sm mt-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Joining...</span>
                </>
              ) : (
                <>
                  <span>Join Workspace Room</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Features hint */}
        <div className="mt-6 pt-4 border-t border-white/[0.08] relative z-10">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Instant Included Tools:
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
            <div className="flex items-center gap-2 p-2.5 bg-white/[0.02] rounded-xl border border-white/[0.06]">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Shared Monaco Editor</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 bg-white/[0.02] rounded-xl border border-white/[0.06]">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>WebRTC Video Call & Screen Share</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 bg-white/[0.02] rounded-xl border border-white/[0.06]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Live Team Chat</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 bg-white/[0.02] rounded-xl border border-white/[0.06]">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>Real-time Activity Audit</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CreateJoinRoomModal;