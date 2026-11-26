import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import CreateJoinRoomModal from './CreateJoinRoomModal';
import {
  Code2, ShieldAlert, LogOut, Monitor, PlusCircle, Menu, X,
  ChevronDown, Bell, Sun, Moon, User, LayoutGrid,
} from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const onOnline = () => setFeed((f) => [{ id: Date.now(), text: 'Back online — real-time sync restored', tone: 'ok' }, ...f].slice(0, 8));
    const onOffline = () => setFeed((f) => [{ id: Date.now(), text: 'Connection lost — working offline', tone: 'warn' }, ...f].slice(0, 8));
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const [feed, setFeed] = useState([]);
  const [seenCount, setSeenCount] = useState(0);

  useEffect(() => {
    const handler = (e) => {
      const detail = e.detail || {};
      setFeed((f) => [{ id: Date.now() + Math.random(), text: detail.text || 'Activity update', tone: detail.tone || 'info' }, ...f].slice(0, 8));
    };
    window.addEventListener('pc:nav-feed', handler);
    return () => window.removeEventListener('pc:nav-feed', handler);
  }, []);

  const unread = Math.max(feed.length - seenCount, 0);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Hide the navbar on landing, login, and signup pages (they have their own header)
  if (location.pathname === '/' || location.pathname === '/login' || location.pathname === '/signup') {
    return null;
  }

  const isWorkspace = location.pathname.startsWith('/workspace');
  const isDarkPage = isWorkspace || location.pathname.startsWith('/admin-dashboard');

  const navLinks = isWorkspace ? [] : [
    { path: '/#features', label: 'Features' },
    { path: '/#how-it-works', label: 'How It Works' },
    { path: '/#open-source', label: 'Open Source' },
    { path: '/#faq', label: 'FAQ' },
  ];

  return (
    <>
      <header className={`hb-navbar ${isScrolled || isWorkspace ? 'hb-navbar-solid' : ''} ${isDarkPage ? 'dark-scope' : ''}`}>
        <div className="hb-navbar-inner">

          {/* Left: Brand + Links */}
          <div className="hb-nav-left-group">
            <Link to="/" className="hb-brand" aria-label="ProCollab Home">
              <div className="hb-brand-icon">
                <Code2 size={19} />
              </div>
              <span className="hb-brand-name">ProCollab</span>
            </Link>

            <nav className="hb-nav-links" aria-label="Main navigation">
              {isWorkspace ? (
                <Link to="/" className="hb-nav-link hb-nav-accent">← Home</Link>
              ) : (
                navLinks.map((link) => (
                  <Link key={link.label} to={link.path} className="hb-nav-link">{link.label}</Link>
                ))
              )}
              {user && (
                <>
                  <Link to="/workspace" className={`hb-nav-link ${location.pathname.startsWith('/workspace') ? 'hb-nav-link-active' : ''}`}>Workspace</Link>
                  <Link to="/profile" className={`hb-nav-link ${location.pathname === '/profile' ? 'hb-nav-link-active' : ''}`}>Profile</Link>
                  {user.role === 'admin' && (
                    <Link to="/admin-dashboard" className={`hb-nav-link ${location.pathname === '/admin-dashboard' ? 'hb-nav-link-active' : ''}`}>Admin</Link>
                  )}
                </>
              )}
            </nav>
          </div>

          {/* Right actions */}
          <div className="hb-nav-right">
            <button
              onClick={() => setIsModalOpen(true)}
              className="hb-btn-primary"
              id="navbar-create-room-btn"
            >
              <PlusCircle size={14} />
              <span className="hidden sm:inline">New Room</span>
            </button>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="hb-icon-btn"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <span className={`hb-theme-icon ${theme === 'dark' ? 'hb-theme-sun' : 'hb-theme-moon'}`}>
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </span>
            </button>

            {user ? (
              <>
                {/* Notifications */}
                <div className="hb-dropdown-wrap">
                  <button
                    onClick={() => { setNotificationsOpen(!notificationsOpen); setSeenCount(feed.length); }}
                    className="hb-icon-btn"
                    aria-label="Notifications"
                  >
                    <Bell size={16} />
                    {unread > 0 && <span className="hb-notif-count">{unread}</span>}
                  </button>
                  {notificationsOpen && (
                    <>
                      <div className="hb-dropdown" style={{ minWidth: 280 }}>
                        <div className="hb-dropdown-header">
                          <span>Notifications</span>
                          <button onClick={() => setNotificationsOpen(false)} aria-label="Close"><X size={14} /></button>
                        </div>
                        {feed.length === 0 ? (
                          <div className="hb-dropdown-empty">All caught up. Room events and sync status will appear here.</div>
                        ) : (
                          <div className="hb-feed-list">
                            {feed.map((n) => (
                              <div key={n.id} className="hb-feed-item">
                                <span className={`hb-feed-dot hb-feed-dot-${n.tone}`} />
                                <span>{n.text}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="hb-overlay" onClick={() => setNotificationsOpen(false)} />
                    </>
                  )}
                </div>

                {/* User dropdown */}
                <div className="hb-dropdown-wrap">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="hb-user-btn"
                    aria-expanded={dropdownOpen}
                  >
                    <div className="hb-avatar">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="hb-username">{user.username}</span>
                    <ChevronDown size={13} className={dropdownOpen ? 'rotate-180' : ''} style={{ transition: 'transform 0.2s' }} />
                  </button>
                  {dropdownOpen && (
                    <>
                      <div className="hb-dropdown">
                        <div className="hb-dropdown-header">
                          <span>{user.username}</span>
                          <span className="hb-role-badge">{user.role}</span>
                        </div>
                        <Link to="/profile" className="hb-dropdown-item" onClick={() => setDropdownOpen(false)}>
                          <User size={14} /> My Profile
                        </Link>
                        <Link to="/workspace" className="hb-dropdown-item" onClick={() => setDropdownOpen(false)}>
                          <LayoutGrid size={14} /> Workspace
                        </Link>
                        {user.role === 'admin' && (
                          <Link to="/admin-dashboard" className="hb-dropdown-item" onClick={() => setDropdownOpen(false)}>
                            <ShieldAlert size={14} /> Admin Portal
                          </Link>
                        )}
                        <div className="hb-dropdown-divider" />
                        <button onClick={handleLogout} className="hb-dropdown-item hb-dropdown-danger">
                          <LogOut size={14} /> Logout
                        </button>
                      </div>
                      <div className="hb-overlay" onClick={() => setDropdownOpen(false)} />
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="hb-btn-ghost">Login</Link>
                <Link to="/signup" className="hb-btn-cta" id="navbar-get-started-btn">Get Started</Link>
              </>
            )}

            <button
              className="hb-icon-btn hb-mobile-toggle"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="hb-mobile-menu">
            {!isWorkspace && navLinks.map((link) => (
              <Link key={link.label} to={link.path} className="hb-mobile-link" onClick={() => setIsMobileMenuOpen(false)}>
                {link.label}
              </Link>
            ))}
            {isWorkspace && (
              <>
                <Link to="/" className="hb-mobile-link" onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
                <Link to="/profile" className="hb-mobile-link" onClick={() => setIsMobileMenuOpen(false)}>Profile</Link>
              </>
            )}
            {user && (
              <Link to="/workspace" className="hb-mobile-link" onClick={() => setIsMobileMenuOpen(false)}>Workspace</Link>
            )}
            {!user && (
              <div className="hb-mobile-auth">
                <Link to="/login" className="hb-mobile-link" onClick={() => setIsMobileMenuOpen(false)}>Login</Link>
                <Link to="/signup" className="hb-btn-cta text-center" onClick={() => setIsMobileMenuOpen(false)}>Get Started Free</Link>
              </div>
            )}
          </div>
        )}
      </header>

      <CreateJoinRoomModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      <style>{`
        .hb-navbar {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 50;
          transition: background 0.3s, box-shadow 0.3s, border-color 0.3s;
          border-bottom: 1px solid transparent;
        }
        .hb-navbar-solid {
          background: var(--surface-solid);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border-bottom-color: var(--line);
          box-shadow: var(--shadow-soft);
        }
        .hb-navbar-inner {
          max-width: 1240px;
          margin: 0 auto;
          padding: 0 24px;
          height: 62px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .hb-nav-left-group { display: flex; align-items: center; gap: 22px; min-width: 0; }

        .hb-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .hb-brand-icon {
          width: 34px; height: 34px;
          border-radius: 10px;
          background: linear-gradient(135deg, var(--brand), var(--violet) 60%, var(--cyan));
          display: flex; align-items: center; justify-content: center;
          color: var(--brand-ink);
          box-shadow: 0 6px 18px -6px var(--glow);
          flex-shrink: 0;
          transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .hb-brand:hover .hb-brand-icon { transform: rotate(-8deg) scale(1.06); }
        .hb-brand-name {
          font-family: var(--font-display);
          font-size: 17px;
          font-weight: 800;
          color: var(--ink);
          letter-spacing: -0.02em;
        }

        .hb-nav-links { display: flex; align-items: center; gap: 2px; }
        .hb-nav-link {
          color: var(--ink-faint);
          font-size: 13.5px;
          font-weight: 600;
          text-decoration: none;
          padding: 7px 12px;
          border-radius: 9px;
          transition: color 0.2s, background 0.2s;
          white-space: nowrap;
        }
        .hb-nav-link:hover { color: var(--ink); background: var(--brand-soft); }
        .hb-nav-link-active { color: var(--brand-text); background: var(--brand-soft); }
        .hb-nav-accent { color: var(--brand-text); }

        .hb-nav-right { display: flex; align-items: center; gap: 10px; }

        .hb-btn-primary {
          display: flex; align-items: center; gap: 6px;
          background: var(--brand);
          color: var(--brand-ink);
          border: none;
          font-size: 13px; font-weight: 700;
          padding: 8px 16px;
          border-radius: 999px;
          cursor: pointer;
          transition: transform 0.15s, filter 0.2s;
          box-shadow: 0 6px 18px -8px var(--glow);
          white-space: nowrap;
        }
        .hb-btn-primary:hover { filter: brightness(1.1); transform: translateY(-1px); }

        .hb-btn-cta {
          background: var(--ink);
          color: var(--bg);
          font-size: 13px; font-weight: 700;
          text-decoration: none;
          padding: 8px 18px;
          border-radius: 999px;
          transition: opacity 0.2s, transform 0.15s;
          white-space: nowrap;
        }
        .hb-btn-cta:hover { opacity: 0.85; transform: translateY(-1px); }

        .hb-btn-ghost {
          color: var(--ink-soft);
          font-size: 13.5px; font-weight: 600;
          text-decoration: none;
          padding: 7px 12px;
          border-radius: 9px;
          transition: color 0.2s, background 0.2s;
        }
        .hb-btn-ghost:hover { color: var(--ink); background: var(--brand-soft); }

        .hb-icon-btn {
          position: relative;
          background: transparent;
          border: 1px solid var(--line-strong);
          color: var(--ink-soft);
          width: 34px; height: 34px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: color 0.2s, background 0.2s, border-color 0.2s;
          flex-shrink: 0;
        }
        .hb-icon-btn:hover { color: var(--ink); background: var(--brand-soft); border-color: var(--brand-line); }
        .hb-theme-icon { display: flex; transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .hb-theme-sun:hover, .hb-theme-moon:hover { transform: rotate(30deg); }

        .hb-notif-count {
          position: absolute; top: -4px; right: -4px;
          min-width: 16px; height: 16px;
          border-radius: 999px;
          background: var(--bad);
          color: var(--brand-ink);
          font-size: 9.5px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          padding: 0 4px;
          border: 2px solid var(--bg);
        }

        .hb-user-btn {
          display: flex; align-items: center; gap: 7px;
          background: transparent;
          border: 1px solid var(--line-strong);
          color: var(--ink-soft);
          font-size: 13px; font-weight: 600;
          padding: 4px 10px 4px 4px;
          border-radius: 999px;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
        }
        .hb-user-btn:hover { background: var(--brand-soft); border-color: var(--brand-line); color: var(--ink); }
        .hb-avatar {
          width: 26px; height: 26px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--brand), var(--violet));
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 800; color: var(--brand-ink);
          flex-shrink: 0;
        }

        .hb-dropdown-wrap { position: relative; }
        .hb-dropdown {
          position: absolute; right: 0; top: calc(100% + 10px);
          background: var(--elev);
          border: 1px solid var(--line-strong);
          border-radius: 14px;
          min-width: 210px;
          box-shadow: var(--shadow);
          z-index: 55;
          overflow: hidden;
          animation: hbDropIn 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes hbDropIn { from { opacity: 0; transform: translateY(-6px) scale(0.97); } to { opacity: 1; transform: none; } }
        .hb-dropdown-header {
          padding: 12px 16px;
          border-bottom: 1px solid var(--line);
          display: flex; align-items: center; justify-content: space-between;
          font-size: 12.5px; font-weight: 700; color: var(--ink);
        }
        .hb-dropdown-header button { background: none; border: none; cursor: pointer; color: var(--ink-faint); }
        .hb-dropdown-header button:hover { color: var(--ink); }
        .hb-role-badge {
          font-size: 10px; font-weight: 700;
          background: var(--brand-soft); color: var(--brand-text);
          border: 1px solid var(--brand-line);
          padding: 2px 8px; border-radius: 999px;
          text-transform: capitalize;
        }
        .hb-dropdown-item {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 16px;
          color: var(--ink-soft);
          font-size: 13px; font-weight: 600;
          text-decoration: none;
          background: none; border: none; cursor: pointer;
          width: 100%; text-align: left;
          transition: color 0.15s, background 0.15s;
        }
        .hb-dropdown-item:hover { color: var(--ink); background: var(--brand-soft); }
        .hb-dropdown-danger { color: var(--bad); }
        .hb-dropdown-danger:hover { background: rgba(74,74,74,0.08); }
        .hb-dropdown-divider { border: none; border-top: 1px solid var(--line); margin: 4px 0; }
        .hb-dropdown-empty { padding: 18px 16px; color: var(--ink-faint); font-size: 12px; text-align: center; line-height: 1.5; }

        .hb-feed-list { max-height: 260px; overflow-y: auto; }
        .hb-feed-item {
          display: flex; align-items: flex-start; gap: 9px;
          padding: 10px 14px;
          font-size: 12.5px; color: var(--ink-soft);
          border-bottom: 1px solid var(--line);
        }
        .hb-feed-item:last-child { border-bottom: none; }
        .hb-feed-dot { width: 7px; height: 7px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; }
        .hb-feed-dot-info { background: var(--cyan); }
        .hb-feed-dot-ok { background: var(--ok); }
        .hb-feed-dot-warn { background: var(--warn); }
        .hb-feed-dot-brand { background: var(--brand); }
        .hb-feed-dot-event { background: var(--violet); }
        .hb-feed-dot-chat { background: var(--lime); }

        .hb-overlay { position: fixed; inset: 0; z-index: 54; }

        .hb-mobile-toggle { display: none; }
        .hb-mobile-menu {
          background: var(--surface-solid);
          border-top: 1px solid var(--line);
          padding: 14px 24px 20px;
          display: flex; flex-direction: column; gap: 2px;
          box-shadow: var(--shadow-soft);
        }
        .hb-mobile-link {
          color: var(--ink-soft); font-size: 14px; font-weight: 600;
          text-decoration: none;
          padding: 10px 8px; border-radius: 9px;
          transition: color 0.15s, background 0.15s;
        }
        .hb-mobile-link:hover { color: var(--ink); background: var(--brand-soft); }
        .hb-mobile-auth {
          display: flex; flex-direction: column; gap: 8px;
          padding-top: 12px; margin-top: 8px;
          border-top: 1px solid var(--line);
        }

        @media (max-width: 1024px) {
          .hb-nav-links { display: none; }
        }
        @media (max-width: 768px) {
          .hb-mobile-toggle { display: flex; }
          .hb-username { display: none; }
          .hb-navbar-inner { padding: 0 16px; }
        }
      `}</style>
    </>
  );
};

export default Navbar;
