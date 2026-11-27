import React, { useState } from 'react';
import { showcase } from '../../content/landingContent';

function EditorPanel() {
  const { file, room, lines } = showcase.editor;
  return (
    <div style={{ display: 'grid', gap: 14, height: '100%', alignContent: 'start' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--lp-surface-2)', borderRadius: 12, padding: '10px 14px', border: '1px solid var(--lp-line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#28c840', boxShadow: '0 0 0 4px rgba(40,200,64,0.18)' }} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>{file}</span>
          <span style={{ fontSize: 12, color: 'var(--lp-faint)' }}>{room}</span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--brand)', fontWeight: 600 }}>● 2 live cursors</span>
      </div>

      <div style={{ position: 'relative', background: 'var(--lp-surface-2)', borderRadius: 14, padding: '18px 18px', border: '1px solid var(--lp-line)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13, lineHeight: 2.1, overflow: 'hidden' }}>
        {lines.map((line, i) => (
          <div key={line.num} className="lp-sc-line" style={{ display: 'flex', gap: 14, animationDelay: `${i * 90}ms` }}>
            <span style={{ color: 'var(--lp-faint)', width: 16, textAlign: 'right', userSelect: 'none' }}>{line.num}</span>
            <span>
              {line.tokens.map((tok, j) => (
                <span key={j} style={{ color: tok.c }}>{tok.t}</span>
              ))}
            </span>
          </div>
        ))}

        {/* animated live cursors */}
        <div className="lp-sc-cursor-a" style={{ position: 'absolute', top: 52, left: '54%', display: 'flex', alignItems: 'center', gap: 3 }}>
          <span style={{ width: 2, height: 18, background: '#ff7a45', borderRadius: 2 }} />
          <span style={{ fontSize: 10, background: '#ff7a45', color: '#ffffff', padding: '1px 7px', borderRadius: 6, fontWeight: 700 }}>Aria</span>
        </div>
        <div className="lp-sc-cursor-b" style={{ position: 'absolute', top: 106, left: '64%', display: 'flex', alignItems: 'center', gap: 3 }}>
          <span style={{ width: 2, height: 18, background: '#8b5cf6', borderRadius: 2 }} />
          <span style={{ fontSize: 10, background: '#8b5cf6', color: '#ffffff', padding: '1px 7px', borderRadius: 6, fontWeight: 700 }}>Noah</span>
        </div>
      </div>

      <style>{`
        .lp-sc-line { animation: lp-sc-fade .45s cubic-bezier(.22,1,.36,1) both; }
        @keyframes lp-sc-fade { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: none; } }
        .lp-sc-cursor-a { animation: lp-sc-glide-a 4.2s ease-in-out infinite; }
        .lp-sc-cursor-b { animation: lp-sc-glide-b 4.8s ease-in-out infinite; }
        @keyframes lp-sc-glide-a {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(56px, 26px); }
        }
        @keyframes lp-sc-glide-b {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-48px, -26px); }
        }
      `}</style>
    </div>
  );
}

function PreviewPanel() {
  const { url, logs } = showcase.preview;
  return (
    <div style={{ display: 'grid', gap: 14, height: '100%', alignContent: 'start' }}>
      <div style={{ background: 'var(--lp-surface-2)', borderRadius: 14, border: '1px solid var(--lp-line)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--lp-line)' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5f57' }} />
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#febc2e' }} />
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#28c840' }} />
          <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--lp-muted)', flex: 1 }}>{url}</span>
          <span className="lp-sc-pulse" style={{ fontSize: 11, color: 'var(--cyan)', fontWeight: 600 }}>● Live HMR</span>
        </div>

        <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="lp-sc-card" style={{ background: 'var(--lp-surface)', borderRadius: 12, padding: 14, border: '1px solid var(--lp-line)', display: 'grid', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--brand)', fontWeight: 600 }}>Active Component</span>
            <span style={{ height: 8, width: '75%', borderRadius: 4, background: 'var(--lp-line-strong)' }} />
            <span style={{ height: 8, width: '55%', borderRadius: 4, background: 'var(--lp-line)' }} />
          </div>
          <div className="lp-sc-card" style={{ background: 'var(--lp-surface)', borderRadius: 12, padding: 14, border: '1px solid var(--lp-line)', display: 'grid', gap: 8, animationDelay: '120ms' }}>
            <span style={{ fontSize: 11, color: 'var(--violet)', fontWeight: 600 }}>Preview State</span>
            <span style={{ height: 8, width: '85%', borderRadius: 4, background: 'var(--lp-line-strong)' }} />
            <span style={{ height: 8, width: '65%', borderRadius: 4, background: 'var(--lp-line)' }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {logs.map((log, i) => (
          <div
            key={i}
            className="lp-sc-log"
            style={{
              background: 'var(--lp-surface-2)',
              borderRadius: 10,
              padding: '9px 14px',
              fontSize: 12,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              color: log.color,
              border: '1px solid var(--lp-line)',
              animationDelay: `${180 + i * 140}ms`,
            }}
          >
            {log.text}
          </div>
        ))}
      </div>

      <style>{`
        .lp-sc-card { animation: lp-sc-pop .5s cubic-bezier(.22,1,.36,1) both; }
        .lp-sc-log { animation: lp-sc-slide .45s cubic-bezier(.22,1,.36,1) both; }
        .lp-sc-pulse { animation: lp-sc-blink 1.8s ease-in-out infinite; }
        @keyframes lp-sc-pop { from { opacity: 0; transform: scale(.95) translateY(8px); } to { opacity: 1; transform: none; } }
        @keyframes lp-sc-slide { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: none; } }
        @keyframes lp-sc-blink { 0%, 100% { opacity: 1; } 50% { opacity: .45; } }
      `}</style>
    </div>
  );
}

function CollabPanel() {
  const { peers, messages } = showcase.collab;
  return (
    <div style={{ display: 'grid', gap: 14, height: '100%', alignContent: 'start' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {peers.map((p, i) => (
          <div
            key={p.name}
            className="lp-sc-peer"
            style={{
              background: 'var(--lp-surface-2)',
              borderRadius: 14,
              padding: '12px 10px',
              border: p.speaking ? '1px solid var(--brand)' : '1px solid var(--lp-line)',
              display: 'grid',
              placeItems: 'center',
              gap: 6,
              animationDelay: `${i * 90}ms`,
            }}
          >
            <div style={{ position: 'relative' }}>
              <span className="lp-round" style={{ width: 34, height: 34, background: p.color, color: '#111', fontWeight: 700, fontSize: 13, display: 'grid', placeItems: 'center' }}>
                {p.name[0]}
              </span>
              {p.speaking && <span className="lp-sc-ring" />}
            </div>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{p.name}</span>
            <span style={{ fontSize: 10, color: p.speaking ? 'var(--brand)' : 'var(--lp-muted)' }}>{p.role}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {messages.map((m, i) => (
          <div
            key={i}
            className="lp-sc-msg"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'var(--lp-surface-2)',
              borderRadius: 12,
              padding: '10px 14px',
              border: '1px solid var(--lp-line)',
              animationDelay: `${160 + i * 130}ms`,
            }}
          >
            <span className="lp-round" style={{ width: 24, height: 24, background: m.color, color: '#111', fontSize: 11, fontWeight: 700, display: 'grid', placeItems: 'center', flex: 'none' }}>
              {m.sender[0]}
            </span>
            <div style={{ fontSize: 13 }}>
              <span style={{ fontWeight: 600 }}>{m.sender}: </span>
              <span style={{ color: 'var(--lp-muted)' }}>{m.text}</span>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .lp-sc-peer { animation: lp-sc-pop .45s cubic-bezier(.22,1,.36,1) both; }
        .lp-sc-msg { animation: lp-sc-slide .45s cubic-bezier(.22,1,.36,1) both; }
        .lp-sc-ring {
          position: absolute;
          inset: -4px;
          border-radius: 9999px;
          border: 2px solid var(--brand);
          animation: lp-sc-ripple 1.6s ease-out infinite;
        }
        @keyframes lp-sc-ripple {
          0% { transform: scale(.9); opacity: .9; }
          100% { transform: scale(1.35); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

const PANELS = { editor: <EditorPanel />, preview: <PreviewPanel />, collab: <CollabPanel /> };

export default function Showcase() {
  const [active, setActive] = useState('editor');
  return (
    <section style={{ padding: '96px 24px' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', display: 'grid', gridTemplateColumns: '320px 1fr', gap: 40, alignItems: 'start' }} className="lp-showcase-grid">
        <div style={{ position: 'sticky', top: 100 }}>
          <p style={{ color: 'var(--lp-accent)', fontSize: 13, letterSpacing: '0.06em' }}>{showcase.eyebrow}</p>
          <h2 style={{ fontSize: 'clamp(28px,3vw,38px)', fontWeight: 600, letterSpacing: '-0.03em', margin: '10px 0 24px' }}>{showcase.heading}</h2>
          <div style={{ display: 'grid', gap: 8 }}>
            {showcase.tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={active === t.id}
                onClick={() => setActive(t.id)}
                style={{
                  textAlign: 'left',
                  background: active === t.id ? 'var(--lp-surface-2)' : 'transparent',
                  border: 0,
                  borderRadius: 12,
                  padding: '12px 16px',
                  fontSize: 15,
                  color: active === t.id ? 'var(--lp-fg)' : 'var(--lp-muted)',
                  cursor: 'pointer',
                  fontWeight: active === t.id ? 600 : 500,
                  transition: 'all .3s cubic-bezier(.22,1,.36,1)',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ position: 'relative' }}>
          <div
            className="lp-orange-glow"
            aria-hidden="true"
            style={{ position: 'absolute', inset: '-48px -14%', zIndex: 0 }}
          />
          <div className="lp-depth lp-surface lp-sq lp-showcase-panel" style={{ overflow: 'hidden', position: 'relative', zIndex: 1 }}>
            <div key={active} style={{ animation: 'lp-tab .35s cubic-bezier(.22,1,.36,1) both' }} className="lp-tab">
              {PANELS[active]}
            </div>
            <style>{`
              .lp-tab { height: 100%; }
              @keyframes lp-tab {
                from { opacity: 0; transform: translateY(8px) scale(.985); }
                to { opacity: 1; transform: none; }
              }
              .lp-line-draw { stroke-dasharray: 1; stroke-dashoffset: 1; animation: lp-draw 1.4s cubic-bezier(.22,1,.36,1) forwards; }
              @keyframes lp-draw { to { stroke-dashoffset: 0; } }
            `}</style>
          </div>
        </div>
      </div>
    </section>
  );
}
