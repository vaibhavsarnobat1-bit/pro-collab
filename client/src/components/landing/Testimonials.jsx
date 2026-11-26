import React from 'react';
import { testimonials } from '../../content/landingContent';

export default function Testimonials() {
  return (
    <section id="customers2" style={{ padding: '96px 24px' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <h2 className="lp-text-balance" style={{ fontSize: 'clamp(30px,4vw,44px)', fontWeight: 600, letterSpacing: '-0.03em', textAlign: 'center', marginBottom: 40 }}>
          What teams say.
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px,1fr))', gap: 20 }}>
          {testimonials.map((t) => (
            <figure key={t.name} className="lp-depth lp-surface lp-sq" style={{ padding: 24, margin: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <blockquote style={{ margin: 0, color: 'var(--lp-fg)', fontSize: 15, lineHeight: 1.6 }}>{t.quote}</blockquote>
              <figcaption style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="lp-round" style={{ width: 38, height: 38, background: ['#ff7a45', '#8b5cf6', '#06b6d4', '#ec4899', '#10b981', '#f59e0b'][testimonials.indexOf(t) % 6], color: '#ffffff', display: 'grid', placeItems: 'center', fontWeight: 600, fontSize: 15 }}>
                  {t.name.charAt(0)}
                </span>
                <span>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</div>
                  <div style={{ color: 'var(--lp-faint)', fontSize: 13 }}>{t.role}</div>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
