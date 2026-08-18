import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CreateJoinRoomModal from '../components/CreateJoinRoomModal';
import ScrollReveal from '../components/ScrollReveal';
import DeveloperBackgroundVideo from '../components/DeveloperBackgroundVideo';
import {
  Code2, Video, MessageSquare, ShieldAlert,
  PlusCircle, ArrowRight, Check,
  Monitor, Shield, Play,
  RefreshCw, X, Eye, EyeOff, AlertCircle,
  Zap, Cpu, Terminal, Lock, Globe, Sparkles,
  Layers, Share2, Mic
} from 'lucide-react';

/* ─── Google G icon ─── */
const GoogleG = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

const HomePage = () => {
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('editor');
  const [activeCodeLang, setActiveCodeLang] = useState('javascript');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPass, setShowLoginPass] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLaunchDemo = () => navigate('/workspace/demo-room');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    if (!loginUsername || !loginPassword) {
      setLoginError('Please fill in all fields.');
      return;
    }
    setLoginLoading(true);
    const result = await login(loginUsername, loginPassword);
    setLoginLoading(false);
    if (result.success) {
      setIsLoginModalOpen(false);
      navigate(result.user?.role === 'admin' ? '/admin-dashboard' : '/workspace');
    } else {
      setLoginError(result.message);
    }
  };

  const closeLoginModal = () => {
    setIsLoginModalOpen(false);
    setLoginError('');
    setLoginUsername('');
    setLoginPassword('');
  };

  /* ─── Tech Stack Badges ─── */
  const techStack = [
    'Monaco Editor',
    'WebRTC Video P2P',
    'Socket.io Delta Sync',
    'React 18',
    'Node.js & Express',
    'Tailwind CSS'
  ];

  /* ─── Technical Architecture Metrics ─── */
  const techSpecs = [
    { value: '< 20ms', label: 'Delta Sync Latency', icon: Zap, detail: 'WebSocket character-level sync' },
    { value: '1080p HD', label: 'WebRTC Mesh Video', icon: Video, detail: 'Peer-to-peer audio & screen share' },
    { value: '10+ Langs', label: 'Monaco Code Engine', icon: Code2, detail: 'JS, TS, Python, C++, Java, Rust' },
    { value: '100% Free', label: 'Open Source & Local', icon: Shield, detail: 'Zero paywalls, self-hostable' },
  ];

  /* ─── Core Feature Cards ─── */
  const features = [
    {
      icon: Code2,
      title: 'Shared Monaco Code Editor',
      desc: 'Real-time delta synchronization powered by Socket.io with multi-language syntax highlighting, line numbers, and live collaboration indicators.',
      tag: 'Instant Delta Sync',
      color: '#84cc16'
    },
    {
      icon: Video,
      title: 'WebRTC Video & Screen Share',
      desc: 'High-definition peer-to-peer video conferencing, microphone mute toggles, active speaker views, and 1080p screen-sharing built directly in-room.',
      tag: 'HD P2P Video',
      color: '#22d3ee'
    },
    {
      icon: MessageSquare,
      title: 'Team Chat & Real-Time Audit Log',
      desc: 'Integrated room chat with emoji support and an activity stream tracking real-time line edits and member joins for complete transparency.',
      tag: 'Live Event Feed',
      color: '#a78bfa'
    },
    {
      icon: ShieldAlert,
      title: 'Admin Portal & Role Security',
      desc: 'Centralized admin management dashboard with JWT token validation, room occupancy inspection, live socket monitoring, and system metrics.',
      tag: 'JWT Protected',
      color: '#fb923c'
    },
  ];

  /* ─── 3-Step Quick Start Workflow ─── */
  const steps = [
    {
      step: '01',
      title: 'Create or Join a Room',
      desc: 'Generate an instant room ID or enter an existing one. No complex registration or lengthy setup required.',
      icon: PlusCircle
    },
    {
      step: '02',
      title: 'Pair Code & Video Call Live',
      desc: 'Edit code simultaneously with sub-second synchronization while talking over WebRTC video and sharing your screen.',
      icon: Monitor
    },
    {
      step: '03',
      title: 'Review Audit Feed & Collaborate',
      desc: 'Monitor line-by-line delta changes in the live audit panel, chat with teammates, and build together effortlessly.',
      icon: Layers
    }
  ];

  /* ─── Open Source / Capabilities ─── */
  const openSourceCards = [
    {
      title: 'Self-Host Anywhere',
      desc: 'Clone the repository and spin up locally or on any cloud VPS with standard Node.js and modern Web standards.',
      icon: Terminal,
      highlight: 'Local & Cloud Ready'
    },
    {
      title: 'Full Feature Suite',
      desc: 'Enjoy full access to Monaco editor, WebRTC conferencing, team chat, and admin portal with zero tier locks.',
      icon: Sparkles,
      highlight: 'No Locked Features'
    },
    {
      title: 'Privacy & Control',
      desc: 'Your code stays on your server. In-memory data store with optional MongoDB persistence gives you total autonomy.',
      icon: Lock,
      highlight: 'Complete Data Autonomy'
    }
  ];

  /* ─── Code Snippets for Interactive Feature Explorer ─── */
  const codeSnippets = {
    javascript: `// ProCollab Real-Time Delta Synchronization
import { io } from 'socket.io-client';

export function syncEditorSession(roomId, documentModel) {
  const socket = io({ transports: ['websocket'] });
  
  socket.emit('join-room', { roomId, user: 'Vaibhav' });
  
  socket.on('code-updated', ({ delta, author }) => {
    console.log(\`[Sync] Code updated by \${author} at \${new Date().toLocaleTimeString()}\`);
    documentModel.applyDelta(delta);
  });
  
  return { status: 'Connected', latency: '< 15ms' };
}`,
    python: `# ProCollab Real-Time Collaborative Workspace
import asyncio
from dataclasses import dataclass

@dataclass
class CollaborativeSession:
    room_id: str
    active_peers: list[str]
    delta_sync_active: bool = True

    async def broadcast_delta(self, edit_delta: dict) -> None:
        """Broadcasts code changes across all connected WebRTC & Socket peers."""
        print(f"[Socket.io] Broadcasting delta to {len(self.active_peers)} peers in {self.room_id}")
        await asyncio.sleep(0.01)

# Initialize Session
session = CollaborativeSession(room_id="dev-room-101", active_peers=["Vaibhav", "Team"])`,
    cpp: `// ProCollab Real-Time WebSocket Engine (C++)
#include <iostream>
#include <string>
#include <vector>

struct RoomSession {
    std::string roomId;
    int connectedPeers;
    bool isDeltaSyncEnabled;

    void logActivity(const std::string& user, const std::string& action) {
        std::cout << "[Audit Feed] " << user << " : " << action << std::endl;
    }
};

int main() {
    RoomSession activeRoom{"dev-room-101", 3, true};
    activeRoom.logActivity("Vaibhav", "Updated shared Monaco editor buffer");
    return 0;
}`
  };

  return (
    <div className="hp-root">
      {/* Real-Time Developer & Coding Video/Canvas Background */}
      <DeveloperBackgroundVideo overlayOpacity={0.72} showGrid={true} />

      {/* Ambient glowing background orbs */}
      <div className="hp-ambient" aria-hidden="true">
        <div className="hp-orb hp-orb-1" />
        <div className="hp-orb hp-orb-2" />
      </div>

      {/* ─────────────────────────── HERO ─────────────────────────── */}
      <section className="hp-hero">
        <ScrollReveal direction="up" delay={80}>
          <div className="hp-tagline-badge">
            <span className="hp-tagline-dot" />
            Real-Time Collaborative Workspace
          </div>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={160}>
          <h1 className="hp-hero-title">
            Finally, Your Team<br />Codes Together in Real-Time
          </h1>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={240}>
          <p className="hp-hero-sub">
            Run shared Monaco editor sessions, WebRTC video calls, and live team chat across your collaborative rooms — sub-second delta synchronization and zero paywalls.
          </p>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={320}>
          <div className="hp-hero-ctas">
            <button onClick={() => setIsRoomModalOpen(true)} className="hp-btn-primary" id="hero-create-room-btn">
              <PlusCircle size={16} /> Start Demo Room
            </button>
            <button onClick={handleLaunchDemo} className="hp-btn-outline" id="hero-launch-demo-btn">
              <Play size={15} /> Try Workspace
            </button>
          </div>
        </ScrollReveal>

        {/* Tech Stack Badges */}
        <ScrollReveal direction="up" delay={400}>
          <div className="hp-tech-stack-wrap">
            <p className="hp-tech-stack-label">Built with modern developer technologies</p>
            <div className="hp-tech-stack-badges">
              {techStack.map((tech) => (
                <span key={tech} className="hp-tech-badge">
                  <Cpu size={12} className="hp-tech-badge-icon" />
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ─────────────── INTERACTIVE FEATURE EXPLORER ─────────────── */}
      <section className="hp-section hp-explorer-section" id="features">
        <ScrollReveal direction="up" delay={100}>
          <div className="hp-section-head">
            <div className="hp-section-eyebrow">Interactive Feature Explorer</div>
            <h2 className="hp-section-title">Experience the Real-Time Suite</h2>
            <p className="hp-section-sub">
              Explore how Monaco delta sync, WebRTC video conferencing, team chat, and admin security work together in harmony.
            </p>
          </div>

          {/* Explorer Tab Bar */}
          <div className="hp-explorer-tabs">
            <button
              onClick={() => setActiveTab('editor')}
              className={`hp-explorer-tab ${activeTab === 'editor' ? 'hp-explorer-tab-active' : ''}`}
            >
              <Code2 size={16} /> Monaco Code Sync
            </button>
            <button
              onClick={() => setActiveTab('webrtc')}
              className={`hp-explorer-tab ${activeTab === 'webrtc' ? 'hp-explorer-tab-active' : ''}`}
            >
              <Video size={16} /> WebRTC Video Call
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`hp-explorer-tab ${activeTab === 'chat' ? 'hp-explorer-tab-active' : ''}`}
            >
              <MessageSquare size={16} /> Chat & Audit Log
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`hp-explorer-tab ${activeTab === 'admin' ? 'hp-explorer-tab-active' : ''}`}
            >
              <ShieldAlert size={16} /> Admin Portal
            </button>
          </div>

          {/* Explorer Showcase Card */}
          <div className="hp-explorer-window">
            {/* Top Window Header */}
            <div className="hp-window-header">
              <div className="hp-window-controls">
                <span className="hp-window-dot hp-dot-red" />
                <span className="hp-window-dot hp-dot-yellow" />
                <span className="hp-window-dot hp-dot-green" />
              </div>
              <div className="hp-window-title">
                <span className="hp-window-room-status" />
                <span>dev-room-workspace • {activeTab.toUpperCase()} ENGINE</span>
              </div>
              <div className="hp-window-badge">
                <Zap size={12} /> Live Socket Connected
              </div>
            </div>

            {/* Window Body Contents based on activeTab */}
            <div className="hp-window-body">
              {/* TAB 1: Shared Monaco Editor */}
              {activeTab === 'editor' && (
                <div className="hp-tab-content hp-editor-preview">
                  <div className="hp-editor-toolbar">
                    <div className="hp-editor-lang-picker">
                      <span className="hp-lang-label">Language:</span>
                      {['javascript', 'python', 'cpp'].map((lang) => (
                        <button
                          key={lang}
                          onClick={() => setActiveCodeLang(lang)}
                          className={`hp-lang-btn ${activeCodeLang === lang ? 'hp-lang-btn-active' : ''}`}
                        >
                          {lang.toUpperCase()}
                        </button>
                      ))}
                    </div>
                    <div className="hp-editor-collaborators">
                      <span className="hp-collab-badge hp-collab-1">● Vaibhav (Editing)</span>
                      <span className="hp-collab-badge hp-collab-2">● Peer 2 (Viewing)</span>
                    </div>
                  </div>

                  <pre className="hp-code-view">
                    <code>{codeSnippets[activeCodeLang]}</code>
                  </pre>
                  
                  <div className="hp-editor-statusbar">
                    <span>UTF-8</span>
                    <span>Spaces: 2</span>
                    <span>Delta Sync: 0ms lag</span>
                    <span className="hp-status-ok">🟢 Ready</span>
                  </div>
                </div>
              )}

              {/* TAB 2: WebRTC Video Conference */}
              {activeTab === 'webrtc' && (
                <div className="hp-tab-content hp-video-preview">
                  <div className="hp-video-grid">
                    <div className="hp-video-box hp-video-local">
                      <div className="hp-video-avatar">V</div>
                      <div className="hp-video-overlay-info">
                        <span>Vaibhav (You)</span>
                        <span className="hp-mic-on"><Mic size={12} /> Active</span>
                      </div>
                    </div>
                    <div className="hp-video-box hp-video-remote">
                      <div className="hp-video-avatar hp-avatar-peer">P</div>
                      <div className="hp-video-overlay-info">
                        <span>Remote Peer</span>
                        <span className="hp-mic-on"><Mic size={12} /> Active</span>
                      </div>
                    </div>
                  </div>
                  <div className="hp-video-controls-bar">
                    <button className="hp-video-ctrl-btn hp-ctrl-active"><Mic size={16} /> Mic On</button>
                    <button className="hp-video-ctrl-btn hp-ctrl-active"><Video size={16} /> Cam On</button>
                    <button className="hp-video-ctrl-btn"><Share2 size={16} /> Screen Share</button>
                    <button onClick={handleLaunchDemo} className="hp-video-ctrl-btn hp-ctrl-launch"><Play size={14} /> Join Full Call</button>
                  </div>
                </div>
              )}

              {/* TAB 3: Team Chat & Live Audit Log */}
              {activeTab === 'chat' && (
                <div className="hp-tab-content hp-chat-preview">
                  <div className="hp-chat-split">
                    {/* Left: Messages */}
                    <div className="hp-chat-col">
                      <h4 className="hp-split-title"><MessageSquare size={14} /> Room Messages</h4>
                      <div className="hp-chat-flow">
                        <div className="hp-chat-item">
                          <span className="hp-chat-author">Vaibhav:</span>
                          <span className="hp-chat-text">"Pushed updates to the editor component! 🚀"</span>
                          <span className="hp-chat-ts">10:14 PM</span>
                        </div>
                        <div className="hp-chat-item hp-chat-item-reply">
                          <span className="hp-chat-author">Team Peer:</span>
                          <span className="hp-chat-text">"Changes synced instantly on my side 👍"</span>
                          <span className="hp-chat-ts">10:15 PM</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Real-time Audit Feed */}
                    <div className="hp-chat-col hp-audit-col">
                      <h4 className="hp-split-title"><Shield size={14} /> Live Activity Audit Feed</h4>
                      <div className="hp-audit-flow">
                        <div className="hp-audit-item">
                          <span className="hp-audit-dot" />
                          <p><strong>Vaibhav</strong> edited <code>syncEditorSession</code> function</p>
                          <span className="hp-audit-ts">Just now</span>
                        </div>
                        <div className="hp-audit-item">
                          <span className="hp-audit-dot" />
                          <p><strong>Peer</strong> switched language buffer to <code>JavaScript</code></p>
                          <span className="hp-audit-ts">1 min ago</span>
                        </div>
                        <div className="hp-audit-item">
                          <span className="hp-audit-dot" />
                          <p><strong>Room</strong> initialized with Socket.io signaling mesh</p>
                          <span className="hp-audit-ts">2 mins ago</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: Admin Portal */}
              {activeTab === 'admin' && (
                <div className="hp-tab-content hp-admin-preview">
                  <div className="hp-admin-grid">
                    <div className="hp-admin-stat-box">
                      <span className="hp-admin-stat-title">System Status</span>
                      <span className="hp-admin-stat-num text-emerald-400">100% Operational</span>
                      <span className="hp-admin-stat-sub">Express + WebSocket API</span>
                    </div>
                    <div className="hp-admin-stat-box">
                      <span className="hp-admin-stat-title">Database Mode</span>
                      <span className="hp-admin-stat-num text-sky-400">Hybrid / In-Memory</span>
                      <span className="hp-admin-stat-sub">Zero-config instant store</span>
                    </div>
                    <div className="hp-admin-stat-box">
                      <span className="hp-admin-stat-title">Security & Roles</span>
                      <span className="hp-admin-stat-num text-amber-400">JWT Verified</span>
                      <span className="hp-admin-stat-sub">Role-Based Access Control</span>
                    </div>
                  </div>
                  <div className="hp-admin-action-row">
                    <Link to="/admin-dashboard" className="hp-btn-primary" style={{ padding: '8px 20px', fontSize: '13px' }}>
                      <ShieldAlert size={14} /> Open Admin Dashboard
                    </Link>
                    <span className="text-xs text-slate-400">Manage user roles, inspect rooms, and view audit events</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ─────────────────────────── TECHNICAL SPECS ─────────────────────────── */}
      <section className="hp-section">
        <ScrollReveal direction="up" delay={100}>
          <div className="hp-stats-grid">
            {techSpecs.map((s, i) => (
              <div key={i} className="hp-stat-card">
                <s.icon size={22} className="hp-stat-icon" />
                <div className="hp-stat-value">{s.value}</div>
                <div className="hp-stat-label">{s.label}</div>
                <div className="hp-stat-detail">{s.detail}</div>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </section>

      {/* ─────────────────────────── CORE MODULES ─────────────────────────── */}
      <section className="hp-section">
        <ScrollReveal direction="up" delay={100}>
          <div className="hp-section-head">
            <div className="hp-section-eyebrow">Built for High-Speed Collaboration</div>
            <h2 className="hp-section-title">Everything you need to code together</h2>
            <p className="hp-section-sub">
              Integrated real-time engineering modules ready out-of-the-box in every collaborative room.
            </p>
          </div>
        </ScrollReveal>
        <ScrollReveal direction="up" delay={200}>
          <div className="hp-features-grid">
            {features.map((feat, i) => (
              <div key={i} className="hp-feat-card" style={{ '--feat-color': feat.color }}>
                <div className="hp-feat-icon-wrap"><feat.icon size={20} /></div>
                <h3 className="hp-feat-title">{feat.title}</h3>
                <p className="hp-feat-desc">{feat.desc}</p>
                <div className="hp-feat-footer">
                  <span className="hp-feat-tag">{feat.tag}</span>
                  <ArrowRight size={14} className="hp-feat-arrow" />
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </section>

      {/* ─────────────────────────── HOW IT WORKS ─────────────────────────── */}
      <section className="hp-section hp-how-section" id="how-it-works">
        <ScrollReveal direction="up" delay={100}>
          <div className="hp-section-head">
            <div className="hp-section-eyebrow">Seamless Workflow</div>
            <h2 className="hp-section-title">Get collaborating in 3 simple steps</h2>
            <p className="hp-section-sub">
              Start an instant pair programming session with zero configuration friction.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={200}>
          <div className="hp-steps-grid">
            {steps.map((st, i) => (
              <div key={i} className="hp-step-card">
                <div className="hp-step-header">
                  <span className="hp-step-num">{st.step}</span>
                  <div className="hp-step-icon"><st.icon size={18} /></div>
                </div>
                <h3 className="hp-step-title">{st.title}</h3>
                <p className="hp-step-desc">{st.desc}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </section>

      {/* ─────────────────────────── OPEN SOURCE & SELF HOSTABLE ─────────────────────────── */}
      <section className="hp-section hp-opensource-section" id="open-source">
        <ScrollReveal direction="up" delay={100}>
          <div className="hp-section-head">
            <div className="hp-section-eyebrow">100% Free & Open Architecture</div>
            <h2 className="hp-section-title">Zero Paywalls. Complete Freedom.</h2>
            <p className="hp-section-sub">
              ProCollab is completely unrestricted — no subscription fees, no locked rooms, and full source code transparency.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={200}>
          <div className="hp-open-grid">
            {openSourceCards.map((card, i) => (
              <div key={i} className="hp-open-card">
                <div className="hp-open-badge">{card.highlight}</div>
                <div className="hp-open-icon"><card.icon size={22} /></div>
                <h3 className="hp-open-title">{card.title}</h3>
                <p className="hp-open-desc">{card.desc}</p>
                <div className="hp-open-check">
                  <Check size={14} className="text-emerald-400" />
                  <span>Unrestricted Access</span>
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* Quick Launch Command Block */}
        <ScrollReveal direction="up" delay={300}>
          <div className="hp-terminal-box">
            <div className="hp-terminal-header">
              <span className="hp-terminal-dot hp-dot-red" />
              <span className="hp-terminal-dot hp-dot-yellow" />
              <span className="hp-terminal-dot hp-dot-green" />
              <span className="hp-terminal-title">Quick Start • Run Local Server</span>
            </div>
            <div className="hp-terminal-code">
              <span className="text-lime-400"># Start both client and backend servers</span><br />
              <span className="text-slate-300">$</span> <span className="text-indigo-300">cd server && npm start</span><br />
              <span className="text-slate-300">$</span> <span className="text-indigo-300">cd client && npm run dev</span><br />
              <span className="text-slate-500">→ Ready on http://localhost:3000 (Vite) & http://localhost:5000 (Express API)</span>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ─────────────── BOTTOM CTA ─────────────── */}
      <section className="hp-section">
        <ScrollReveal direction="up" delay={100}>
          <div className="hp-cta-banner">
            <div className="hp-cta-glow" />
            <h2 className="hp-cta-title">Ready to pair-program in real-time?</h2>
            <p className="hp-cta-sub">
              Create an instant room, test Monaco delta sync, and explore WebRTC video calls with your team.
            </p>
            <div className="hp-hero-ctas" style={{ marginTop: 0 }}>
              <button onClick={() => setIsRoomModalOpen(true)} className="hp-btn-primary" id="cta-banner-btn">
                <PlusCircle size={16} /> Start Demo Room
              </button>
              <button onClick={() => setIsLoginModalOpen(true)} className="hp-btn-outline" id="cta-login-btn">
                Sign In / Admin
              </button>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ─────────────── FOOTER ─────────────── */}
      <footer className="hp-footer">
        <div className="hp-footer-inner">
          <div className="hp-footer-brand">
            <div className="hp-footer-logo"><Code2 size={18} /></div>
            <span className="hp-footer-name">ProCollab</span>
          </div>
          <div className="hp-footer-cols">
            <div>
              <h4 className="hp-footer-col-title">Product</h4>
              <ul>
                <li><Link to="/workspace">Monaco Editor</Link></li>
                <li><Link to="/workspace">WebRTC Video</Link></li>
                <li><Link to="/workspace">Team Chat</Link></li>
                <li><Link to="/admin-dashboard">Admin Portal</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="hp-footer-col-title">Architecture</h4>
              <ul>
                <li><a href="#features">Socket.io Delta Sync</a></li>
                <li><a href="#features">WebRTC P2P Mesh</a></li>
                <li><a href="#open-source">In-Memory Hybrid DB</a></li>
              </ul>
            </div>
            <div>
              <h4 className="hp-footer-col-title">Quick Access</h4>
              <ul>
                <li><Link to="/login">Sign In</Link></li>
                <li><Link to="/signup">Register Account</Link></li>
                <li><Link to="/admin-dashboard">Admin Control</Link></li>
              </ul>
            </div>
          </div>
          <div className="hp-footer-bottom">
            <p>© 2026 ProCollab • Real-Time Collaborative Developer Workspace</p>
            <div className="hp-footer-socials">
              <span className="text-slate-500 text-xs">Self-Hosted & Open Architecture</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ─────────────── CREATE/JOIN ROOM MODAL ─────────────── */}
      <CreateJoinRoomModal isOpen={isRoomModalOpen} onClose={() => setIsRoomModalOpen(false)} />

      {/* ─────────────── LOGIN MODAL ─────────────── */}
      {isLoginModalOpen && (
        <div className="lm-overlay" onClick={closeLoginModal}>
          <div className="lm-modal" onClick={(e) => e.stopPropagation()}>
            <button className="lm-close" onClick={closeLoginModal} aria-label="Close"><X size={18} /></button>

            {/* Logo + heading */}
            <div className="lm-brand">
              <div className="lm-brand-icon"><Code2 size={20} /></div>
              <h2 className="lm-title">Welcome to ProCollab</h2>
              <p className="lm-subtitle">Sign in or access admin controls</p>
            </div>

            {/* Google button */}
            <button className="lm-google-btn" onClick={() => setLoginError('Google sign-in is disabled in local mode.')}>
              <GoogleG /> Continue with Google
            </button>

            {/* Divider */}
            <div className="lm-divider"><span /></div>

            {/* Error */}
            {loginError && (
              <div className="lm-error">
                <AlertCircle size={14} /> {loginError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLoginSubmit} className="lm-form">
              <div className="lm-field">
                <label htmlFor="modal-username">Username</label>
                <input
                  id="modal-username"
                  type="text"
                  placeholder="Enter your username (e.g. admin or user)"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="lm-field">
                <div className="lm-label-row">
                  <label htmlFor="modal-password">Password</label>
                </div>
                <div className="lm-pass-wrap">
                  <input
                    id="modal-password"
                    type={showLoginPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                  <button type="button" className="lm-eye" onClick={() => setShowLoginPass(v => !v)} aria-label="Toggle password">
                    {showLoginPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <button type="submit" className="lm-submit" disabled={loginLoading} id="modal-sign-in-btn">
                {loginLoading ? <span className="lm-spinner" /> : 'Sign In'}
              </button>
            </form>

            <p className="lm-footer">
              Don't have an account?{' '}
              <Link to="/signup" onClick={closeLoginModal}>Sign up for free</Link>
            </p>
          </div>
        </div>
      )}

      <style>{`
        /* ─── Root ─── */
        .hp-root {
          background: #0d0f12;
          color: #fff;
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
          padding-top: 64px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }

        /* Ambient */
        .hp-ambient { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
        .hp-orb { position: absolute; border-radius: 50%; filter: blur(120px); }
        .hp-orb-1 { width: 600px; height: 600px; background: radial-gradient(circle, rgba(99,102,241,0.09) 0%, transparent 70%); top: 10%; left: 20%; animation: hpFloat 12s ease-in-out infinite; }
        .hp-orb-2 { width: 500px; height: 500px; background: radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%); bottom: 10%; right: 10%; animation: hpFloat 16s ease-in-out infinite reverse; }
        @keyframes hpFloat { 0%,100% { transform: translate(0,0); } 50% { transform: translate(30px,-40px); } }

        /* ── Hero ── */
        .hp-hero { position: relative; z-index: 1; text-align: center; padding: 70px 20px 50px; max-width: 900px; margin: 0 auto; }
        .hp-tagline-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); padding: 7px 18px; border-radius: 999px; font-size: 13px; color: #38bdf8; margin-bottom: 24px; }
        .hp-tagline-dot { width: 7px; height: 7px; border-radius: 50%; background: #38bdf8; animation: hpPing 2s ease-in-out infinite; }
        @keyframes hpPing { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(1.3); } }
        .hp-hero-title { font-size: clamp(36px,5.5vw,58px); font-weight: 700; line-height: 1.13; letter-spacing: -1.5px; margin-bottom: 20px; background: linear-gradient(180deg,#ffffff 0%,#8b949e 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .hp-hero-sub { font-size: 16.5px; color: #9ca3af; max-width: 650px; margin: 0 auto 34px; line-height: 1.65; }
        .hp-hero-ctas { display: flex; justify-content: center; gap: 14px; flex-wrap: wrap; margin-top: 32px; }
        .hp-btn-primary { display: inline-flex; align-items: center; gap: 8px; background: #fff; color: #000; border: none; cursor: pointer; padding: 12px 26px; border-radius: 24px; font-size: 14.5px; font-weight: 700; text-decoration: none; transition: opacity 0.2s, transform 0.15s; box-shadow: 0 0 30px rgba(255,255,255,0.12); }
        .hp-btn-primary:hover { opacity: 0.88; transform: translateY(-2px); }
        .hp-btn-outline { display: inline-flex; align-items: center; gap: 8px; border: 1px solid rgba(255,255,255,0.18); color: #fff; background: transparent; padding: 12px 26px; border-radius: 24px; font-size: 14.5px; font-weight: 500; text-decoration: none; cursor: pointer; transition: background 0.2s, border-color 0.2s; }
        .hp-btn-outline:hover { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.35); }
        
        /* Tech Badges */
        .hp-tech-stack-wrap { margin-top: 50px; }
        .hp-tech-stack-label { font-size: 11.5px; text-transform: uppercase; letter-spacing: 1.2px; color: #64748b; margin-bottom: 16px; }
        .hp-tech-stack-badges { display: flex; justify-content: center; flex-wrap: wrap; gap: 12px; }
        .hp-tech-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09); border-radius: 20px; padding: 6px 14px; font-size: 12px; color: #cbd5e1; font-weight: 500; }
        .hp-tech-badge-icon { color: #818cf8; }

        /* ─── INTERACTIVE EXPLORER ─── */
        .hp-explorer-section { padding-top: 20px; }
        .hp-explorer-tabs { display: flex; justify-content: center; gap: 10px; margin-bottom: 24px; flex-wrap: wrap; }
        .hp-explorer-tab { display: inline-flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: #94a3b8; font-size: 13px; font-weight: 600; padding: 10px 18px; border-radius: 12px; cursor: pointer; transition: all 0.2s; }
        .hp-explorer-tab:hover { background: rgba(255,255,255,0.08); color: #fff; }
        .hp-explorer-tab-active { background: rgba(99,102,241,0.15); border-color: rgba(99,102,241,0.4); color: #a5b4fc; }

        .hp-explorer-window { background: #12161f; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
        .hp-window-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; background: #0c0f17; border-bottom: 1px solid rgba(255,255,255,0.08); }
        .hp-window-controls { display: flex; gap: 6px; }
        .hp-window-dot { width: 10px; height: 10px; border-radius: 50%; }
        .hp-dot-red { background: #ef4444; }
        .hp-dot-yellow { background: #eab308; }
        .hp-dot-green { background: #22c55e; }
        .hp-window-title { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; color: #94a3b8; font-family: monospace; }
        .hp-window-room-status { width: 7px; height: 7px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 8px #22c55e; }
        .hp-window-badge { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #38bdf8; background: rgba(56,189,248,0.1); border: 1px solid rgba(56,189,248,0.2); padding: 3px 10px; border-radius: 999px; }

        .hp-window-body { min-height: 380px; }
        .hp-tab-content { padding: 20px; }

        /* Editor Preview */
        .hp-editor-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; flex-wrap: wrap; gap: 10px; }
        .hp-editor-lang-picker { display: flex; align-items: center; gap: 6px; }
        .hp-lang-label { font-size: 12px; color: #64748b; margin-right: 4px; }
        .hp-lang-btn { font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); color: #94a3b8; cursor: pointer; transition: all 0.15s; }
        .hp-lang-btn:hover { color: #fff; background: rgba(255,255,255,0.1); }
        .hp-lang-btn-active { background: #6366f1; color: #fff; border-color: #818cf8; }
        .hp-editor-collaborators { display: flex; gap: 8px; }
        .hp-collab-badge { font-size: 11px; padding: 3px 9px; border-radius: 6px; font-weight: 600; }
        .hp-collab-1 { background: rgba(34,197,94,0.15); color: #4ade80; border: 1px solid rgba(34,197,94,0.3); }
        .hp-collab-2 { background: rgba(56,189,248,0.15); color: #7dd3fc; border: 1px solid rgba(56,189,248,0.3); }

        .hp-code-view { background: #080b11; border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 18px; font-family: 'Fira Code', 'Courier New', monospace; font-size: 13px; line-height: 1.6; color: #e2e8f0; overflow-x: auto; max-height: 280px; }
        .hp-editor-statusbar { display: flex; justify-content: flex-end; gap: 16px; font-size: 11px; color: #64748b; margin-top: 10px; font-family: monospace; }
        .hp-status-ok { color: #22c55e; }

        /* Video Preview */
        .hp-video-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
        .hp-video-box { aspect-ratio: 16/9; background: #080b11; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; }
        .hp-video-avatar { width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg,#6366f1,#818cf8); display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800; color: #fff; box-shadow: 0 0 20px rgba(99,102,241,0.4); }
        .hp-avatar-peer { background: linear-gradient(135deg,#06b6d4,#3b82f6); box-shadow: 0 0 20px rgba(6,182,212,0.4); }
        .hp-video-overlay-info { position: absolute; bottom: 10px; left: 12px; right: 12px; display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: #f1f5f9; font-weight: 600; background: rgba(0,0,0,0.5); padding: 4px 10px; border-radius: 6px; backdrop-filter: blur(4px); }
        .hp-mic-on { display: flex; align-items: center; gap: 4px; color: #4ade80; font-size: 11px; }
        .hp-video-controls-bar { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; }
        .hp-video-ctrl-btn { display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #cbd5e1; font-size: 12.5px; font-weight: 600; padding: 8px 16px; border-radius: 20px; cursor: pointer; transition: all 0.2s; }
        .hp-ctrl-active { background: rgba(34,197,94,0.15); border-color: rgba(34,197,94,0.3); color: #86efac; }
        .hp-ctrl-launch { background: #6366f1; border-color: #818cf8; color: #fff; }
        .hp-ctrl-launch:hover { background: #4f46e5; }

        /* Chat Preview */
        .hp-chat-split { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .hp-chat-col { background: #080b11; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 16px; }
        .hp-split-title { font-size: 13px; font-weight: 700; color: #cbd5e1; display: flex; align-items: center; gap: 8px; margin-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 8px; }
        .hp-chat-flow { display: flex; flex-direction: column; gap: 12px; }
        .hp-chat-item { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 10px 12px; font-size: 12.5px; }
        .hp-chat-author { font-weight: 700; color: #818cf8; margin-right: 6px; }
        .hp-chat-text { color: #e2e8f0; }
        .hp-chat-ts { display: block; font-size: 10px; color: #64748b; margin-top: 4px; }
        .hp-audit-flow { display: flex; flex-direction: column; gap: 10px; }
        .hp-audit-item { display: flex; align-items: flex-start; gap: 8px; font-size: 12px; color: #94a3b8; }
        .hp-audit-dot { width: 6px; height: 6px; border-radius: 50%; background: #6366f1; margin-top: 6px; flex-shrink: 0; }
        .hp-audit-item p { margin: 0; flex: 1; line-height: 1.4; }
        .hp-audit-item code { background: rgba(255,255,255,0.08); padding: 1px 4px; border-radius: 4px; color: #38bdf8; font-size: 11px; }
        .hp-audit-ts { font-size: 10px; color: #475569; }

        /* Admin Preview */
        .hp-admin-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px; }
        .hp-admin-stat-box { background: #080b11; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 18px; display: flex; flex-direction: column; gap: 4px; }
        .hp-admin-stat-title { font-size: 12px; color: #64748b; font-weight: 600; }
        .hp-admin-stat-num { font-size: 18px; font-weight: 800; }
        .hp-admin-stat-sub { font-size: 11px; color: #475569; }
        .hp-admin-action-row { display: flex; align-items: center; gap: 16px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 14px 20px; }

        /* ── Sections ── */
        .hp-section { position: relative; z-index: 1; max-width: 1100px; margin: 0 auto; padding: 60px 24px; }
        .hp-section-head { text-align: center; margin-bottom: 52px; }
        .hp-section-eyebrow { font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: #6366f1; margin-bottom: 14px; }
        .hp-section-title { font-size: clamp(26px,4vw,42px); font-weight: 700; color: #fff; letter-spacing: -0.03em; line-height: 1.2; margin-bottom: 14px; }
        .hp-section-sub { font-size: 15.5px; color: #6b7280; max-width: 600px; margin: 0 auto; line-height: 1.6; }

        /* Stats / Specs */
        .hp-stats-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; }
        .hp-stat-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 24px 16px; text-align: center; transition: border-color 0.2s, background 0.2s; }
        .hp-stat-card:hover { border-color: rgba(255,255,255,0.15); background: rgba(255,255,255,0.05); }
        .hp-stat-icon { color: #818cf8; margin: 0 auto 10px; }
        .hp-stat-value { font-size: 26px; font-weight: 800; color: #fff; letter-spacing: -0.03em; margin-bottom: 4px; }
        .hp-stat-label { font-size: 13px; color: #cbd5e1; font-weight: 600; margin-bottom: 2px; }
        .hp-stat-detail { font-size: 11px; color: #64748b; }

        /* Feature grid */
        .hp-features-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 16px; }
        .hp-feat-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 28px 26px; display: flex; flex-direction: column; transition: border-color 0.25s, background 0.25s, transform 0.25s; }
        .hp-feat-card:hover { border-color: rgba(255,255,255,0.15); background: rgba(255,255,255,0.04); transform: translateY(-3px); }
        .hp-feat-icon-wrap { width: 42px; height: 42px; border-radius: 12px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; color: var(--feat-color,#6366f1); margin-bottom: 18px; }
        .hp-feat-title { font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 8px; }
        .hp-feat-desc { font-size: 13.5px; color: #6b7280; line-height: 1.6; flex: 1; }
        .hp-feat-footer { margin-top: 20px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: space-between; }
        .hp-feat-tag { font-size: 11px; font-weight: 700; color: var(--feat-color,#6366f1); text-transform: uppercase; letter-spacing: 0.06em; }
        .hp-feat-arrow { color: #3d4451; transition: color 0.2s; }
        .hp-feat-card:hover .hp-feat-arrow { color: #6b7280; }

        /* How it works */
        .hp-steps-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .hp-step-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 30px 24px; position: relative; }
        .hp-step-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
        .hp-step-num { font-size: 28px; font-weight: 900; color: rgba(255,255,255,0.15); font-family: monospace; }
        .hp-step-icon { width: 36px; height: 36px; border-radius: 10px; background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3); display: flex; align-items: center; justify-content: center; color: #818cf8; }
        .hp-step-title { font-size: 16px; font-weight: 700; color: #f1f5f9; margin-bottom: 8px; }
        .hp-step-desc { font-size: 13px; color: #6b7280; line-height: 1.6; }

        /* Open Source section */
        .hp-open-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
        .hp-open-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 18px; padding: 30px 24px; display: flex; flex-direction: column; }
        .hp-open-badge { display: inline-block; align-self: flex-start; font-size: 11px; font-weight: 700; color: #38bdf8; background: rgba(56,189,248,0.1); border: 1px solid rgba(56,189,248,0.2); padding: 3px 10px; border-radius: 999px; margin-bottom: 16px; }
        .hp-open-icon { width: 42px; height: 42px; border-radius: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; color: #a5b4fc; margin-bottom: 16px; }
        .hp-open-title { font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 8px; }
        .hp-open-desc { font-size: 13px; color: #6b7280; line-height: 1.6; flex: 1; margin-bottom: 18px; }
        .hp-open-check { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #cbd5e1; font-weight: 600; }

        /* Terminal box */
        .hp-terminal-box { background: #07090e; border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; overflow: hidden; }
        .hp-terminal-header { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: #0d111a; border-bottom: 1px solid rgba(255,255,255,0.08); }
        .hp-terminal-dot { width: 9px; height: 9px; border-radius: 50%; }
        .hp-terminal-title { font-size: 12px; color: #94a3b8; font-family: monospace; margin-left: 6px; }
        .hp-terminal-code { padding: 16px 20px; font-family: 'Fira Code', 'Courier New', monospace; font-size: 13px; line-height: 1.7; }

        /* Bottom CTA */
        .hp-cta-banner { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 22px; padding: 60px 40px; text-align: center; position: relative; overflow: hidden; }
        .hp-cta-glow { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 400px; height: 400px; background: radial-gradient(circle,rgba(99,102,241,0.12) 0%,transparent 70%); pointer-events: none; }
        .hp-cta-title { font-size: clamp(24px,4vw,38px); font-weight: 700; color: #fff; letter-spacing: -0.03em; margin-bottom: 14px; position: relative; z-index: 1; }
        .hp-cta-sub { font-size: 15px; color: #6b7280; max-width: 540px; margin: 0 auto 34px; line-height: 1.65; position: relative; z-index: 1; }

        /* Footer */
        .hp-footer { border-top: 1px solid rgba(255,255,255,0.06); background: #0d0f12; position: relative; z-index: 1; }
        .hp-footer-inner { max-width: 1100px; margin: 0 auto; padding: 48px 24px 30px; }
        .hp-footer-brand { display: flex; align-items: center; gap: 10px; margin-bottom: 36px; }
        .hp-footer-logo { width: 34px; height: 34px; border-radius: 10px; background: linear-gradient(135deg,#6366f1,#818cf8); display: flex; align-items: center; justify-content: center; color: #fff; }
        .hp-footer-name { font-size: 17px; font-weight: 800; color: #fff; letter-spacing: -0.03em; }
        .hp-footer-cols { display: grid; grid-template-columns: repeat(3,1fr); gap: 32px; margin-bottom: 36px; }
        .hp-footer-col-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #4b5563; margin-bottom: 14px; }
        .hp-footer-cols ul { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 9px; }
        .hp-footer-cols a { color: #6b7280; font-size: 13.5px; text-decoration: none; transition: color 0.15s; }
        .hp-footer-cols a:hover { color: #d1d5db; }
        .hp-footer-bottom { border-top: 1px solid rgba(255,255,255,0.06); padding-top: 22px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
        .hp-footer-bottom p { font-size: 12.5px; color: #4b5563; }
        .hp-footer-socials { display: flex; gap: 20px; }

        /* ─── LOGIN MODAL ─── */
        .lm-overlay {
          position: fixed; inset: 0; z-index: 200;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
          animation: lmFadeIn 0.2s ease;
        }
        @keyframes lmFadeIn { from { opacity:0; } to { opacity:1; } }

        .lm-modal {
          background: #111318;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px;
          padding: 36px 32px;
          width: 100%; max-width: 400px;
          position: relative;
          box-shadow: 0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05);
          animation: lmSlideUp 0.25s cubic-bezier(0.34,1.56,0.64,1);
        }
        @keyframes lmSlideUp { from { opacity:0; transform:translateY(24px) scale(0.96); } to { opacity:1; transform:translateY(0) scale(1); } }

        .lm-close {
          position: absolute; top: 16px; right: 16px;
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
          color: #6b7280; border-radius: 50%;
          width: 32px; height: 32px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: color 0.15s, background 0.15s;
        }
        .lm-close:hover { color: #fff; background: rgba(255,255,255,0.12); }

        .lm-brand { text-align: center; margin-bottom: 24px; }
        .lm-brand-icon {
          width: 46px; height: 46px; border-radius: 14px;
          background: linear-gradient(135deg,#6366f1,#818cf8);
          display: flex; align-items: center; justify-content: center;
          color: #fff; margin: 0 auto 12px;
          box-shadow: 0 0 20px rgba(99,102,241,0.4);
        }
        .lm-title { font-size: 21px; font-weight: 800; color: #fff; letter-spacing: -0.03em; margin-bottom: 4px; }
        .lm-subtitle { font-size: 13px; color: #6b7280; }

        .lm-google-btn {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
          color: #d1d5db; font-size: 13.5px; font-weight: 600;
          padding: 11px; border-radius: 10px; cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
          margin-bottom: 18px;
        }
        .lm-google-btn:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.2); }

        .lm-divider { position: relative; margin-bottom: 18px; }
        .lm-divider span { display: block; height: 1px; background: rgba(255,255,255,0.08); }
        .lm-divider::before { content: 'or'; position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); background: #111318; padding: 0 12px; font-size: 12px; color: #4b5563; }

        .lm-error { display: flex; align-items: center; gap: 8px; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); color: #f87171; border-radius: 8px; padding: 9px 13px; font-size: 12.5px; margin-bottom: 16px; }

        .lm-form { display: flex; flex-direction: column; gap: 14px; }
        .lm-field label { display: block; font-size: 12.5px; font-weight: 600; color: #9ca3af; margin-bottom: 6px; }
        .lm-field input {
          width: 100%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px; padding: 11px 14px; font-size: 13.5px; color: #f1f5f9;
          outline: none; transition: border-color 0.2s, box-shadow 0.2s; box-sizing: border-box;
        }
        .lm-field input::placeholder { color: #374151; }
        .lm-field input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
        .lm-label-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
        .lm-label-row label { margin-bottom: 0; }
        .lm-forgot { background: none; border: none; color: #6366f1; font-size: 12.5px; font-weight: 600; cursor: pointer; transition: color 0.15s; padding: 0; }
        .lm-forgot:hover { color: #818cf8; }
        .lm-pass-wrap { position: relative; }
        .lm-pass-wrap input { padding-right: 42px; }
        .lm-eye { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #4b5563; cursor: pointer; display: flex; align-items: center; padding: 0; transition: color 0.15s; }
        .lm-eye:hover { color: #9ca3af; }

        .lm-submit {
          width: 100%; background: #fff; color: #000; border: none;
          border-radius: 10px; padding: 13px;
          font-size: 14px; font-weight: 700; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: opacity 0.2s, transform 0.15s;
          box-shadow: 0 4px 20px rgba(255,255,255,0.1);
        }
        .lm-submit:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
        .lm-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .lm-spinner { width: 18px; height: 18px; border: 2.5px solid rgba(0,0,0,0.2); border-top-color: #000; border-radius: 50%; animation: lmSpin 0.7s linear infinite; }
        @keyframes lmSpin { to { transform: rotate(360deg); } }

        .lm-demo { margin-top: 14px; text-align: center; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.06); }
        .lm-demo p { font-size: 11.5px; color: #4b5563; margin-bottom: 8px; }
        .lm-demo-pills { display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; }
        .lm-demo-pills button { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #9ca3af; font-size: 12px; font-weight: 600; padding: 6px 14px; border-radius: 999px; cursor: pointer; transition: background 0.15s, color 0.15s; }
        .hp-demo-pills button:hover { background: rgba(255,255,255,0.1); color: #fff; }

        .lm-footer { text-align: center; font-size: 12.5px; color: #6b7280; margin-top: 14px; }
        .lm-footer a { color: #6366f1; font-weight: 700; text-decoration: none; transition: color 0.15s; }
        .lm-footer a:hover { color: #818cf8; }

        /* Responsive */
        @media (max-width: 900px) {
          .hp-chat-split { grid-template-columns: 1fr; }
          .hp-video-grid { grid-template-columns: 1fr; }
          .hp-admin-grid { grid-template-columns: 1fr; }
          .hp-stats-grid { grid-template-columns: repeat(2,1fr); }
          .hp-features-grid { grid-template-columns: 1fr; }
          .hp-steps-grid { grid-template-columns: 1fr; }
          .hp-open-grid { grid-template-columns: 1fr; }
          .hp-footer-cols { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 600px) {
          .hp-hero { padding: 40px 16px 30px; }
          .hp-hero-ctas { flex-direction: column; align-items: center; }
          .hp-cta-banner { padding: 40px 20px; }
          .hp-stats-grid { grid-template-columns: 1fr; }
          .hp-footer-cols { grid-template-columns: 1fr; }
          .lm-modal { padding: 28px 20px; }
        }
      `}</style>
    </div>
  );
};

export default HomePage;