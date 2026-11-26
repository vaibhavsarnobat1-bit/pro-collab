import React from 'react';
import { metrics } from '../../content/landingContent';
import { useCountUp } from './landingHooks';

function Metric({ item, delay }) {
  const [ref, value] = useCountUp(item.value, { decimals: item.decimals || 0 });
  const display = item.decimals ? value.toFixed(item.decimals) : value.toLocaleString();
  return (
    <div ref={ref} className="lp-metric" style={{ textAlign: 'center', animationDelay: `${delay}ms` }}>
      <div style={{ fontSize: 'clamp(40px,5vw,56px)', fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--lp-fg)' }}>
        {display}
        <span style={{ color: 'var(--lp-accent)' }}>{item.suffix}</span>
      </div>
      <div style={{ color: 'var(--lp-muted)', fontSize: 14, marginTop: 8 }}>{item.label}</div>
    </div>
  );
}

export default function Metrics() {
  return (
    <section style={{ padding: '96px 24px' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 28 }}>
        {metrics.items.map((m, i) => (
          <Metric key={m.label} item={m} delay={i * 100} />
        ))}
      </div>
      <style>{`
        .lp-metric { animation: lp-metric-in .5s cubic-bezier(.22,1,.36,1) both; }
        @keyframes lp-metric-in { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
      `}</style>
    </section>
  );
}
