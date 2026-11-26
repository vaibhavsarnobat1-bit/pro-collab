import React from 'react';
import { features } from '../../content/landingContent';
import { useReveal } from './landingHooks';

/* ── Bespoke visuals ─────────────────────────────────────── */

/* 1. Shared code editor — syntax-highlighted lines + two live cursors */
function CodeVisual() {
  const lines = [
    ['const ', 'socket', ' = ', 'io()', ''],
    ['', 'socket', '.on(', "'collab'", ', (data) => {'],
    ['  ', 'editor', '.append(data.patch);', ''],
    ['});', ''],
  ];
  return (
    <div style={{ position: 'relative', height: '100%', padding: 24 }}>
      <div style={{ background: 'var(--lp-surface-2)', borderRadius: 14, padding: '14px 16px', height: '100%', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12, lineHeight: 2, boxSizing: 'border-box' }}>
        {lines.map((seg, row) => (
          <div key={row} style={{ display: 'flex', gap: 10 }}>
            <span style={{ color: 'var(--lp-faint)', userSelect: 'none', width: 14, textAlign: 'right' }}>{row + 1}</span>
            <span>
              {seg.map((t, i) => {
                let c = 'var(--lp-fg)';
                if (t === 'const' || t === 'socket') c = 'var(--violet)';
                else if (t === "io()" || t === "'collab'") c = 'var(--cyan)';
                else if (t.startsWith('.')) c = 'var(--brand)';
                return <span key={i} style={{ color: c }}>{t}</span>;
              })}
            </span>
          </div>
        ))}
      </div>
      <div className="lp-cursor-a" style={{ position: 'absolute', top: 56, left: 96, width: 2, height: 18, background: 'var(--brand)', borderRadius: 2 }}>
        <span style={{ position: 'absolute', top: -18, left: -6, fontSize: 10, background: 'var(--brand)', color: 'var(--brand-ink)', borderRadius: 6, padding: '2px 6px', fontWeight: 600 }}>Aria</span>
      </div>
      <div className="lp-cursor-b" style={{ position: 'absolute', top: 84, left: 150, width: 2, height: 18, background: '#b388ff', borderRadius: 2 }}>
        <span style={{ position: 'absolute', top: -18, left: -6, fontSize: 10, background: '#b388ff', color: '#120a1a', borderRadius: 6, padding: '2px 6px', fontWeight: 600 }}>Noah</span>
      </div>
    </div>
  );
}

/* 2. Built-in video calls — participant tiles with a live talker pulse */
const TILE_COLORS = ['var(--brand)', 'var(--violet)', 'var(--cyan)', '#f0b64a'];
function CallVisual() {
  const people = ['Aria', 'Noah', 'Ria', 'Dev'];
  return (
    <div style={{ height: '100%', padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {people.map((p, i) => (
        <div key={p} className={i === 0 ? 'lp-talker' : ''} style={{ borderRadius: 12, background: 'var(--lp-surface-2)', display: 'grid', placeItems: 'center', gap: 4, padding: 10, border: '1px solid var(--lp-line)' }}>
          <div className="lp-round" style={{ width: 34, height: 34, background: `linear-gradient(135deg, ${TILE_COLORS[i]}, transparent)`, display: 'grid', placeItems: 'center', color: 'var(--lp-fg)', fontWeight: 700, fontSize: 13 }}>
            {p[0]}
          </div>
          <span style={{ fontSize: 11, color: 'var(--lp-muted)' }}>{p}</span>
          {i === 0 && <span style={{ fontSize: 9, color: 'var(--brand)', fontWeight: 700 }}>● speaking</span>}
        </div>
      ))}
    </div>
  );
}

/* 3. Instant live preview — browser mock whose preview swaps between views */
function PreviewVisual() {
  const [view, setView] = React.useState(0);
  const views = [
    <div key="a" style={{ display: 'grid', gap: 8, padding: 12 }}>
      <span style={{ height: 10, background: 'var(--brand)', borderRadius: 5, width: '50%' }} />
      <span style={{ height: 8, background: 'var(--lp-line-strong)', borderRadius: 5, width: '90%' }} />
      <span style={{ height: 8, background: 'var(--lp-line)', borderRadius: 5, width: '78%' }} />
      <span style={{ height: 8, background: 'var(--lp-line)', borderRadius: 5, width: '82%' }} />
    </div>,
    <div key="b" style={{ display: 'grid', gap: 8, padding: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--lp-surface-2)', border: '1px solid var(--lp-line-strong)' }} />
        <span style={{ height: 8, background: 'var(--lp-line-strong)', borderRadius: 5, width: '55%' }} />
      </div>
      <span style={{ height: 8, background: 'var(--lp-line)', borderRadius: 5, width: '85%' }} />
      <span style={{ height: 8, background: 'var(--lp-line)', borderRadius: 5, width: '70%' }} />
    </div>,
  ];
  React.useEffect(() => {
    const id = setInterval(() => setView((v) => (v + 1) % views.length), 2600);
    return () => clearInterval(id);
  }, [views.length]);
  return (
    <div style={{ height: '100%', padding: 24 }}>
      <div style={{ background: 'var(--lp-surface-2)', borderRadius: 14, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid var(--lp-line)', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid var(--lp-line)' }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--lp-faint)' }} />
          <span style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--lp-faint)' }} />
          <span style={{ flex: 1, height: 6, background: 'var(--lp-line)', borderRadius: 4, marginLeft: 4 }} />
          <span style={{ fontSize: 9, color: 'var(--brand)', fontWeight: 700 }}>● live</span>
        </div>
        <div style={{ flex: 1, padding: '12px 12px 0', transition: 'opacity .35s ease', opacity: view === 0 ? 1 : 0 }}>{views[0]}</div>
        <div style={{ flex: 1, padding: '12px 12px 0', transition: 'opacity .35s ease', opacity: view === 1 ? 1 : 0 }}>{views[1]}</div>
      </div>
    </div>
  );
}

/* 4. AI pair assistance — prompt with typing dots + suggestion chip */
function AiVisual() {
  return (
    <div style={{ height: '100%', padding: 24, display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
      <div style={{ background: 'var(--lp-raised)', borderRadius: 14, padding: '14px 16px', boxShadow: '0 10px 30px -12px rgba(0,0,0,.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span className="lp-round" style={{ width: 22, height: 22, background: 'var(--brand)', display: 'grid', placeItems: 'center', color: 'var(--brand-ink)', fontSize: 12 }}>✦</span>
          <span style={{ fontSize: 12, color: 'var(--lp-fg)', fontWeight: 600 }}>Assistant</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--lp-fg)', lineHeight: 1.5 }}>
          “Here’s a debounced save handler for your editor —”
        </div>
        <div className="lp-ai-dots" style={{ display: 'flex', gap: 3, marginTop: 8 }}>
          <span style={{ width: 5, height: 5, borderRadius: 3, background: 'var(--lp-faint)' }} />
          <span style={{ width: 5, height: 5, borderRadius: 3, background: 'var(--lp-faint)' }} />
          <span style={{ width: 5, height: 5, borderRadius: 3, background: 'var(--lp-faint)' }} />
        </div>
      </div>
      <div style={{ alignSelf: 'flex-end', background: 'var(--lp-surface-2)', border: '1px solid var(--lp-line-strong)', borderRadius: 12, padding: '10px 14px', fontSize: 12, color: 'var(--lp-fg)' }}>
        auto-save after 400ms? ⏎
      </div>
    </div>
  );
}

const VISUALS = {
  code: <CodeVisual />,
  call: <CallVisual />,
  preview: <PreviewVisual />,
  ai: <AiVisual />,
};

/* ── Section ─────────────────────────────────────────────── */

export default function Features() {
  // layout order: code (wide), call (narrow) / ai (narrow), preview (wide)
  const order = ['code', 'call', 'ai', 'preview'];
  const wide = ['code', 'preview'];
  return (
    <section id="product" style={{ padding: '96px 24px' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <p style={{ color: 'var(--lp-accent)', fontSize: 13, letterSpacing: '0.06em' }}>{features.eyebrow}</p>
        <h2 className="lp-text-balance" style={{ fontSize: 'clamp(30px,4vw,44px)', fontWeight: 600, letterSpacing: '-0.03em', margin: '10px 0 12px', maxWidth: 640 }}>
          {features.heading}
        </h2>
        <p style={{ color: 'var(--lp-muted)', fontSize: 16, maxWidth: 480, marginBottom: 48 }}>{features.description}</p>

        <div className="lp-bento" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gridAutoRows: 320, gap: 20 }}>
          {order.map((id) => {
            const card = features.cards.find((c) => c.visual === id);
            return (
              <Card key={id} card={card} wide={wide.includes(id)} />
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Card({ card, wide }) {
  const ref = useReveal();
  return (
    <div
      ref={ref}
      className={`lp-reveal lp-depth lp-surface lp-sq ${wide ? 'lp-wide' : ''}`}
      style={wide ? { gridColumn: 'span 2', display: 'flex', flexDirection: 'column', overflow: 'hidden' } : { display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <div style={{ flex: 1, minHeight: 0 }}>{VISUALS[card.visual]}</div>
      <div style={{ borderTop: '1px solid var(--lp-line)', padding: '20px 24px', height: 96, boxSizing: 'border-box' }}>
        <div style={{ fontWeight: 600, fontSize: 16 }}>{card.title}</div>
        <div style={{ color: 'var(--lp-muted)', fontSize: 14, lineHeight: 1.5, marginTop: 6 }}>{card.description}</div>
      </div>
    </div>
  );
}
