import React from 'react';
import { hero } from '../../content/landingContent';

function MockWindow() {
  const files = [
    { name: 'App.jsx', active: true, color: 'var(--brand)' },
    { name: 'socket.js', active: false, color: 'var(--cyan)' },
    { name: 'Preview.jsx', active: false, color: 'var(--violet)' },
    { name: 'styles.css', active: false, color: 'var(--lp-faint)' },
  ];
  const codeLines = [
    [
      { text: 'import ', color: 'var(--violet)' },
      { text: '{ useRoom } ', color: 'var(--lp-fg)' },
      { text: 'from ', color: 'var(--violet)' },
      { text: "'./socket'", color: 'var(--cyan)' },
    ],
    [
      { text: 'export function ', color: 'var(--violet)' },
      { text: 'Workspace', color: 'var(--brand)' },
      { text: '() {', color: 'var(--lp-fg)' },
    ],
    [
      { text: '  const ', color: 'var(--violet)' },
      { text: '{ code, cursors } = ', color: 'var(--lp-fg)' },
      { text: 'useRoom', color: 'var(--cyan)' },
      { text: "('team-sync')", color: 'var(--brand)' },
    ],
    [
      { text: '  return ', color: 'var(--violet)' },
      { text: '<LivePreview ', color: 'var(--cyan)' },
      { text: 'source={code} cursors={cursors} />', color: 'var(--lp-fg)' },
    ],
    [{ text: '}', color: 'var(--lp-fg)' }],
  ];

  return (
    <div className="lp-depth lp-surface-2 lp-sq" style={{ width: '100%', overflow: 'hidden', textAlign: 'left' }}>
      {/* title bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--lp-line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
          <span style={{ marginLeft: 12, fontSize: 12, color: 'var(--lp-faint)' }}>Pro-Collab · room/team-sync</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--lp-muted)' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#28c840' }} />
          <span>3 online · Live Preview</span>
        </div>
      </div>

      <div className="lp-hero-mock-grid">
        {/* file explorer */}
        <div className="lp-hero-mock-explorer" style={{ borderRight: '1px solid var(--lp-line)', padding: 14, display: 'grid', gap: 6, alignContent: 'start' }}>
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--lp-faint)', marginBottom: 4 }}>Explorer</span>
          {files.map((f) => (
            <div
              key={f.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 8px',
                borderRadius: 8,
                fontSize: 12,
                background: f.active ? 'var(--lp-surface)' : 'transparent',
                color: f.active ? 'var(--lp-fg)' : 'var(--lp-muted)',
                fontWeight: f.active ? 500 : 400,
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: f.color, flex: 'none' }} />
              <span>{f.name}</span>
            </div>
          ))}
        </div>

        {/* shared code editor */}
        <div className="lp-hero-mock-editor" style={{ borderRight: '1px solid var(--lp-line)', padding: '14px 18px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12, lineHeight: 2, position: 'relative', background: 'var(--lp-surface)', overflowX: 'auto' }}>
          <div style={{ fontSize: 11, color: 'var(--lp-faint)', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span>src / App.jsx</span>
            <span style={{ color: 'var(--brand)' }}>Synced</span>
          </div>
          {codeLines.map((tokens, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 12 }}>
              <span style={{ color: 'var(--lp-faint)', width: 14, textAlign: 'right', userSelect: 'none' }}>{idx + 1}</span>
              <span>
                {tokens.map((t, j) => (
                  <span key={j} style={{ color: t.color }}>{t.text}</span>
                ))}
              </span>
            </div>
          ))}
          {/* live cursor badge */}
          <div style={{ position: 'absolute', top: 96, right: 44, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 2, height: 16, background: 'var(--brand)', borderRadius: 2 }} />
            <span style={{ fontSize: 10, fontFamily: 'inherit', background: 'var(--brand)', color: 'var(--brand-ink)', padding: '1px 6px', borderRadius: 6, fontWeight: 600 }}>Aria</span>
          </div>
        </div>

        {/* live preview & room */}
        <div style={{ padding: 14, display: 'grid', gap: 12, alignContent: 'start' }}>
          <div style={{ background: 'var(--lp-surface)', borderRadius: 12, padding: 12, border: '1px solid var(--lp-line)', display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--lp-fg)' }}>Live Preview</span>
              <span style={{ fontSize: 10, color: 'var(--cyan)' }}>● 60fps</span>
            </div>
            <div style={{ height: 6, width: '75%', borderRadius: 4, background: 'var(--brand)' }} />
            <div style={{ height: 6, width: '92%', borderRadius: 4, background: 'var(--lp-line-strong)' }} />
            <div style={{ height: 6, width: '60%', borderRadius: 4, background: 'var(--lp-line)' }} />
          </div>

          <div style={{ background: 'var(--lp-surface)', borderRadius: 12, padding: 12, border: '1px solid var(--lp-line)', display: 'grid', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--lp-fg)' }}>Room Call &amp; AI</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {[['A', 'var(--brand)'], ['N', 'var(--violet)'], ['M', 'var(--cyan)']].map(([init, c]) => (
                <span key={init} style={{ width: 24, height: 24, borderRadius: '50%', background: c, color: '#111', fontSize: 11, fontWeight: 700, display: 'grid', placeItems: 'center' }}>
                  {init}
                </span>
              ))}
              <span style={{ fontSize: 11, color: 'var(--lp-muted)', marginLeft: 4 }}>Voice active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section id="top" className="lp-noise lp-hero-section" style={{ position: 'relative', textAlign: 'center', overflow: 'hidden' }}>
      {/* backdrop */}
      <div className="lp-aurora lp-aurora-a" style={{ width: 420, height: 420, top: -80, left: '8%' }} />
      <div className="lp-aurora lp-aurora-b" style={{ width: 380, height: 380, top: 40, right: '4%' }} />
      <div className="lp-aurora lp-aurora-c" style={{ width: 360, height: 360, bottom: 0, left: '38%' }} />

      <div style={{ position: 'relative', maxWidth: 768, margin: '0 auto' }}>
        <h1
          className="lp-text-balance"
          style={{ fontSize: 'clamp(40px, 8vw, 76px)', lineHeight: 1.04, fontWeight: 600, letterSpacing: '-0.035em', margin: 0 }}
        >
          {hero.title1}
          <br />
          <span className="lp-text-gradient">{hero.titleGradient}</span>
          <br />
          {hero.title2}
        </h1>

        <p style={{ fontSize: 'clamp(17px, 2vw, 19px)', color: 'var(--lp-muted)', maxWidth: 560, margin: '18px auto 0', lineHeight: 1.6 }} className="lp-text-pretty">
          {hero.subtitle}
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 28, flexWrap: 'wrap' }}>
          <a href="#projects" className="lp-btn lp-btn-primary" style={{ fontSize: 15, padding: '13px 22px' }}>{hero.ctaPrimary}</a>
          <a href="#how" className="lp-btn lp-btn-ghost" style={{ fontSize: 15, padding: '13px 22px' }}>{hero.ctaSecondary}</a>
        </div>
        <p style={{ fontSize: 13, color: 'var(--lp-faint)', marginTop: 14 }}>{hero.footnote}</p>
      </div>

      {/* mockup */}
      <div style={{ position: 'relative', maxWidth: 1040, margin: '64px auto 0' }}>
        <div
          className="lp-orange-glow"
          style={{
            position: 'absolute',
            inset: '-60px -18%',
          }}
        />
        <div style={{ position: 'relative', animation: 'lp-enter 1.1s cubic-bezier(.22,1,.36,1) both' }}>
          <MockWindow />
        </div>
        <div style={{ height: 140, background: 'linear-gradient(to bottom, var(--lp-bg), transparent)' }} />
      </div>

      <style>{`
        @keyframes lp-enter {
          from { opacity: 0; transform: perspective(1200px) rotateX(12deg) translateY(30px) scale(.97); }
          to { opacity: 1; transform: perspective(1200px) rotateX(0) translateY(0) scale(1); }
        }
      `}</style>
    </section>
  );
}
