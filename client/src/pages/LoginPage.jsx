import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Eye, EyeOff, AlertCircle, ArrowLeft, Sun, Moon } from 'lucide-react';
import InteractiveGrid from '../components/landing/InteractiveGrid';
import BrandLogo from '../components/landing/BrandLogo';

const REMEMBER_KEY = 'pro_collab_remember';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    const remembered = localStorage.getItem(REMEMBER_KEY);
    if (remembered) {
      setUsername(remembered);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (user) navigate(user.role === 'admin' ? '/admin-dashboard' : '/workspace', { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Please fill in both username and password fields.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(username, password);
    setIsSubmitting(false);

    if (result.success) {
      if (rememberMe) localStorage.setItem(REMEMBER_KEY, username.trim().toLowerCase());
      else localStorage.removeItem(REMEMBER_KEY);
      navigate(result.redirect || (result.user?.role === 'admin' ? '/admin-dashboard' : '/workspace'));
    } else {
      setError(result.message);
    }
  };

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

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420, animation: 'lp-auth-in .6s cubic-bezier(.22,1,.36,1) both' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Link to="/" className="lp-btn lp-btn-ghost" style={{ textDecoration: 'none', padding: '8px 12px' }}>
            <ArrowLeft size={16} /> Home
          </Link>
          <button type="button" onClick={toggleTheme} className="lp-btn lp-btn-ghost lp-round" aria-label="Toggle theme" style={{ width: 36, height: 36, padding: 0 }}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

        <div className="lp-depth lp-surface lp-sq" style={{ padding: '34px 30px' }}>
          <div style={{ textAlign: 'center', marginBottom: 26 }}>
            <div style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: 14 }}>
              <BrandLogo size={36} />
            </div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--lp-fg)' }}>Sign in</h1>
            <p style={{ color: 'var(--lp-muted)', marginTop: 6, fontSize: 14 }}>Welcome back to Pro-Collab.</p>
          </div>

          {error && (
            <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '10px 12px', marginBottom: 16, fontSize: 13.5 }}>
              <AlertCircle size={15} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <span style={{ fontSize: 13, color: 'var(--lp-muted)', fontWeight: 500 }}>Username</span>
              <input
                className="lp-input lp-auth-input"
                type="text"
                value={username}
                autoComplete="username"
                autoFocus
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <span style={{ fontSize: 13, color: 'var(--lp-muted)', fontWeight: 500 }}>Password</span>
              <div style={{ position: 'relative' }}>
                <input
                  className="lp-input lp-auth-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  autoComplete="current-password"
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--lp-muted)' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <button
              type="submit"
              className="lp-btn"
              disabled={isSubmitting}
              style={{
                width: '100%',
                marginTop: 4,
                padding: '13px 18px',
                fontSize: 15,
                fontWeight: 600,
                background: 'linear-gradient(135deg, #ff7a45, #f97316)',
                color: '#ffffff',
                boxShadow: '0 10px 26px -10px rgba(255, 122, 69, 0.7)',
              }}
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, marginBottom: 0, fontSize: 14, color: 'var(--lp-muted)' }}>
            New here? <Link to="/signup" style={{ color: '#ff7a45', textDecoration: 'none', fontWeight: 600 }}>Create an account</Link>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes lp-auth-in {
          from { opacity: 0; transform: translateY(18px) scale(0.98); }
          to { opacity: 1; transform: none; }
        }
        .lp-auth-input:focus {
          outline: 2px solid #ff7a45 !important;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
