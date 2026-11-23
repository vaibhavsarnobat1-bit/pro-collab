import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import CreateJoinRoomModal from '../components/CreateJoinRoomModal';
import '../styles/home.css';
import {
  ArrowRight, Check, Code2, Lock, GitBranch, PlusCircle, ArrowUpRight,
  X, Eye, EyeOff, AlertCircle, Download, Upload, Sparkles, Monitor
} from 'lucide-react';

/* ─── Google mark (monochrome) ─── */
const GoogleG = () => (
  <svg width="17" height="17" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path fill="#656565" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#7f7f7f" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#bcbcbc" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#898989" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

const ROOM_SNIPPET = `<!DOCTYPE html>
<html lang="en">
  <head>
    <title>lobby</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <main class="panel">
      <h1>Shared buffer: lobby</h1>
      <p>Anything here is editable by everyone.</p>
    </main>
    <script src="app.js"></script>
  </body>
</html>`;

/* Plates: the six things the workspace actually does, newest first. */
const PLATES = [
  {
    icon: Code2,
    title: 'Live shared editing',
    body: 'When you type, everyone in the room sees it right away. Each person gets a cursor with their name, and the file list stays in sync for all of you.',
    tag: 'monaco · socket'
  },
  {
    icon: Upload,
    title: 'Import your project',
    body: 'Pick a few files or a whole folder from your computer. The room keeps your folder structure, skips node_modules and images, and opens your main page.',
    tag: 'import · folder'
  },
  {
    icon: Download,
    title: 'Download as a zip',
    body: 'Save the whole room on your device in one click. The zip is made inside your browser, so nothing is sent to another service.',
    tag: 'export · zip'
  },
  {
    icon: Monitor,
    title: 'Preview next to the code',
    body: 'See the page while you build it. HTML, CSS and JavaScript run in a safe frame, with console messages and phone or tablet sizes.',
    tag: 'live preview'
  },
  {
    icon: Sparkles,
    title: 'AI with free options',
    body: 'Seven free models are supported: Groq, Gemini, Cerebras, OpenRouter, Mistral, Together and GitHub Models. Add a key for one and it turns on.',
    tag: 'ai · free models'
  },
  {
    icon: ArrowUpRight,
    title: 'AI that edits your files',
    body: 'Ask for a change and the assistant shows which files it wants to rewrite. You press apply, and then everyone in the room gets the update.',
    tag: 'ai · project edits'
  }
];

const SPECS = [
  { k: 'Room chat', v: 'Send a message to the room, or a private message to one person.', tag: 'socket' },
  { k: 'Video and screen share', v: 'Call each other with video or share your screen. Video goes straight between browsers.', tag: 'webrtc' },
  { k: 'Activity history', v: 'Every join, edit and file change is saved with the name of the person who did it.', tag: 'audit' },
  { k: 'Locked rooms', v: 'Add a password when you create a room. Only people who have it can open the room.', tag: 'access' },
  { k: 'Saved snippets', v: 'Save an open file to your account and open it again from your profile.', tag: 'account' },
  { k: 'Admin page', v: 'See accounts, active rooms and connections. Only admins can open it.', tag: 'rbac' }
];

const STEPS = [
  {
    num: '01',
    title: 'Create a room',
    body: 'Give it a name, or use the one we generate. Add a password if it should stay private. You can also open a demo room without an account.',
    meta: 'no sign up needed'
  },
  {
    num: '02',
    title: 'Add your files',
    body: 'Write new files, import the folder you already have, or start from the sample page. Everyone sees the file list update as you go.',
    meta: 'files · folders'
  },
  {
    num: '03',
    title: 'Build and download',
    body: 'Write code with the preview open, ask the assistant for help, then download the finished project as a zip to your computer.',
    meta: 'preview · zip'
  }
];

const FAQS = [
  {
    q: 'Where does my code live?',
    a: 'In the server process memory by default. Set MONGO_URI and rooms, activity logs and snippets persist to MongoDB instead. Self-hosted, the files never leave your machine.'
  },
  {
    q: 'Which AI model do I need a key for?',
    a: 'Any one of the seven free tiers: Groq, Google Gemini, Cerebras, OpenRouter, Mistral, Together or GitHub Models. Put the key in server/.env and the picker shows it as available. OpenAI and Anthropic keys work too if you prefer them.'
  },
  {
    q: 'Does the assistant change my project by itself?',
    a: 'No. It returns a list of file operations and shows you the paths. Nothing is written to the room until you press apply, and when you do the change goes through the same socket path a human edit takes.'
  },
  {
    q: 'Are private messages visible to everyone?',
    a: 'No. A DM is delivered to exactly two connections and is deliberately not written into the shared room transcript, because that transcript is returned to anyone who opens the room.'
  },
  {
    q: 'Can I keep working on my own folder?',
    a: 'Yes. Open a folder from your disk with the file tree’s folder button and edits write straight back to it. Imports go to the room only while you are in room mode, and the export zip works in both.'
  },
  {
    q: 'What happens if the connection drops?',
    a: 'Open buffers stay in the tab, an offline marker appears, and on reconnect the client asks the server for the stored copy of each file so everyone converges on one document.'
  }
];

const HomePage = () => {
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [stats, setStats] = useState(null);
  const [statsLive, setStatsLive] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPass, setShowLoginPass] = useState(false);

  const navigate = useNavigate();
  const { login, user } = useAuth();

  useEffect(() => {
    let alive = true;
    api.get('/stats')
      .then((r) => {
        if (!alive) return;
        if (r.data) { setStats(r.data); setStatsLive(true); }
      })
      .catch(() => { if (alive) setStatsLive(false); });
    return () => { alive = false; };
  }, []);

  const handleLaunchDemo = () => navigate('/demo');

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

  const openAuth = () => (user ? navigate('/workspace') : setIsLoginModalOpen(true));

  // Every figure here comes from GET /api/stats; an em dash stands in until it answers.
  const num = (key) => (stats ? stats[key] ?? 0 : '—');

  return (
    <div className="hx-root">
      {/* ── status rail ── */}
      <div className="hx-status">
        <div className="hx-wrap hx-status-row">
          <span className={`hx-live ${statsLive ? '' : 'is-off'}`}>
            <i className="live-dot" /> {statsLive ? 'api reachable' : 'api offline'}
          </span>
          <span>·</span>
          <span><strong>{num('totalUsers')}</strong> accounts</span>
          <span>·</span>
          <span><strong>{num('totalRooms')}</strong> rooms created</span>
          <span>·</span>
          <span><strong>{num('activeSockets')}</strong> sockets open</span>
          <span className="hx-status-note">no seats · no trials · no upgrade path</span>
        </div>
      </div>

      {/* ── hero ── */}
      <header className="hx-hero">
        <div className="hx-wrap hx-hero-grid">
          <div>
            <p className="hx-kicker">01 / realtime workspace</p>
            <h1 className="hx-title">
              Code together,<br />
              <em>in one room.</em>
            </h1>
            <p className="hx-lede">
              A shared editor with a live preview, chat and video call in the same window.
              Bring the project you are working on, ask the assistant to change a file, then
              download everything to your own computer.
            </p>

            <div className="hx-actions">
              <button type="button" className="hx-btn hx-btn-solid" onClick={() => setIsRoomModalOpen(true)}>
                <PlusCircle size={15} /> Start a room
              </button>
              <button type="button" className="hx-btn hx-btn-line" onClick={handleLaunchDemo}>
                Open a demo room <ArrowRight size={14} />
              </button>
            </div>

            <ul className="hx-assurances">
              <li><Check size={12} /> no account to try</li>
              <li><Check size={12} /> runs without a database</li>
              <li><Check size={12} /> self-hostable</li>
            </ul>
          </div>

          <aside>
            <figure className="hx-figure">
              <figcaption className="hx-fig-head">
                <span>room · lobby</span>
                <span>3 connected</span>
              </figcaption>
              <div className="hx-fig-body">
                <div className="hx-fig-files">
                  <span>app.js</span>
                  <span className="is-on">index.html</span>
                  <span>styles.css</span>
                  <span>notes.md</span>
                </div>
                <pre className="hx-fig-code">{ROOM_SNIPPET}</pre>
              </div>
              <div className="hx-fig-foot">
                <span>character deltas</span>
                <span className="hx-live"><i className="live-dot" /> live</span>
              </div>
            </figure>

            <div className="hx-facts">
              <div className="hx-fact">
                <strong>{num('totalRooms')}</strong>
                <span>rooms</span>
              </div>
              <div className="hx-fact">
                <strong>{num('activeSockets')}</strong>
                <span>sockets</span>
              </div>
              <div className="hx-fact">
                <strong>7</strong>
                <span>free models</span>
              </div>
            </div>
          </aside>
        </div>
      </header>

      {/* ── what changed: the build itself ── */}
      <section className="hx-band" id="features">
        <div className="hx-wrap">
          <div className="hx-band-head">
            <div>
              <p className="hx-kicker">02 / what is inside</p>
              <h2 className="hx-h2">What every room gives you.</h2>
            </div>
            <p className="hx-band-note">
              All of this is on by default. There is no paid plan and nothing to unlock.
            </p>
          </div>

          <div className="hx-plates">
            {PLATES.map((plate, index) => (
              <article className="hx-plate" key={plate.title}>
                <div className="hx-plate-top">
                  <plate.icon size={18} />
                  <span className="hx-plate-num">{String(index + 1).padStart(2, '0')}</span>
                </div>
                <h3>{plate.title}</h3>
                <p>{plate.body}</p>
                <span className="hx-plate-tag">{plate.tag}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── spec sheet ── */}
      <section className="hx-band">
        <div className="hx-wrap">
          <div className="hx-band-head">
            <div>
              <p className="hx-kicker">03 / the rest</p>
              <h2 className="hx-h2">Everything else included.</h2>
            </div>
            <p className="hx-band-note">
              Chat, calls, the history and the admin page. No hidden switch and no plan.
            </p>
          </div>

          <div className="hx-specs">
            {SPECS.map((spec) => (
              <div className="hx-spec" key={spec.k}>
                <span className="hx-spec-k">{spec.k}</span>
                <span className="hx-spec-v">{spec.v}</span>
                <span className="hx-spec-tag">{spec.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── the loop ── */}
      <section className="hx-band" id="how-it-works">
        <div className="hx-wrap">
          <div className="hx-band-head">
            <div>
              <p className="hx-kicker">04 / how it works</p>
              <h2 className="hx-h2">Three steps to start.</h2>
            </div>
          </div>

          {STEPS.map((step) => (
            <div className="hx-step" key={step.num}>
              <div className="hx-step-num">{step.num}</div>
              <div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
              <div className="hx-step-meta">{step.meta}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── ownership ── */}
      <section className="hx-dark" id="open-source">
        <div className="hx-wrap hx-dark-grid">
          <div>
            <p className="hx-kicker">05 / your files</p>
            <p className="hx-quote">Your server.<br />Your files.<br />Your choice.</p>
            <p className="hx-dark-copy">
              Run it on your laptop or on a server. If you want rooms to be saved, point
              MONGO_URI at your own database. If not, everything stays in memory and nothing
              is written to disk. You can always download a room as a zip.
            </p>
            <div className="hx-actions">
              <button type="button" className="hx-btn hx-btn-line" onClick={handleLaunchDemo} style={{ borderColor: 'currentColor', color: 'inherit' }}>
                Open the demo room <ArrowRight size={14} />
              </button>
            </div>
          </div>

          <div className="hx-term">
            <div className="hx-term-head">
              <span>~/pro-collab</span>
              <span>bash</span>
            </div>
            <pre>
<span className="p">$</span> git clone &lt;your pro-collab remote&gt;{'\n'}
<span className="p">$</span> npm run install:all{'\n'}
<span className="p">$</span> cd server &amp;&amp; npm start{'\n'}
<span className="o"># api on :5000 · mongo optional</span>{'\n'}
<span className="p">$</span> cd client &amp;&amp; npm run dev{'\n'}
<span className="o">→ ready at http://localhost:3000</span>{'\n'}
<span className="p">▍</span>
            </pre>
          </div>
        </div>
      </section>

      {/* ── faq ── */}
      <section className="hx-band" id="faq">
        <div className="hx-wrap">
          <div className="hx-band-head">
            <div>
              <p className="hx-kicker">06 / questions</p>
              <h2 className="hx-h2">Common questions.</h2>
            </div>
            <p className="hx-band-note">
              Short answers. If something does not fit your setup, the code is right here.
            </p>
          </div>

          <div className="hx-faq">
            {FAQS.map((item, index) => {
              const isOpen = openFaq === index;
              return (
                <div className={`hx-faq-item ${isOpen ? 'is-open' : ''}`} key={item.q}>
                  <button
                    type="button"
                    className="hx-faq-q"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaq(isOpen ? -1 : index)}
                  >
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <span>{item.q}</span>
                    <span className="sign">{isOpen ? '−' : '+'}</span>
                  </button>
                  <div className="hx-faq-a">
                    <div><p>{item.a}</p></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── close ── */}
      <section className="hx-close">
        <div className="hx-wrap hx-close-grid">
          <div>
            <p className="hx-kicker">free to try, no account needed</p>
            <h2>Open a room and start typing. That is all.</h2>
          </div>
          <div className="hx-close-actions">
            <button type="button" className="hx-btn hx-btn-solid" onClick={() => setIsRoomModalOpen(true)}>
              Start a room <ArrowRight size={14} />
            </button>
            <button type="button" className="hx-btn hx-btn-line" onClick={openAuth}>
              {user ? 'Go to workspace' : 'Sign in'}
            </button>
          </div>
        </div>
      </section>

      {/* ── masthead ── */}
      <footer className="hx-foot">
        <div className="hx-wrap">
          <div className="hx-foot-grid">
            <div className="hx-foot-brand">
              <strong>Pro-Collab</strong>
              <p>Real-time collaborative developer workspace. Self-hostable, no seat limits, no paid tier.</p>
            </div>
            <div className="hx-foot-col">
              <h4>Workspace</h4>
              <Link to="/demo">Demo room</Link>
              <Link to="/workspace">Editor rooms</Link>
              <Link to="/profile">Profile &amp; snippets</Link>
            </div>
            <div className="hx-foot-col">
              <h4>Read</h4>
              <a href="#features">Inside the room</a>
              <a href="#how-it-works">The loop</a>
              <a href="#faq">Fine print</a>
            </div>
            <div className="hx-foot-col">
              <h4>Account</h4>
              <Link to="/login">Sign in</Link>
              <Link to="/signup">Create account</Link>
              <Link to="/admin-dashboard">Admin</Link>
            </div>
          </div>

          <div className="hx-foot-bottom">
            <span>© 2026 Pro-Collab — MIT</span>
            <span><Lock size={10} /> jwt · <GitBranch size={10} /> socket.io + webrtc</span>
          </div>
        </div>
      </footer>

      <CreateJoinRoomModal isOpen={isRoomModalOpen} onClose={() => setIsRoomModalOpen(false)} />

      {isLoginModalOpen && (
        <div className="lm-overlay" onClick={closeLoginModal}>
          <div className="lm-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <button className="lm-close" onClick={closeLoginModal} aria-label="Close"><X size={17} /></button>
            <div className="lm-brand">
              <span className="hb-mini-logo lm-logo"><Code2 size={19} /></span>
              <h2>Welcome back</h2>
              <p>Sign in, or jump straight into the admin portal.</p>
            </div>
            <button className="lm-google" onClick={() => setLoginError('Google sign-in is disabled in local mode.')}>
              <GoogleG /> Continue with Google
            </button>
            <div className="lm-or"><span>or</span></div>
            {loginError && <div className="lm-err"><AlertCircle size={13} /> {loginError}</div>}
            <form onSubmit={handleLoginSubmit} className="lm-form">
              <label>
                <span>Username</span>
                <input type="text" placeholder="admin or demo_user" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} autoFocus />
              </label>
              <label>
                <span>Password</span>
                <div className="lm-pass">
                  <input type={showLoginPass ? 'text' : 'password'} placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
                  <button type="button" onClick={() => setShowLoginPass((v) => !v)} aria-label="Toggle password">
                    {showLoginPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </label>
              <button type="submit" className="lm-submit" disabled={loginLoading}>
                {loginLoading ? <span className="lm-spin" /> : 'Sign in'}
              </button>
            </form>
            <p className="lm-foot">No account? <Link to="/signup" onClick={closeLoginModal}>Create one free</Link></p>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
