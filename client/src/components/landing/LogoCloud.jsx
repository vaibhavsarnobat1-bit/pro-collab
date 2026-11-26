import React from 'react';
import { Code2, MessageSquare, MonitorPlay, MousePointer2, Radio, Share2, Sparkles, Video } from 'lucide-react';
import { logoCloud } from '../../content/landingContent';

const ICONS = {
  code: Code2,
  sync: Radio,
  video: Video,
  preview: MonitorPlay,
  ai: Sparkles,
  cursor: MousePointer2,
  chat: MessageSquare,
  share: Share2,
};

export default function LogoCloud() {
  return (
    <section id="customers" style={{ padding: '24px 24px 72px', textAlign: 'center' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <p style={{ color: 'var(--lp-faint)', fontSize: 13, marginBottom: 24, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {logoCloud.eyebrow}
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 14,
          }}
        >
          {logoCloud.items.map((item, i) => {
            const Icon = ICONS[item.icon] || Code2;
            return (
              <div
                key={item.label}
                className="lp-depth lp-surface lp-sq lp-cap-card"
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 16px',
                  textAlign: 'left',
                  animationDelay: `${i * 0.35}s`,
                  '--cap-color': item.color,
                }}
              >
                <span
                  className="lp-cap-shimmer"
                  aria-hidden="true"
                  style={{ animationDelay: `${i * 0.35}s` }}
                />
                <span
                  className="lp-round"
                  style={{
                    width: 36,
                    height: 36,
                    flex: 'none',
                    display: 'grid',
                    placeItems: 'center',
                    background: `${item.color}1f`,
                    color: item.color,
                    border: `1px solid ${item.color}44`,
                  }}
                >
                  <Icon size={17} strokeWidth={2.2} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--lp-fg)', lineHeight: 1.25 }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--lp-muted)', marginTop: 2 }}>{item.sub}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .lp-cap-card {
          transition: transform .35s cubic-bezier(.22,1,.36,1), box-shadow .35s;
          animation: lp-cap-breathe 5s ease-in-out infinite;
        }
        .lp-cap-card:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 14px 30px -14px var(--cap-color);
        }
        .lp-cap-shimmer {
          position: absolute;
          inset: 0;
          width: 45%;
          background: linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.22) 50%, transparent 100%);
          transform: translateX(-160%);
          pointer-events: none;
          animation: lp-shimmer-sweep 5s ease-in-out infinite;
        }
        @keyframes lp-shimmer-sweep {
          0%, 60%, 100% { transform: translateX(-160%); }
          30% { transform: translateX(320%); }
        }
        @keyframes lp-cap-breathe {
          0%, 100% { transform: translateY(0); }
          15% { transform: translateY(-3px); }
          30% { transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}
