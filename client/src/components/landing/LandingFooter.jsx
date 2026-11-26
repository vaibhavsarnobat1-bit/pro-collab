import React from 'react';
import { footer } from '../../content/landingContent';
import BrandLogo from './BrandLogo';

export default function LandingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer style={{ padding: '72px 24px 32px' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <div style={{ borderBottom: '1px solid var(--lp-line)', paddingBottom: 40, display: 'grid', gridTemplateColumns: '1.5fr repeat(4,1fr)', gap: 24 }}>
          <div>
            <BrandLogo size={28} />
            <p style={{ color: 'var(--lp-faint)', fontSize: 14, marginTop: 10, maxWidth: 220, lineHeight: 1.6 }}>{footer.blurb}</p>
          </div>
          {footer.columns.map((col) => (
            <div key={col.title}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--lp-fg)', marginBottom: 12 }}>{col.title}</div>
              {col.links.map((l) => (
                <div key={l} style={{ color: 'var(--lp-muted)', fontSize: 14, padding: '4px 0', cursor: 'pointer' }}>{l}</div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ paddingTop: 24, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, color: 'var(--lp-faint)', fontSize: 13 }}>
          <span>© {year} {footer.copyright}</span>
          <span>Made with care.</span>
        </div>
      </div>
    </footer>
  );
}
