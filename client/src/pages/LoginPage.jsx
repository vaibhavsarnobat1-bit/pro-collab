import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DeveloperBackgroundVideo from '../components/DeveloperBackgroundVideo';
import {
  Code2, Eye, EyeOff, AlertCircle, CheckSquare,
  Square, ArrowLeft, Shield, Video, Zap, Terminal, Sparkles
} from 'lucide-react';

/* ─── Google "G" logo SVG ─── */
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

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
      if (result.redirect) {
        navigate(result.redirect);
      } else {
        navigate(result.user?.role === 'admin' ? '/admin-dashboard' : '/workspace');
      }
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="login-screen-wrap">
      {/* Dynamic Developer Code & Mesh Video Canvas Background */}
      <DeveloperBackgroundVideo overlayOpacity={0.68} showGrid={true} />

      {/* Top back navigation */}
      <div className="login-top-bar">
        <Link to="/" className="login-back-btn">
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Main Glassmorphism Auth Container */}
      <div className="login-container">
        {/* Left Project Visual Panel */}
        <div className="login-left-panel">
          <div className="login-brand-header">
            <div className="login-brand-icon">
              <Code2 size={22} />
            </div>
            <span className="login-brand-text">ProCollab</span>
          </div>

          <div className="login-intro">
            <span className="login-badge-tag">
              <Sparkles size={12} /> Real-Time Dev Suite
            </span>
            <h2 className="login-intro-title">
              Code Together in Real-Time
            </h2>
            <p className="login-intro-sub">
              Access your collaborative rooms, shared Monaco editor sessions, and WebRTC video conferencing.
            </p>
          </div>

          <div className="login-feature-list">
            <div className="login-feat-item">
              <div className="login-feat-icon text-lime-400">
                <Zap size={16} />
              </div>
              <div>
                <h4 className="login-feat-name">Instant Delta Sync</h4>
                <p className="login-feat-detail">Sub-20ms multi-cursor character sync across peers</p>
              </div>
            </div>

            <div className="login-feat-item">
              <div className="login-feat-icon text-sky-400">
                <Video size={16} />
              </div>
              <div>
                <h4 className="login-feat-name">WebRTC P2P Video</h4>
                <p className="login-feat-detail">Built-in 1080p video calls and high-FPS screen sharing</p>
              </div>
            </div>

            <div className="login-feat-item">
              <div className="login-feat-icon text-indigo-400">
                <Shield size={16} />
              </div>
              <div>
                <h4 className="login-feat-name">JWT Security & In-Memory Store</h4>
                <p className="login-feat-detail">Role-based admin access and persistent room history</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="login-right-panel">
          <div className="login-form-inner">
            <div className="login-form-header">
              <h1 className="login-title">Sign In</h1>
              <p className="login-sub">Enter your credentials to access your workspace</p>
            </div>

            {error && (
              <div className="login-error-banner" role="alert">
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form" noValidate>
              <div className="login-field">
                <label htmlFor="login-username" className="login-label">Username</label>
                <div className="login-input-wrap">
                  <input
                    id="login-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username (e.g. admin or user)"
                    className="login-input"
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              </div>

              <div className="login-field">
                <div className="login-label-row">
                  <label htmlFor="login-password" className="login-label">Password</label>
                </div>
                <div className="login-input-wrap">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="login-input"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="login-eye-btn"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="login-options-row">
                <button
                  type="button"
                  className="login-remember-btn"
                  onClick={() => setRememberMe((v) => !v)}
                >
                  {rememberMe ? (
                    <CheckSquare size={16} className="text-indigo-400" />
                  ) : (
                    <Square size={16} className="text-slate-500" />
                  )}
                  <span>Remember session</span>
                </button>
              </div>

              <button
                type="submit"
                id="login-submit-btn"
                disabled={isSubmitting}
                className="login-btn-primary"
              >
                {isSubmitting ? (
                  <span className="login-spinner" />
                ) : (
                  'Sign In to Workspace'
                )}
              </button>

              <div className="login-divider">
                <span className="login-divider-line" />
                <span className="login-divider-text">or continue with</span>
                <span className="login-divider-line" />
              </div>

              <button
                type="button"
                id="login-google-btn"
                className="login-btn-google"
                onClick={() => setError('Google sign-in is disabled in local mode.')}
              >
                <GoogleIcon />
                <span>Google (Local Mode)</span>
              </button>
            </form>

            <p className="login-bottom-link">
              Don't have an account?{' '}
              <Link to="/signup" className="text-indigo-400 font-bold hover:underline">
                Create free account
              </Link>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .login-screen-wrap {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          position: relative;
          color: #fff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .login-top-bar {
          position: absolute;
          top: 24px;
          left: 28px;
          z-index: 20;
        }

        .login-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #cbd5e1;
          font-size: 13px;
          font-weight: 600;
          padding: 8px 16px;
          border-radius: 20px;
          text-decoration: none;
          backdrop-filter: blur(10px);
          transition: all 0.2s;
        }
        .login-back-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
          transform: translateX(-2px);
        }

        .login-container {
          width: 100%;
          max-width: 940px;
          background: rgba(12, 17, 29, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 24px;
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.7), 0 0 40px rgba(99, 102, 241, 0.15);
          backdrop-filter: blur(25px);
          display: flex;
          overflow: hidden;
          position: relative;
          z-index: 10;
          margin-top: 40px;
        }

        /* Left Panel */
        .login-left-panel {
          flex: 1.1;
          padding: 48px 40px;
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(9, 13, 24, 0.95) 100%);
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .login-brand-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 28px;
        }
        .login-brand-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: linear-gradient(135deg, #6366f1, #818cf8);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          box-shadow: 0 0 16px rgba(99, 102, 241, 0.4);
        }
        .login-brand-text {
          font-size: 18px;
          font-weight: 800;
          letter-spacing: -0.02em;
        }

        .login-badge-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(99, 102, 241, 0.15);
          border: 1px solid rgba(99, 102, 241, 0.3);
          color: #a5b4fc;
          font-size: 11.5px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 999px;
          margin-bottom: 12px;
        }
        .login-intro-title {
          font-size: 24px;
          font-weight: 800;
          color: #fff;
          line-height: 1.25;
          margin-bottom: 8px;
        }
        .login-intro-sub {
          font-size: 13px;
          color: #94a3b8;
          line-height: 1.55;
          margin-bottom: 32px;
        }

        .login-feature-list {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .login-feat-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }
        .login-feat-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .login-feat-name {
          font-size: 13px;
          font-weight: 700;
          color: #f1f5f9;
          margin-bottom: 2px;
        }
        .login-feat-detail {
          font-size: 11.5px;
          color: #64748b;
          line-height: 1.4;
        }

        /* Right Panel */
        .login-right-panel {
          flex: 1.2;
          padding: 44px 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(8, 12, 22, 0.7);
        }
        .login-form-inner {
          width: 100%;
          max-width: 360px;
        }

        .login-form-header {
          margin-bottom: 24px;
        }
        .login-title {
          font-size: 22px;
          font-weight: 800;
          color: #fff;
          margin-bottom: 4px;
          letter-spacing: -0.02em;
        }
        .login-sub {
          font-size: 12.5px;
          color: #64748b;
        }

        .login-error-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #fca5a5;
          padding: 9px 12px;
          border-radius: 10px;
          font-size: 12px;
          margin-bottom: 18px;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        .login-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .login-label {
          font-size: 12px;
          font-weight: 600;
          color: #94a3b8;
        }
        .login-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .login-hint-link {
          background: none;
          border: none;
          font-size: 11.5px;
          color: #818cf8;
          cursor: pointer;
          padding: 0;
          text-decoration: underline;
        }

        .login-input-wrap {
          position: relative;
        }
        .login-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 13px;
          color: #fff;
          outline: none;
          box-sizing: border-box;
          transition: all 0.2s;
        }
        .login-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
          background: rgba(255, 255, 255, 0.07);
        }
        .login-eye-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          display: flex;
          align-items: center;
        }
        .login-eye-btn:hover {
          color: #cbd5e1;
        }

        .login-options-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .login-remember-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          color: #94a3b8;
          font-size: 12px;
          cursor: pointer;
          padding: 0;
        }

        .login-btn-primary {
          width: 100%;
          background: #6366f1;
          color: #fff;
          border: none;
          padding: 11px;
          border-radius: 10px;
          font-size: 13.5px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
          transition: all 0.2s;
        }
        .login-btn-primary:hover:not(:disabled) {
          background: #4f46e5;
          transform: translateY(-1px);
        }
        .login-btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .login-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .login-divider {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 4px 0;
        }
        .login-divider-line {
          flex: 1;
          height: 1px;
          background: rgba(255, 255, 255, 0.08);
        }
        .login-divider-text {
          font-size: 11px;
          color: #64748b;
        }

        .login-btn-google {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #cbd5e1;
          padding: 9px;
          border-radius: 10px;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .login-btn-google:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.2);
          color: #fff;
        }

        .login-demo-box {
          margin-top: 18px;
          padding-top: 14px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          text-align: center;
        }
        .login-demo-label {
          font-size: 11px;
          color: #64748b;
          margin-bottom: 8px;
        }
        .login-demo-btns {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .login-demo-pill {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.09);
          color: #cbd5e1;
          font-size: 11.5px;
          font-weight: 600;
          padding: 6px 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .login-demo-pill:hover {
          background: rgba(99, 102, 241, 0.2);
          border-color: rgba(99, 102, 241, 0.4);
          color: #fff;
        }

        .login-bottom-link {
          text-align: center;
          font-size: 12.5px;
          color: #64748b;
          margin-top: 16px;
        }

        @media (max-width: 800px) {
          .login-left-panel { display: none; }
          .login-container { max-width: 440px; }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;