import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Moon, PlusCircle, Sun, X } from 'lucide-react';
import { nav } from '../../content/landingContent';
import BrandLogo from './BrandLogo';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import CreateJoinRoomModal from '../CreateJoinRoomModal';

const scrollTo = (id) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

export default function LandingNavbar({ onStarted }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      <header
        className="lp-nav"
        style={{
          position: 'fixed',
          top: 14,
          left: 0,
          right: 0,
          zIndex: 50,
          display: 'flex',
          justifyContent: 'center',
          padding: '0 20px',
          pointerEvents: 'none',
        }}
      >
        <div
          className={`lp-depth ${scrolled || open ? 'lp-sq' : ''}`}
          style={{
            pointerEvents: 'auto',
            maxWidth: 1120,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            padding: '10px 16px',
            borderRadius: 9999,
            transition: 'background .35s cubic-bezier(.22,1,.36,1), box-shadow .35s',
            background: scrolled || open ? 'rgba(18,16,16,0.72)' : 'transparent',
            backdropFilter: scrolled || open ? 'blur(16px)' : 'none',
          }}
        >
          <a
            href="#top"
            onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'var(--lp-fg)' }}
          >
            <BrandLogo size={32} />
          </a>

          <nav className="lp-nav-links-desktop" style={{ gap: 26, marginLeft: 8, flex: 1 }}>
            {nav.links.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => scrollTo(l.id)}
                style={{ background: 'none', border: 0, color: 'var(--lp-muted)', fontSize: 14, cursor: 'pointer', transition: 'color .25s' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--lp-fg)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--lp-muted)')}
              >
                {l.label}
              </button>
            ))}
          </nav>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto' }}>
            <div className="lp-nav-actions-desktop" style={{ gap: 10, alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="lp-btn lp-btn-ghost"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <PlusCircle size={15} />
                <span>New Room</span>
              </button>

              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="lp-btn lp-btn-ghost lp-round"
                style={{ width: 36, height: 36, padding: 0, display: 'grid', placeItems: 'center' }}
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              {user ? (
                <Link to="/workspace" className="lp-btn lp-btn-ghost">Workspace</Link>
              ) : (
                <Link to="/login" className="lp-btn lp-btn-ghost">{nav.signIn}</Link>
              )}

              <button type="button" className="lp-btn lp-btn-primary" onClick={onStarted}>
                {nav.cta}
              </button>
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="lp-btn lp-btn-ghost lp-round lp-nav-menu-btn"
              style={{ width: 36, height: 36, padding: 0, placeItems: 'center' }}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <button
              type="button"
              aria-expanded={open}
              aria-label="Menu"
              onClick={() => setOpen((v) => !v)}
              className="lp-nav-menu-btn"
              style={{ background: 'none', border: 0, color: 'var(--lp-fg)', placeItems: 'center', cursor: 'pointer', padding: 6 }}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {open && (
          <div
            className="lp-depth lp-sq"
            style={{
              pointerEvents: 'auto',
              position: 'fixed',
              top: 74,
              left: 16,
              right: 16,
              background: 'var(--lp-surface-2)',
              padding: 20,
              display: 'grid',
              gap: 8,
              zIndex: 60,
            }}
          >
            {nav.links.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => { scrollTo(l.id); setOpen(false); }}
                style={{ background: 'none', border: 0, color: 'var(--lp-fg)', textAlign: 'left', padding: '12px 6px', fontSize: 16, cursor: 'pointer' }}
              >
                {l.label}
              </button>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button type="button" className="lp-btn lp-btn-ghost" style={{ flex: 1 }} onClick={() => { setOpen(false); setIsModalOpen(true); }}>
                New Room
              </button>
              <Link to={user ? '/workspace' : '/login'} className="lp-btn lp-btn-ghost" style={{ flex: 1 }} onClick={() => setOpen(false)}>
                {user ? 'Workspace' : nav.signIn}
              </Link>
              <button type="button" className="lp-btn lp-btn-primary" style={{ flex: 1 }} onClick={() => { setOpen(false); onStarted(); }}>
                {nav.cta}
              </button>
            </div>
          </div>
        )}
      </header>

      <CreateJoinRoomModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
