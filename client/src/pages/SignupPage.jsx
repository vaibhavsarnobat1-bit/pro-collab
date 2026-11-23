import React, { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ScrambleText from '../components/ScrambleText';
import '../styles/auth.css';
import {
  Code2, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowLeft, Shield, Video,
  Users, Sun, Moon, Check, Sparkles, Github
} from 'lucide-react';

const strengthOf = (pw) => {
  if (!pw) return { score: 0, label: 'At least 6 characters' };
  let score = 0;
  if (pw.length >= 6) score += 1;
  if (pw.length >= 10) score += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score += 1;
  if (score === 0) score = 1;
  const labels = ['', 'weak — add length and variety', 'acceptable', 'solid', 'strong: mixed case, digits, symbols'];
  return { score, label: labels[score] };
};

const SignupPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agree, setAgree] = useState(true);

  const { signup, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate(user.role === 'admin' ? '/admin-dashboard' : '/workspace', { replace: true });
  }, [user, navigate]);

  const { score, label } = useMemo(() => strengthOf(password), [password]);
  const passwordsMatch = !!password && !!confirmPassword && password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username || !password || !confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }
    if (username.trim().length < 3) {
      setError('Username needs at least 3 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your passwords.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (!agree) {
      setError('Please accept the sharing notice to continue.');
      return;
    }

    setIsSubmitting(true);
    const result = await signup(username.trim(), password, confirmPassword);
    setIsSubmitting(false);

    if (result.success) navigate('/workspace');
    else setError(result.message);
  };

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
            <ScrambleText text="Your room," delay={100} /><br />your keyboard.
          </h2>
          <p className="au-left-sub">
            One account unlocks shared Monaco buffers, multi-cursor presence, WebRTC calls and a snippet library that travels with you.
          </p>

          <div className="au-points">
            <div className="au-point"><Sparkles size={15} /><div><strong>Free and open</strong><span>No cards, no seat limits, self-hostable.</span></div></div>
            <div className="au-point"><Video size={15} /><div><strong>Rooms with video</strong><span>Peer-to-peer calls and screen share built in.</span></div></div>
            <div className="au-point"><Users size={15} /><div><strong>Private DMs</strong><span>Message one teammate without leaving the editor.</span></div></div>
          </div>

          <div className="au-terminal">
            <div className="au-term-head"><span className="au-dots"><i /><i /><i /></span><span>signup</span></div>
            <div className="au-term-body">
              <p><span className="au-prompt">$</span> pro-collab account create --free</p>
              <p className="au-out">✓ username reserved</p>
              <p className="au-out">✓ workspace provisioned</p>
              <p className="au-cur">▍</p>
            </div>
          </div>
        </aside>

        <section className="au-right">
          <div className="au-card-head">
            <h1>Create account</h1>
            <p>Two fields and you are in — no email verification in local mode.</p>
          </div>

          {error && <div className="au-err" role="alert"><AlertCircle size={14} /> {error}</div>}

          <form onSubmit={handleSubmit} className="au-form" noValidate>
            <label className={`au-field ${username && username.trim().length < 3 ? 'au-bad' : ''}`}>
              <span>username</span>
              <input
                type="text" value={username} autoComplete="username" autoFocus
                onChange={(e) => setUsername(e.target.value)} placeholder="e.g. vaibh"
              />
            </label>

            <label className="au-field">
              <span>password</span>
              <div className="au-pass">
                <input
                  type={showPassword ? 'text' : 'password'} value={password} autoComplete="new-password"
                  onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters"
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <div className={`au-meter au-meter-${score}`} aria-hidden="true">
                <i /><i /><i /><i />
              </div>
              <div className="au-meter-label">{label}</div>
            </label>

            <label className={`au-field ${confirmPassword && !passwordsMatch ? 'au-bad' : ''}`}>
              <span className="au-field-row">
                <span>confirm password</span>
                {passwordsMatch && <span className="au-match"><CheckCircle2 size={12} /> match</span>}
              </span>
              <div className="au-pass">
                <input
                  type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} autoComplete="new-password"
                  onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password"
                />
                <button type="button" onClick={() => setShowConfirmPassword((v) => !v)} aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
                  {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </label>

            <button type="button" className={`au-remember ${agree ? 'au-on' : ''}`} onClick={() => setAgree((v) => !v)}>
              <span className="au-check"><Check size={11} /></span> I understand anyone with a room link can edit it
            </button>

            <button type="submit" className="au-submit" disabled={isSubmitting} id="signup-submit-btn">
              {isSubmitting ? <span className="au-spin" /> : 'Create free account'}
            </button>
          </form>


          <div className="au-good-wrap">
            {passwordsMatch && score >= 2 && (
              <div className="au-good"><CheckCircle2 size={14} /> Credentials look good — press create to enter the workspace.</div>
            )}
          </div>

          <p className="au-foot">
            Already onboard? <Link to="/login">Sign in</Link> · your data stays on this server <Shield size={11} style={{ display: 'inline', verticalAlign: '-1px' }} />
          </p>

          <div className="au-trust"><Github size={12} /> Open source — deploy ProCollab on your own infrastructure.</div>
        </section>
      </div>
    </div>
  );
};

export default SignupPage;
