import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { faq } from '../../content/landingContent';
import { useReveal } from './landingHooks';

function Item({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lp-depth lp-surface lp-sq" style={{ overflow: 'hidden' }}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          background: 'none',
          border: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          padding: '20px 24px',
          fontSize: 16,
          fontWeight: 600,
          color: 'var(--lp-fg)',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {item.q}
        <ChevronDown size={18} style={{ flex: 'none', transition: 'transform .3s', transform: open ? 'rotate(180deg)' : 'none', color: 'var(--lp-muted)' }} />
      </button>
      <div className={`lp-acc ${open ? 'open' : ''}`}>
        <div className="lp-acc-inner">
          <p style={{ margin: 0, padding: '0 24px 22px', color: 'var(--lp-muted)', fontSize: 14, lineHeight: 1.7 }}>{item.a}</p>
        </div>
      </div>
    </div>
  );
}

export default function FAQ() {
  const ref = useReveal();
  return (
    <section style={{ padding: '96px 24px' }}>
      <div ref={ref} className="lp-reveal" style={{ maxWidth: 760, margin: '0 auto' }}>
        <h2 className="lp-text-balance" style={{ fontSize: 'clamp(30px,4vw,44px)', fontWeight: 600, letterSpacing: '-0.03em', textAlign: 'center', marginBottom: 40 }}>
          {faq.heading}
        </h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {faq.items.map((item) => (
            <Item key={item.q} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
