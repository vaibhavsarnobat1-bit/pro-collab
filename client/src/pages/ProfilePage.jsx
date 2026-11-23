import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import CountUp from '../components/CountUp';
import TiltCard from '../components/TiltCard';
import {
  ArrowLeft, Save, Sun, Moon, Copy, Trash2, Code2, Users, Activity,
  FolderGit2, Bell, BellRing, CheckCircle2, AlertCircle, ChevronDown,
  Github, MapPin, Sparkles, RefreshCw, Lock
} from 'lucide-react';

const ACCENTS = ['#6f6f6f', '#8a8a8a', '#919191', '#a6a6a6', '#4a4a4a', '#999999'];

const initialsOf = (name = '') => {
  const parts = name.replace(/[^a-z0-9]+/gi, ' ').trim().split(' ');
  if (!parts[0]) return '?';
  return (parts[0][0] + (parts[1] ? parts[1][0] : parts[0][1] || '')).toUpperCase();
};

const timeAgo = (ts) => {
  if (!ts) return 'recently';
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
};

const ProfilePage = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { notify, enableOsNotifications, osStatus } = useNotifications();

  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [snippets, setSnippets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState('');
  const [error, setError] = useState('');
  const [openSnippet, setOpenSnippet] = useState(null);

  const load = useMemo(() => async () => {
    setLoading(true);
    setError('');
    try {
      const [me, snips] = await Promise.all([
        api.get('/user/me'),
        api.get('/user/me/snippets'),
      ]);
      setProfile(me.data.profile);
      setStats(me.data.stats);
      setSnippets(snips.data.snippets || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not reach the profile API.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const patch = (key, value) => setProfile((p) => (p ? { ...p, [key]: value } : p));

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.patch('/user/me', {
        displayName: profile.displayName,
        bio: profile.bio,
        roleLabel: profile.roleLabel,
        location: profile.location,
        github: profile.github,
        accent: profile.accent,
      });
      setProfile(res.data.profile);
      setSavedAt(new Date().toLocaleTimeString());
      notify('Profile updated', { type: 'success', title: 'ProCollab' });
    } catch (e) {
      notify(e.response?.data?.message || 'Profile save failed', { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const removeSnippet = async (id) => {
    try {
      await api.delete(`/user/me/snippets/${id}`);
      setSnippets((list) => list.filter((s) => (s._id || s.id) !== id));
      notify('Snippet deleted', { type: 'success' });
    } catch (e) {
      notify(e.response?.data?.message || 'Delete failed', { type: 'error' });
    }
  };

  const copySnippet = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      notify('Code copied to clipboard', { type: 'success' });
    } catch (e) {
      notify('Clipboard blocked by the browser', { type: 'error' });
    }
  };

  const enableNotifications = async () => {
    const ok = await enableOsNotifications();
    notify(ok ? 'Desktop notifications enabled' : 'Notification permission dismissed', {
      type: ok ? 'success' : 'info',
    });
  };

  const accent = profile?.accent || '#6f6f6f';
  const name = profile?.displayName || profile?.username || user?.username || 'Developer';

  return (
    <div className="pf-screen">
      <div className="pf-grid" aria-hidden="true" />

      <header className="pf-topbar">
        <div className="pf-topbar-left">
          <Link to="/" className="pf-pill"><ArrowLeft size={15} /> Home</Link>
          <Link to="/workspace" className="pf-pill">Workspace</Link>
        </div>
        <button className="pf-pill" onClick={toggleTheme} aria-label="Toggle colour scheme">
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>
      </header>

      <main className="pf-main">
        <section className="pf-hero" style={{ '--accent': accent }}>
          <div className="pf-avatar">{initialsOf(name)}</div>
          <div className="pf-hero-text">
            <div className="pf-eyebrow">§ profile · {profile?.roleLabel || 'Developer'}</div>
            <h1 className="pf-name">{name}</h1>
            <p className="pf-bio">{profile?.bio || 'No bio yet — tell your teammates what you build.'}</p>
            <div className="pf-meta">
              <span><Users size={12} /> @{profile?.username || user?.username}</span>
              {profile?.location && <span><MapPin size={12} /> {profile.location}</span>}
              {profile?.github && <span><Github size={12} /> {profile.github}</span>}
              {profile?.joinedAt && <span><Sparkles size={12} /> joined {new Date(profile.joinedAt).toLocaleDateString()}</span>}
              {user?.role === 'admin' && <span className="pf-admin"><Lock size={12} /> admin</span>}
            </div>
          </div>
          <div className="pf-hero-side">
            {error
              ? <button className="pf-pill" onClick={load}><RefreshCw size={14} /> Retry</button>
              : <button className="pf-pill" onClick={enableNotifications}>
                  {osStatus === 'granted' ? <BellRing size={14} /> : <Bell size={14} />}
                  <span>{osStatus === 'granted' ? 'Alerts on' : 'Enable alerts'}</span>
                </button>}
          </div>
        </section>

        <section className="pf-stats">
          {[
            { icon: Activity, label: 'logged actions', value: stats?.activities ?? 0 },
            { icon: FolderGit2, label: 'rooms touched', value: stats?.rooms ?? 0 },
            { icon: Code2, label: 'saved snippets', value: stats?.snippets ?? snippets.length },
            { icon: Users, label: 'people on server', value: stats?.totalUsers ?? 0 },
          ].map(({ icon: Icon, label, value }) => (
            <TiltCard key={label} className="pf-stat">
              <Icon size={16} className="pf-stat-icon" />
              <div className="pf-stat-num"><CountUp value={value} /></div>
              <div className="pf-stat-label">{label}</div>
            </TiltCard>
          ))}
        </section>

        {error && <div className="pf-err"><AlertCircle size={14} /> {error}</div>}
        {loading && !error && <div className="pf-loading"><span className="pf-spin" /> Loading your workspace data…</div>}

        <div className="pf-cols">
          <section className="pf-card">
            <div className="pf-card-head">
              <h2>Identity</h2>
              <p>Stored server-side, keyed to your user id. Works with or without MongoDB.</p>
            </div>

            <div className="pf-fields">
              <label><span>display name</span>
                <input value={profile?.displayName || ''} onChange={(e) => patch('displayName', e.target.value)} placeholder={user?.username || 'name'} />
              </label>
              <label><span>role label</span>
                <input value={profile?.roleLabel || ''} onChange={(e) => patch('roleLabel', e.target.value)} placeholder="Frontend engineer" />
              </label>
              <label className="pf-full"><span>bio</span>
                <textarea rows={3} value={profile?.bio || ''} onChange={(e) => patch('bio', e.target.value)} placeholder="What do you build with your team?" />
              </label>
              <label><span>location</span>
                <input value={profile?.location || ''} onChange={(e) => patch('location', e.target.value)} placeholder="Pune, IN" />
              </label>
              <label><span>github handle</span>
                <input value={profile?.github || ''} onChange={(e) => patch('github', e.target.value)} placeholder="vaibh" />
              </label>
              <div className="pf-full">
                <span className="pf-swatches-label">accent</span>
                <div className="pf-swatches">
                  {ACCENTS.map((c) => (
                    <button key={c} className={`pf-swatch ${profile?.accent === c ? 'pf-swatch-on' : ''}`}
                      style={{ background: c }} onClick={() => patch('accent', c)} aria-label={`Accent ${c}`} />
                  ))}
                </div>
              </div>
            </div>

            <div className="pf-actions">
              <button className="pf-save" onClick={save} disabled={saving || !profile}>
                {saving ? <span className="pf-spin" /> : <><Save size={14} /> Save profile</>}
              </button>
              {savedAt && <span className="pf-saved"><CheckCircle2 size={13} /> saved at {savedAt}</span>}
            </div>
          </section>

          <section className="pf-card">
            <div className="pf-card-head">
              <h2>Snippet library <em>{snippets.length}</em></h2>
              <p>Save any open editor buffer to your account from inside a room.</p>
            </div>

            {!snippets.length ? (
              <div className="pf-empty">
                <Code2 size={20} />
                <p>Nothing saved yet. Open a room, then use <strong>Save to library</strong> above the editor.</p>
              </div>
            ) : (
              <div className="pf-snips">
                {snippets.map((s) => {
                  const id = s._id || s.id;
                  const open = openSnippet === id;
                  return (
                    <article key={id} className="pf-snip">
                      <button className="pf-snip-head" onClick={() => setOpenSnippet(open ? null : id)}>
                        <ChevronDown size={14} className={open ? 'pf-chev pf-chev-on' : 'pf-chev'} />
                        <span className="pf-snip-title">{s.title}</span>
                        <span className="pf-snip-lang">{s.language}</span>
                        <span className="pf-snip-time">{timeAgo(s.updatedAt || s.createdAt)}</span>
                      </button>
                      {open && (
                        <div className="pf-snip-body">
                          <pre>{s.code}</pre>
                          <div className="pf-snip-acts">
                            <button onClick={() => copySnippet(s.code)}><Copy size={13} /> Copy</button>
                            <button className="pf-del" onClick={() => removeSnippet(id)}><Trash2 size={13} /> Delete</button>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      <style>{`
        .pf-screen { min-height: 100vh; background: var(--bg); color: var(--ink); padding: 22px 20px 64px; position: relative; }
        .pf-grid { position: absolute; inset: 0; pointer-events: none;
          background-image: linear-gradient(to right, var(--line) 1px, transparent 1px), linear-gradient(to bottom, var(--line) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, #000 10%, transparent 75%);
          -webkit-mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, #000 10%, transparent 75%); }

        /* The global navbar is already fixed at the top, so this row stays in flow. */
        .pf-topbar { width: 100%; max-width: 1120px; margin: 0 auto 18px; display: flex; justify-content: space-between;
          align-items: center; gap: 10px; }
        .pf-topbar-left { display: flex; gap: 10px; }
        .pf-pill { display: inline-flex; align-items: center; gap: 7px; text-decoration: none; background: var(--surface);
          border: 1px solid var(--line-strong); color: var(--ink-soft); font-size: 12.5px; font-weight: 700; padding: 8px 14px;
          border-radius: 999px; cursor: pointer; transition: all 0.2s; font-family: inherit; }
        .pf-pill:hover { color: var(--ink); border-color: var(--brand-line); background: var(--brand-soft); }

        .pf-main { position: relative; z-index: 1; max-width: 1120px; margin: 0 auto; display: flex; flex-direction: column; gap: 22px; }

        .pf-hero { display: flex; align-items: center; gap: 22px; background: var(--surface-solid); border: 1px solid var(--line-strong);
          border-radius: 20px; padding: 26px 28px; box-shadow: var(--shadow); position: relative; overflow: hidden; }
        .pf-hero::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--accent); }
        .pf-avatar { width: 82px; height: 82px; border-radius: 20px; background: var(--accent); color: #fff; display: flex;
          align-items: center; justify-content: center; font-family: var(--font-display); font-size: 30px; font-weight: 800;
          box-shadow: 0 14px 30px -14px var(--accent); flex-shrink: 0; }
        .pf-hero-text { flex: 1; min-width: 0; }
        .pf-eyebrow { font-family: 'Fira Code', monospace; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.08em;
          color: var(--ink-faint); margin-bottom: 6px; }
        .pf-name { font-family: var(--font-display); font-size: 28px; font-weight: 800; letter-spacing: -0.025em; margin: 0 0 6px; color: var(--ink); }
        .pf-bio { font-size: 13.5px; color: var(--ink-faint); line-height: 1.6; margin: 0 0 12px; max-width: 62ch; }
        .pf-meta { display: flex; flex-wrap: wrap; gap: 8px 16px; font-size: 12px; color: var(--ink-faint); }
        .pf-meta span { display: inline-flex; align-items: center; gap: 6px; }
        .pf-admin { color: var(--warn); font-weight: 700; }
        .pf-hero-side { display: flex; flex-direction: column; gap: 10px; }

        .pf-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
        .pf-stat { background: var(--surface-solid); border: 1px solid var(--line-strong); border-radius: 16px; padding: 18px 20px; }
        .pf-stat-icon { color: var(--brand-text); margin-bottom: 10px; }
        .pf-stat-num { font-family: var(--font-display); font-size: 26px; font-weight: 800; color: var(--ink); letter-spacing: -0.03em; }
        .pf-stat-label { font-family: 'Fira Code', monospace; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em;
          color: var(--ink-faint); margin-top: 3px; }

        .pf-err, .pf-loading { display: flex; align-items: center; gap: 9px; padding: 12px 14px; border-radius: 12px; font-size: 12.5px; }
        .pf-err { background: rgba(74,74,74,0.08); border: 1px solid rgba(74,74,74,0.24); color: var(--bad); }
        .pf-loading { background: var(--surface); border: 1px dashed var(--line-strong); color: var(--ink-faint); }

        .pf-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-items: start; }
        .pf-card { background: var(--surface-solid); border: 1px solid var(--line-strong); border-radius: 18px; padding: 24px; }
        .pf-card-head h2 { font-family: var(--font-display); font-size: 18px; font-weight: 800; color: var(--ink); margin: 0; letter-spacing: -0.02em; }
        .pf-card-head h2 em { font-style: normal; font-family: 'Fira Code', monospace; font-size: 11px; color: var(--brand-text);
          background: var(--brand-soft); border: 1px solid var(--brand-line); border-radius: 999px; padding: 2px 8px; margin-left: 8px; vertical-align: 2px; }
        .pf-card-head p { font-size: 12.5px; color: var(--ink-faint); margin: 5px 0 20px; line-height: 1.55; }

        .pf-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .pf-fields .pf-full { grid-column: 1 / -1; }
        .pf-fields span { display: block; font-family: 'Fira Code', monospace; font-size: 10.5px; text-transform: uppercase;
          letter-spacing: 0.06em; font-weight: 700; color: var(--ink-faint); margin-bottom: 6px; }
        .pf-fields input, .pf-fields textarea { width: 100%; box-sizing: border-box; background: var(--input-bg);
          border: 1px solid var(--line-strong); border-radius: 10px; padding: 10px 12px; font-size: 13.5px; color: var(--ink);
          outline: none; font-family: inherit; resize: vertical; transition: border-color 0.2s, box-shadow 0.2s; }
        .pf-fields input:focus, .pf-fields textarea:focus { border-color: var(--brand); box-shadow: 0 0 0 3px var(--brand-soft); }

        .pf-swatches { display: flex; gap: 9px; }
        .pf-swatch { width: 30px; height: 30px; border-radius: 9px; border: 2px solid transparent; cursor: pointer; transition: transform 0.15s, box-shadow 0.2s; }
        .pf-swatch:hover { transform: translateY(-2px); }
        .pf-swatch-on { border-color: var(--ink); box-shadow: 0 0 0 3px var(--brand-soft); }

        .pf-actions { display: flex; align-items: center; gap: 14px; margin-top: 20px; }
        .pf-save { display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: var(--brand); color: #fff;
          border: none; border-radius: 11px; padding: 11px 18px; font-family: var(--font-display); font-size: 13.5px; font-weight: 700;
          cursor: pointer; transition: filter 0.2s, transform 0.15s; box-shadow: 0 12px 26px -14px var(--glow); min-width: 150px; }
        .pf-save:hover:not(:disabled) { filter: brightness(1.08); transform: translateY(-1px); }
        .pf-save:disabled { opacity: 0.55; cursor: not-allowed; }
        .pf-saved { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--ok); }
        .pf-spin { width: 15px; height: 15px; border: 2px solid rgba(255,255,255,0.32); border-top-color: #fff; border-radius: 50%;
          animation: pfSpin 0.7s linear infinite; }
        .pf-loading .pf-spin { border-color: var(--line-strong); border-top-color: var(--brand); }
        @keyframes pfSpin { to { transform: rotate(360deg); } }

        .pf-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 34px 20px; text-align: center;
          border: 1px dashed var(--line-strong); border-radius: 14px; color: var(--ink-faint); font-size: 12.5px; line-height: 1.6; }
        .pf-empty strong { color: var(--ink-soft); }

        .pf-snips { display: flex; flex-direction: column; gap: 9px; max-height: 460px; overflow: auto; padding-right: 4px; }
        .pf-snip { border: 1px solid var(--line-strong); border-radius: 12px; overflow: hidden; background: var(--surface-3); }
        .pf-snip-head { width: 100%; display: flex; align-items: center; gap: 10px; background: none; border: none; cursor: pointer;
          padding: 11px 13px; text-align: left; color: var(--ink-soft); font-family: inherit; }
        .pf-snip-head:hover { background: var(--brand-soft); }
        .pf-chev { transition: transform 0.2s; flex-shrink: 0; }
        .pf-chev-on { transform: rotate(-180deg); }
        .pf-snip-title { flex: 1; font-size: 13px; font-weight: 700; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .pf-snip-lang { font-family: 'Fira Code', monospace; font-size: 10px; text-transform: uppercase; color: var(--brand-text);
          background: var(--brand-soft); border: 1px solid var(--brand-line); padding: 2px 7px; border-radius: 999px; }
        .pf-snip-time { font-family: 'Fira Code', monospace; font-size: 10.5px; color: var(--ink-faint); }
        .pf-snip-body { border-top: 1px solid var(--line); padding: 12px 13px; }
        .pf-snip-body pre { margin: 0; max-height: 260px; overflow: auto; background: var(--code-bg); color: #dfdfdf;
          border-radius: 10px; padding: 12px 14px; font-family: 'Fira Code', monospace; font-size: 11.5px; line-height: 1.65; }
        .pf-snip-acts { display: flex; gap: 8px; margin-top: 10px; }
        .pf-snip-acts button { display: inline-flex; align-items: center; gap: 6px; background: var(--surface-solid);
          border: 1px solid var(--line-strong); color: var(--ink-soft); font-size: 12px; font-weight: 700; padding: 6px 12px;
          border-radius: 9px; cursor: pointer; transition: all 0.18s; font-family: inherit; }
        .pf-snip-acts button:hover { color: var(--ink); border-color: var(--brand-line); background: var(--brand-soft); }
        .pf-del:hover { color: var(--bad) !important; border-color: rgba(74,74,74,0.35) !important; background: rgba(74,74,74,0.08) !important; }

        @media (max-width: 940px) {
          .pf-cols { grid-template-columns: 1fr; }
          .pf-stats { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 620px) {
          .pf-hero { flex-wrap: wrap; gap: 16px; padding: 22px; }
          .pf-avatar { width: 64px; height: 64px; font-size: 24px; }
          .pf-name { font-size: 23px; }
          .pf-fields { grid-template-columns: 1fr; }
          .pf-screen { padding: 84px 12px 40px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pf-chev, .pf-swatch, .pf-save { transition: none; }
        }
      `}</style>
    </div>
  );
};

export default ProfilePage;
