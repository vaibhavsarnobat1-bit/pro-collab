import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, FolderKanban } from 'lucide-react';
import { projects } from '../../content/landingContent';
import { useReveal } from './landingHooks';

// Fills a progress bar from 0 → target when it enters the viewport.
function useFill(target, { duration = 1400 } = {}) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 3);
          setValue(target * eased);
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [target, duration]);
  return [ref, value];
}

function ProjectCard({ card, index }) {
  const ref = useReveal();
  const [barRef, fill] = useFill(card.progress);
  return (
    <div
      ref={ref}
      className="lp-reveal lp-depth lp-surface lp-sq"
      style={{
        padding: 22,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        transition: 'transform .35s cubic-bezier(.22,1,.36,1), box-shadow .35s',
        animationDelay: `${index * 90}ms`,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-4px)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            className="lp-round"
            style={{ width: 36, height: 36, display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg, #ff7a45, #8b5cf6)', color: '#ffffff', flex: 'none' }}
          >
            <FolderKanban size={18} strokeWidth={2.2} />
          </span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16, letterSpacing: '-0.01em' }}>{card.name}</div>
            <div style={{ fontSize: 12, color: 'var(--lp-accent-2)', fontWeight: 600 }}>{card.tag}</div>
          </div>
        </div>
        <span
          style={{
            fontSize: 11.5,
            fontWeight: 600,
            color: 'var(--lp-fg)',
            background: 'var(--lp-raised)',
            border: '1px solid var(--lp-line)',
            borderRadius: 9999,
            padding: '4px 10px',
            whiteSpace: 'nowrap',
          }}
        >
          {card.status}
        </span>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 8 }}>
          <span style={{ color: 'var(--lp-muted)' }}>Progress</span>
          <span style={{ color: 'var(--lp-fg)', fontWeight: 600 }}>{Math.round(fill)}%</span>
        </div>
        <div ref={barRef} style={{ height: 8, borderRadius: 9999, background: 'var(--lp-line)', overflow: 'hidden' }}>
          <div
            style={{
              width: `${fill}%`,
              height: '100%',
              borderRadius: 9999,
              background: 'linear-gradient(90deg, #ff7a45, #8b5cf6)',
              boxShadow: '0 0 12px rgba(255, 122, 69, 0.45)',
              transition: 'width .08s linear',
            }}
          />
        </div>
      </div>

      <p style={{ margin: 0, fontSize: 13.5, color: 'var(--lp-muted)' }}>{card.note}</p>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--lp-line)', paddingTop: 14 }}>
        <div style={{ display: 'flex' }}>
          {card.members.map((m, i) => (
            <span
              key={m}
              className="lp-round"
              style={{
                width: 28,
                height: 28,
                marginLeft: i ? -8 : 0,
                display: 'grid',
                placeItems: 'center',
                fontSize: 11,
                fontWeight: 600,
                background: ['#ff7a45', '#8b5cf6', '#06b6d4', '#10b981'][i % 4],
                color: '#ffffff',
                border: '2px solid var(--lp-surface)',
              }}
            >
              {m}
            </span>
          ))}
        </div>
        <span style={{ fontSize: 12.5, color: 'var(--lp-faint)' }}>collaborating</span>
      </div>
    </div>
  );
}

export default function Projects() {
  const ref = useReveal();
  return (
    <section id="projects" style={{ padding: '96px 24px' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto' }}>
          <p style={{ color: 'var(--lp-accent)', fontSize: 13, letterSpacing: '0.06em', margin: 0 }}>{projects.eyebrow}</p>
          <h2 className="lp-text-balance" style={{ fontSize: 'clamp(30px,4vw,44px)', fontWeight: 600, letterSpacing: '-0.03em', margin: '10px 0 14px' }}>
            {projects.heading}
          </h2>
          <p style={{ color: 'var(--lp-muted)', fontSize: 16, lineHeight: 1.6, margin: 0 }} className="lp-text-pretty">
            {projects.description}
          </p>
        </div>

        <div
          ref={ref}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px,1fr))',
            gap: 18,
            marginTop: 48,
          }}
        >
          {projects.cards.map((card, i) => (
            <ProjectCard key={card.name} card={card} index={i} />
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <button type="button" className="lp-btn lp-btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {projects.cta}
            <ArrowRight size={16} strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </section>
  );
}
