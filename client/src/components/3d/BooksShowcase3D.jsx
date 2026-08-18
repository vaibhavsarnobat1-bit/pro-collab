import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Code2, Video, MessageSquare, ShieldAlert, Sparkles, Layers, ArrowRight, Play, CheckCircle, Users, Monitor, Zap, Shield } from 'lucide-react';
import ScrollReveal from '../ScrollReveal';
import ParticleBackground from '../ParticleBackground';

const BOOK_ITEMS = [
  {
    id: 'editor',
    title: 'Monaco Shared Editor',
    subtitle: 'Real-time WebSocket Code Sync',
    color: 'from-indigo-600 via-indigo-500 to-purple-600',
    borderColor: 'border-indigo-500/40',
    icon: Code2,
    badge: 'Socket.io',
    lines: [
      '// Real-Time Delta Synchronization',
      'function calculateTeamSynergy(members) {',
      '  return members.reduce((sum, m) => sum + m.commits, 0);',
      '}',
      'console.log("Pro-Collab Sync Active...");'
    ],
    features: ['Multi-cursor live tracking', 'Language selector (JS, Python, C++)', 'Activity feed line logs'],
    stats: { latency: '<20ms', sync: 'Delta', engine: 'Monaco' }
  },
  {
    id: 'webrtc',
    title: 'Google Meet Suite',
    subtitle: 'HD Video & Screen Sharing',
    color: 'from-purple-600 via-pink-600 to-rose-500',
    borderColor: 'border-purple-500/40',
    icon: Video,
    badge: 'WebRTC P2P',
    lines: [
      '⚡ Presenter Screen Stream Active',
      '🎙️ Multi-peer Noise Cancellation',
      '🎥 HD Video Grid Layout',
      '👥 Room Occupancy Management'
    ],
    features: ['Google Meet style layout', 'One-click screen sharing', 'Mic & camera toggle controls'],
    stats: { stream: '1080p HD', p2p: 'Mesh', audio: 'Opus HD' }
  },
  {
    id: 'chat',
    title: 'Team Chat & Feed',
    subtitle: 'Channels, Emojis & Timestamps',
    color: 'from-teal-600 via-emerald-500 to-cyan-500',
    borderColor: 'border-teal-500/40',
    icon: MessageSquare,
    badge: 'Instant Sync',
    lines: [
      '#general • Alex: "Merged feature PR!"',
      '#dev-talk • Sarah: "Joined video call 👍"',
      '#general • You: "Testing line 12 edit"'
    ],
    features: ['Dedicated channels (#general, #dev-talk)', 'Emoji quick picker', 'Live Activity Feed: "Who changed what"'],
    stats: { speed: 'Instant', audit: 'Real-time', reactions: 'Live' }
  },
  {
    id: 'admin',
    title: 'Admin Control Portal',
    subtitle: 'System Metrics & User Management',
    color: 'from-amber-600 via-orange-500 to-yellow-500',
    borderColor: 'border-amber-500/40',
    icon: ShieldAlert,
    badge: 'JWT Protected',
    lines: [
      '📊 Total Registered Users: Active',
      '🌐 Active Rooms Map: Operational',
      '🛡️ Role Management & User Control'
    ],
    features: ['Role-based access control', 'User directory management', 'Real-time room occupancy'],
    stats: { auth: 'JWT 256', access: 'RBAC', store: 'Hybrid DB' }
  }
];

const BooksShowcase3D = ({ onSelectFeature }) => {
  const [activeBookId, setActiveBookId] = useState('editor');
  const [isHovering, setIsHovering] = useState(false);
  const bookContainerRef = useRef(null);

  const activeBook = BOOK_ITEMS.find((b) => b.id === activeBookId) || BOOK_ITEMS[0];

  // Add mouse tracking for 3D tilt effect
  useEffect(() => {
    const container = bookContainerRef.current;
    if (!container) return;

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = ((y - centerY) / centerY) * -8;
      const rotateY = ((x - centerX) / centerX) * 8;
      
      container.style.transform = `perspective(2000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    };

    const handleMouseLeave = () => {
      container.style.transform = 'perspective(2000px) rotateX(0deg) rotateY(0deg)';
      container.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
    };

    const handleMouseEnter = () => {
      container.style.transition = 'transform 0.1s linear';
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, []);

  return (
    <div className="w-full py-8 px-4 flex flex-col items-center relative">
      {/* Particle Background */}
      <ParticleBackground 
        particleCount={25} 
        color="rgba(99, 102, 241, 0.3)" 
        size={{ min: 1, max: 4 }}
        speed={0.2}
        connectDistance={120}
        className="-z-10"
      />
      
      {/* Floating Orbs */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[200px] animate-blob" style={{ animationDuration: '20s' }} />
        <div className="absolute top-1/2 right-1/4 w-[250px] h-[250px] bg-purple-500/10 rounded-full blur-[200px] animate-blob" style={{ animationDuration: '25s', animationDelay: '-5s' }} />
        <div className="absolute bottom-1/4 left-1/2 w-[200px] h-[200px] bg-teal-500/10 rounded-full blur-[200px] animate-blob" style={{ animationDuration: '18s', animationDelay: '-10s' }} />
      </div>

      {/* Top Selector Tabs */}
      <ScrollReveal direction="up" delay={100} className="w-full max-w-5xl">
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 backdrop-blur-md shadow-2xl">
          {BOOK_ITEMS.map((book, index) => {
            const Icon = book.icon;
            const isActive = book.id === activeBookId;
            return (
              <button
                key={book.id}
                onClick={() => setActiveBookId(book.id)}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 overflow-hidden ${
                  isActive
                    ? `bg-gradient-to-r ${book.color} text-white shadow-lg shadow-indigo-500/20 scale-105 z-10`
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
                style={{ 
                  transitionDelay: `${index * 50}ms`,
                  zIndex: isActive ? 10 : 1
                }}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span>{book.title}</span>
                </span>
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </ScrollReveal>

      {/* 3D Books Stage Area */}
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: 3D Book Showcase Perspective Container */}
        <ScrollReveal direction="left" delay={200} duration={1000} className="lg:col-span-6">
          <div 
            ref={bookContainerRef}
            className="relative perspective-3000 py-6 flex justify-center"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            <div className="book-container relative w-80 h-[450px] preserve-3d animate-float-3d cursor-pointer group glow-3d">
              
              {/* Book Spine (3D Depth) */}
              <div className="book-spine absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-r border-slate-800 rounded-l-md flex items-center justify-center shadow-inner">
                <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-widest -rotate-90 whitespace-nowrap">
                  PRO-COLLAB 3D
                </span>
              </div>

              {/* Book Pages Stack (Inside content revealed when opened) */}
              <div className="book-pages-stack absolute inset-2 bg-gradient-to-br from-slate-900 to-slate-950 rounded-r-xl border border-slate-800 p-5 shadow-2xl flex flex-col justify-between overflow-hidden transition-all duration-500 group-hover:shadow-indigo-500/10">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-[11px] font-mono text-indigo-400 font-bold">{activeBook.badge}</span>
                    <span className="text-[10px] text-slate-500">Vol. 1 • 2026</span>
                  </div>

                  <div className="font-mono text-xs text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800/80 space-y-1">
                    {activeBook.lines.map((line, idx) => (
                      <div key={idx} className="text-[11px] text-slate-300 truncate animate-slide-right" style={{ animationDelay: `${idx * 100}ms` }}>
                        {line}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-slate-800">
                  <div className="text-[11px] font-bold text-slate-400 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    Included Capabilities:
                  </div>
                  {activeBook.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-[11px] text-slate-300 animate-slide-right" style={{ animationDelay: `${idx * 100}ms` }}>
                      <CheckCircle className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Book Front Cover (Opens with 3D RotateY transform) */}
              <div
                className={`book-cover book-cover-open absolute inset-0 rounded-r-xl bg-gradient-to-br ${activeBook.color} p-6 flex flex-col justify-between shadow-2xl border ${activeBook.borderColor} z-20 preserve-3d transition-all duration-700 ease-out group-hover:rotate-y-[-140deg]`}
                style={{ transformOrigin: 'left center' }}
              >
                <div className="flex justify-between items-start">
                  <div className="p-3 bg-black/30 rounded-2xl backdrop-blur-md border border-white/10 animate-scale-in" style={{ animationDelay: '200ms' }}>
                    <activeBook.icon className="w-8 h-8 text-white" />
                  </div>
                  <span className="px-2.5 py-1 text-[10px] font-extrabold uppercase bg-black/40 text-white rounded-full backdrop-blur-sm border border-white/10">
                    {activeBook.badge}
                  </span>
                </div>

                <div className="text-center">
                  <span className="text-xs font-semibold text-white/80 uppercase tracking-wider block animate-slide-up" style={{ animationDelay: '300ms' }}>Interactive Feature</span>
                  <h3 className="text-2xl font-extrabold text-white mt-1 leading-tight tracking-tight animate-slide-up" style={{ animationDelay: '400ms' }}>{activeBook.title}</h3>
                  <p className="text-xs text-white/90 mt-2 font-medium leading-relaxed animate-slide-up" style={{ animationDelay: '500ms' }}>{activeBook.subtitle}</p>
                </div>

                <div className="pt-4 border-t border-white/20 flex items-center justify-between text-white/90 text-xs font-semibold">
                  <span className="animate-slide-left" style={{ animationDelay: '600ms' }}>Hover / Click to explore</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform animate-slide-right" style={{ animationDelay: '700ms' }} />
                </div>
              </div>

              {/* Page edge lines for 3D depth effect */}
              <div className="absolute left-2 top-8 bottom-8 w-1 bg-gradient-to-b from-transparent via-slate-700/30 to-transparent pointer-events-none" />
              <div className="absolute left-4 top-10 bottom-10 w-0.5 bg-gradient-to-b from-transparent via-slate-700/20 to-transparent pointer-events-none" />
              
            </div>
          </div>
        </ScrollReveal>

        {/* Right Side: Detailed Feature Explanation & Interactive Specs */}
        <ScrollReveal direction="right" delay={300} duration={1000} className="lg:col-span-6">
          <div className="space-y-6 text-left h-full">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-bold animate-fade-in">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span>3D WORKSPACE ARCHITECTURE</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight animate-slide-up" style={{ animationDelay: '200ms' }}>
              {activeBook.title}
            </h2>

            <p className="text-sm text-slate-300 leading-relaxed animate-slide-up" style={{ animationDelay: '300ms' }}>
              Designed for high-performance engineering teams. Real-time document synchronization with zero lag, integrated Google Meet video calling, and live activity tracking.
            </p>

            {/* Stats Bar */}
            <div className="grid grid-cols-3 gap-4 pt-4 animate-slide-up" style={{ animationDelay: '400ms' }}>
              {Object.entries(activeBook.stats).map(([key, value], idx) => (
                <div key={key} className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl text-center animate-scale-in" style={{ animationDelay: `${500 + idx * 100}ms` }}>
                  <div className="text-lg font-extrabold text-white gradient-text">{value}</div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">{key}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 animate-slide-up" style={{ animationDelay: '500ms' }}>
              {activeBook.features.map((feat, idx) => (
                <div key={idx} className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center gap-3 hover:border-indigo-500/50 transition-all animate-scale-in" style={{ animationDelay: `${600 + idx * 100}ms` }}>
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                  <span className="text-xs font-semibold text-slate-200">{feat}</span>
                </div>
              ))}
            </div>

            {onSelectFeature && (
              <div className="pt-6 animate-slide-up" style={{ animationDelay: '700ms' }}>
                <button
                  onClick={() => onSelectFeature(activeBook.id)}
                  className="group relative px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold transition-all shadow-xl shadow-indigo-600/25 flex items-center gap-2 overflow-hidden magnetic-btn"
                >
                  <span className="relative z-10">Launch Workspace Demo</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform relative z-10" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                </button>
              </div>
            )}
          </div>
        </ScrollReveal>

      </div>

      <style jsx global>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); }
          25% { transform: translate(3%, -5%) scale(1.1) rotate(90deg); }
          50% { transform: translate(-5%, 3%) scale(0.9) rotate(180deg); }
          75% { transform: translate(2%, 4%) scale(1.05) rotate(270deg); }
        }
        .animate-blob { animation: blob ease-in-out infinite; }
        .preserve-3d { transform-style: preserve-3d; }
        .perspective-3000 { perspective: 3000px; }
        .group-hover\\:rotate-y-\\[-140deg\\]:hover { transform: rotateY(-140deg); }
      `}</style>
    </div>
  );
};

export default BooksShowcase3D;