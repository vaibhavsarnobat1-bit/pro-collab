import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CreateJoinRoomModal from './CreateJoinRoomModal';
import { Code2, ShieldAlert, LogOut, Monitor, PlusCircle, Menu, X, ChevronDown, Bell } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Hide the navbar and announcement bar completely on login and signup pages
  if (location.pathname === '/login' || location.pathname === '/signup') {
    return null;
  }

  const isWorkspace = location.pathname.startsWith('/workspace');

  const navLinks = isWorkspace ? [] : [
    { path: '/#features', label: 'Features' },
    { path: '/#how-it-works', label: 'How It Works' },
    { path: '/#open-source', label: 'Open Source' },
  ];

  const authNavLinks = [
    { path: '/workspace', label: 'Workspace', icon: Monitor, auth: true },
    { path: '/admin-dashboard', label: 'Admin', icon: ShieldAlert, auth: true, admin: true },
  ];

  return (
    <>
      {/* ── Main Navbar ── */}
      <header className={`hb-navbar ${isScrolled ? 'hb-navbar-scrolled' : ''}`}>
        <div className="hb-navbar-inner">

          {/* Left Nav Links */}
          <nav className="hb-nav-left" aria-label="Main navigation">
            {!isWorkspace && navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.path}
                className="hb-nav-link"
              >
                {link.label}
              </Link>
            ))}
            {isWorkspace && (
              <Link
                to="/"
                className="hb-nav-link flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                ← Back to Home
              </Link>
            )}
            {user && authNavLinks.map((link) => {
              const shouldShow = !link.admin || user.role === 'admin';
              if (!shouldShow) return null;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`hb-nav-link ${location.pathname === link.path ? 'hb-nav-link-active' : ''}`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Center Brand Logo */}
          <Link to="/" className="hb-brand" aria-label="ProCollab Home">
            <div className="hb-brand-icon">
              <Code2 size={18} />
            </div>
            <span className="hb-brand-name">ProCollab</span>
          </Link>

          {/* Right Auth / Actions */}
          <div className="hb-nav-right">
            {/* Create/Join Room */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="hb-btn-outline"
              id="navbar-create-room-btn"
            >
              <PlusCircle size={14} />
              <span className="hidden sm:inline">Create / Join Group</span>
              <span className="sm:hidden">Group</span>
            </button>

            {user ? (
              <>
                {/* Notifications */}
                <div className="hb-dropdown-wrap">
                  <button
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                    className="hb-icon-btn"
                    aria-label="Notifications"
                  >
                    <Bell size={16} />
                    <span className="hb-notif-dot" />
                  </button>
                  {notificationsOpen && (
                    <>
                      <div className="hb-dropdown" style={{ minWidth: 260 }}>
                        <div className="hb-dropdown-header">
                          <span>Notifications</span>
                          <button onClick={() => setNotificationsOpen(false)}><X size={14} /></button>
                        </div>
                        <div className="hb-dropdown-empty">No new notifications</div>
                      </div>
                      <div className="hb-overlay" onClick={() => setNotificationsOpen(false)} />
                    </>
                  )}
                </div>

                {/* User Dropdown */}
                <div className="hb-dropdown-wrap">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="hb-user-btn"
                    aria-expanded={dropdownOpen}
                  >
                    <div className="hb-avatar">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden md:block">{user.username}</span>
                    <ChevronDown size={13} className={dropdownOpen ? 'rotate-180' : ''} style={{ transition: 'transform 0.2s' }} />
                  </button>
                  {dropdownOpen && (
                    <>
                      <div className="hb-dropdown">
                        <div className="hb-dropdown-header">
                          <span>{user.username}</span>
                          <span className="hb-role-badge">{user.role}</span>
                        </div>
                        <Link to="/workspace" className="hb-dropdown-item" onClick={() => setDropdownOpen(false)}>
                          <Monitor size={14} /> Workspace
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
                <Link to="/signup" className="hb-btn-primary" id="navbar-get-started-btn">
                  Get Started Free
                </Link>
              </>
            )}

            {/* Mobile hamburger */}
            <button
              className="hb-icon-btn hb-mobile-toggle"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="hb-mobile-menu">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.path}
                className="hb-mobile-link"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {!user && (
              <>
                <Link to="/login" className="hb-mobile-link" onClick={() => setIsMobileMenuOpen(false)}>Login</Link>
                <Link to="/signup" className="hb-btn-primary" onClick={() => setIsMobileMenuOpen(false)}>Get Started Free</Link>
              </>
            )}
          </div>
        )}
      </header>

      {/* Group Modal */}
      <CreateJoinRoomModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      <style>{`
        /* ── Navbar ── */
        .hb-navbar {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 50;
          transition: background 0.3s, box-shadow 0.3s, border-color 0.3s;
          border-bottom: 1px solid transparent;
        }
        .hb-navbar-scrolled {
          background: rgba(13,15,18,0.97);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom-color: rgba(255,255,255,0.08);
          box-shadow: 0 2px 20px rgba(0,0,0,0.4);
        }
        .hb-navbar-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 32px;
          height: 64px;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
        }

        /* ── Left Nav ── */
        .hb-nav-left {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .hb-nav-link {
          color: #9ca3af;
          font-size: 13.5px;
          font-weight: 500;
          text-decoration: none;
          padding: 6px 12px;
          border-radius: 8px;
          transition: color 0.2s, background 0.2s;
        }
        .hb-nav-link:hover { color: #fff; background: rgba(255,255,255,0.05); }
        .hb-nav-link-active { color: #fff; background: rgba(255,255,255,0.07); }

        /* ── Brand ── */
        .hb-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          justify-self: center;
        }
        .hb-brand-icon {
          width: 34px; height: 34px;
          border-radius: 10px;
          background: linear-gradient(135deg, #6366f1, #818cf8);
          display: flex; align-items: center; justify-content: center;
          color: #fff;
          box-shadow: 0 0 18px rgba(99,102,241,0.45);
          flex-shrink: 0;
        }
        .hb-brand-name {
          font-size: 17px;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.03em;
        }

        /* ── Right Nav ── */
        .hb-nav-right {
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: flex-end;
        }

        /* Buttons */
        .hb-btn-ghost {
          color: #d1d5db;
          font-size: 13.5px;
          font-weight: 500;
          text-decoration: none;
          padding: 7px 14px;
          border-radius: 8px;
          transition: color 0.2s, background 0.2s;
        }
        .hb-btn-ghost:hover { color: #fff; background: rgba(255,255,255,0.06); }

        .hb-btn-primary {
          background: #fff;
          color: #0d0f12;
          font-size: 13.5px;
          font-weight: 700;
          text-decoration: none;
          padding: 8px 18px;
          border-radius: 20px;
          border: none;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s;
          white-space: nowrap;
        }
        .hb-btn-primary:hover { opacity: 0.88; transform: translateY(-1px); }

        .hb-btn-outline {
          display: flex; align-items: center; gap: 6px;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.15);
          color: #d1d5db;
          font-size: 13px;
          font-weight: 500;
          padding: 7px 14px;
          border-radius: 20px;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s, color 0.2s;
          white-space: nowrap;
        }
        .hb-btn-outline:hover { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.3); color: #fff; }

        /* Icon button */
        .hb-icon-btn {
          position: relative;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.1);
          color: #9ca3af;
          width: 36px; height: 36px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: color 0.2s, background 0.2s;
          flex-shrink: 0;
        }
        .hb-icon-btn:hover { color: #fff; background: rgba(255,255,255,0.07); }
        .hb-notif-dot {
          position: absolute; top: 7px; right: 7px;
          width: 7px; height: 7px;
          border-radius: 50%; background: #6366f1;
          border: 1.5px solid #0d0f12;
        }

        /* User button */
        .hb-user-btn {
          display: flex; align-items: center; gap: 7px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: #d1d5db;
          font-size: 13px;
          font-weight: 500;
          padding: 5px 10px 5px 6px;
          border-radius: 20px;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
        }
        .hb-user-btn:hover { background: rgba(255,255,255,0.09); border-color: rgba(255,255,255,0.2); color: #fff; }
        .hb-avatar {
          width: 26px; height: 26px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #a855f7);
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 800; color: #fff;
          flex-shrink: 0;
        }

        /* Dropdowns */
        .hb-dropdown-wrap { position: relative; }
        .hb-dropdown {
          position: absolute; right: 0; top: calc(100% + 10px);
          background: #161b22;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px;
          min-width: 200px;
          box-shadow: 0 16px 50px rgba(0,0,0,0.5);
          z-index: 55;
          overflow: hidden;
          animation: animateIn 0.2s ease forwards;
        }
        .hb-dropdown-header {
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          display: flex; align-items: center; justify-content: space-between;
          font-size: 12.5px; font-weight: 600; color: #f1f5f9;
        }
        .hb-dropdown-header button { background: none; border: none; cursor: pointer; color: #6b7280; }
        .hb-dropdown-header button:hover { color: #fff; }
        .hb-role-badge {
          font-size: 10px; font-weight: 700;
          background: rgba(99,102,241,0.2); color: #818cf8;
          border: 1px solid rgba(99,102,241,0.3);
          padding: 2px 7px; border-radius: 999px;
          text-transform: capitalize;
        }
        .hb-dropdown-item {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 16px;
          color: #9ca3af;
          font-size: 13px; font-weight: 500;
          text-decoration: none;
          background: none; border: none; cursor: pointer;
          width: 100%; text-align: left;
          transition: color 0.15s, background 0.15s;
        }
        .hb-dropdown-item:hover { color: #fff; background: rgba(255,255,255,0.05); }
        .hb-dropdown-danger { color: #f87171; }
        .hb-dropdown-danger:hover { color: #fca5a5; background: rgba(239,68,68,0.08); }
        .hb-dropdown-divider { border: none; border-top: 1px solid rgba(255,255,255,0.07); margin: 4px 0; }
        .hb-dropdown-empty { padding: 16px; color: #6b7280; font-size: 12.5px; text-align: center; }
        .hb-overlay { position: fixed; inset: 0; z-index: 54; }

        /* Mobile */
        .hb-mobile-toggle { display: none; }
        .hb-mobile-menu {
          background: rgba(13,15,18,0.99);
          border-top: 1px solid rgba(255,255,255,0.07);
          padding: 16px 24px 20px;
          display: flex; flex-direction: column; gap: 4px;
        }
        .hb-mobile-link {
          color: #9ca3af; font-size: 14px; font-weight: 500;
          text-decoration: none;
          padding: 10px 8px; border-radius: 8px;
          transition: color 0.15s, background 0.15s;
        }
        .hb-mobile-link:hover { color: #fff; background: rgba(255,255,255,0.05); }

        @media (max-width: 768px) {
          .hb-mobile-toggle { display: flex; }
          .hb-nav-left { display: none; }
          .hb-navbar-inner { grid-template-columns: 1fr auto 1fr; padding: 0 16px; }
          .hb-btn-outline span.hidden { display: none; }
        }
        @media (max-width: 480px) {
          .hb-brand-name { display: none; }
          .hb-btn-outline { padding: 7px 10px; }
        }
      `}</style>
    </>
  );
};

export default Navbar;