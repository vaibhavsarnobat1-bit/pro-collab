import React, { useRef } from 'react';

/**
 * Animation 2 — cursor-reactive 3D tilt with a spotlight that follows the pointer.
 */
const TiltCard = ({ children, className = '', max = 8, glare = true, as: Tag = 'div', ...rest }) => {
  const ref = useRef(null);

  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty('--rx', `${(0.5 - py) * max}deg`);
    el.style.setProperty('--ry', `${(px - 0.5) * max}deg`);
    el.style.setProperty('--mx', `${px * 100}%`);
    el.style.setProperty('--my', `${py * 100}%`);
    el.style.setProperty('--tilt-opacity', glare ? '1' : '0');
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
    el.style.setProperty('--tilt-opacity', '0');
  };

  return (
    <Tag
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`tilt-card ${className}`}
      {...rest}
    >
      {children}
      <span className="tilt-glare" aria-hidden="true" />
    </Tag>
  );
};

export default TiltCard;
