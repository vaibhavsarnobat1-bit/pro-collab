import React from 'react';
import { howItWorks } from '../../content/landingContent';
import { useReveal } from './landingHooks';

export default function HowItWorks() {
  return (
    <section id="how" style={{ padding: '96px 24px' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', textAlign: 'center' }}>
        <p style={{ color: 'var(--lp-accent)', fontSize: 13, letterSpacing: '0.06em' }}>{howItWorks.eyebrow}</p>
        <h2 className="lp-text-balance" style={{ fontSize: 'clamp(30px,4vw,44px)', fontWeight: 600, letterSpacing: '-0.03em', margin: '10px 0 40px' }}>
          {howItWorks.heading}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px,1fr))', gap: 20, textAlign: 'left' }}>
          {howItWorks.steps.map((s) => (
            <Step key={s.num} step={s} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Step({ step }) {
  const ref = useReveal();
  return (
    <div ref={ref} className="lp-reveal lp-depth lp-surface lp-sq" style={{ padding: 28 }}>
      <div style={{ fontSize: 13, color: 'var(--lp-accent-2)', fontWeight: 600, letterSpacing: '0.08em' }}>{step.num}</div>
      <h3 style={{ fontSize: 19, margin: '12px 0 8px', fontWeight: 600 }}>{step.title}</h3>
      <p style={{ color: 'var(--lp-muted)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{step.body}</p>
    </div>
  );
}
