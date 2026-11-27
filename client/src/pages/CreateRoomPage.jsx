import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import InteractiveGrid from '../components/landing/InteractiveGrid';
import BrandLogo from '../components/landing/BrandLogo';
import { CreateJoinRoomForm } from '../components/CreateJoinRoomModal';

export default function CreateRoomPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="lp-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflow: 'hidden' }}>
      <InteractiveGrid />
      <div
        className="lp-orange-glow"
        aria-hidden="true"
        style={{
          position: 'fixed',
          width: 860,
          height: 640,
          top: '50%',
          left: '50%',
          marginLeft: -430,
          marginTop: -320,
          zIndex: 0,
          opacity: 1,
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 620, animation: 'lp-modal-in .5s cubic-bezier(.22,1,.36,1) both' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <Link to="/" className="lp-btn lp-btn-ghost" style={{ textDecoration: 'none', padding: '8px 12px' }}>
            <ArrowLeft size={16} /> Home
          </Link>
          <BrandLogo size={32} />
          <button type="button" onClick={toggleTheme} className="lp-btn lp-btn-ghost lp-round" aria-label="Toggle theme" style={{ width: 36, height: 36, padding: 0 }}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

        <div className="lp-depth lp-surface lp-sq" style={{ padding: '28px 28px 24px' }}>
          <div style={{ marginBottom: 18 }}>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--lp-fg)' }}>Start collaborating</h1>
            <p style={{ margin: '4px 0 0', color: 'var(--lp-muted)', fontSize: 14 }}>Create a new room or join an existing one.</p>
          </div>
          <CreateJoinRoomForm isActive showHeader={false} />
        </div>
      </div>
    </div>
  );
}
