import React from 'react';
import { brand } from '../../content/landingContent';

export default function BrandLogo({ size = 32 }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="pcLogoGrad" x1="2" y1="2" x2="34" y2="34" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ff7a45" />
            <stop offset="55%" stopColor="#9d6bff" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>
        <rect x="1.5" y="1.5" width="33" height="33" rx="10" fill="#141216" stroke="url(#pcLogoGrad)" strokeWidth="2" />
        {/* Left & right collaborative code brackets */}
        <path
          d="M14 12.5L9.5 18L14 23.5"
          stroke="#ffffff"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M22 12.5L26.5 18L22 23.5"
          stroke="url(#pcLogoGrad)"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Live sync node */}
        <circle cx="18" cy="18" r="2.3" fill="#ff7a45" />
      </svg>
      <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.025em', color: 'var(--lp-fg)' }}>
        {brand.name}
      </span>
    </span>
  );
}
