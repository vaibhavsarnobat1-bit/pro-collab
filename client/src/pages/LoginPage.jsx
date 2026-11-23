import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ScrambleText from '../components/ScrambleText';
import '../styles/auth.css';
import {
  Code2, Eye, EyeOff, AlertCircle, ArrowLeft, Shield, Video, Zap,
  Sun, Moon, Check, Users, Radio
} from 'lucide-react';

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

  const quickFill = (u, p) => { setUsername(u); setPassword(p); setError(''); };

  return (
    <div className="au-screen">
      <div className="au-grid" aria-hidden="true" />

      <div className="au-topbar">
        <Link to="/" className="au-pill"><ArrowLeft size={15} /> Home</Link>
        <button className="au-pill" onClick={toggleTheme} aria-label="Toggle colour scheme">
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>
      </div>

      <div className="au-shell">
        <aside className="au-left">
          <div className="au-brand">
            <span className="au-logo"><Code2 size={18} /></span>
            <span className="au-wordmark">ProCollab</span>
          </div>

          <h2 className="au-left-title">
            <ScrambleText text="One buffer," delay={100} /><br />many keyboards.
          </h2>
          <p className="au-left-sub">
            Sign in to reopen your rooms, saved snippets and activity history across devices.
          </p>

          <div className="au-points">
            <div className="au-point"><Zap size={15} /><div><strong>Delta sync</strong><span>Character edits land in under 20 ms.</span></div></div>
            <div className="au-point"><Video size={15} /><div><strong>P2P calls</strong><span>WebRTC video, mic and screen share in-room.</span></div></div>
            <div className="au-point"><Shield size={15} /><div><strong>Role-gated</strong><span>JWT-verified routes; admin portal stays separate.</span></div></div>
          </div>

          <div className="au-terminal">
            <div className="au-term-head"><span className="au-dots"><i /><i /><i /></span><span>session</span></div>
            <div className="au-term-body">
              <p><span className="au-prompt">$</span> pro-collab auth --list</p>
              <p className="au-out">admin       role=admin   demo tenant</p>
              <p className="au-out">demo_user   role=user    shared rooms</p>
              <p className="au-cur">▍</p>
            </div>
          </div>
        </aside>

        <section className="au-right">
          <div className="au-card-head">
            <h1>Sign in</h1>
            <p>Use your credentials, or jump into a demo room without an account.</p>
          </div>

          {error && <div className="au-err" role="alert"><AlertCircle size={14} /> {error}</div>}

          <form onSubmit={handleSubmit} className="au-form" noValidate>
            <label className="au-field">
              <span>username</span>
              <input
                type="text" value={username} autoComplete="username" autoFocus
                onChange={(e) => setUsername(e.target.value)} placeholder="admin"
              />
            </label>

            <label className="au-field">
              <span>password</span>
              <div className="au-pass">
                <input
                  type={showPassword ? 'text' : 'password'} value={password} autoComplete="current-password"
                  onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </label>

            <button type="button" className={`au-remember ${rememberMe ? 'au-on' : ''}`} onClick={() => setRememberMe((v) => !v)}>
              <span className="au-check"><Check size={11} /></span> Keep me signed in on this device
            </button>

            <button type="submit" className="au-submit" disabled={isSubmitting} id="login-submit-btn">
              {isSubmitting ? <span className="au-spin" /> : 'Enter workspace'}
            </button>
          </form>

          <div className="au-quick">
            <span className="au-quick-label"><Radio size={11} /> demo accounts</span>
            <div className="au-pills">
              <button onClick={() => quickFill('admin', 'admin123')}>admin / admin123</button>
              <button onClick={() => quickFill('demo_user', 'user123')}>demo_user / user123</button>
            </div>
          </div>

          <p className="au-foot">
            New here? <Link to="/signup">Create a free account</Link> · or skip auth with a <Link to="/demo">demo room</Link>
          </p>

          <div className="au-trust"><Users size={12} /> Rooms, chat and editor state sync live once you are in.</div>
        </section>
      </div>
    </div>
  );
};

export default LoginPage;
