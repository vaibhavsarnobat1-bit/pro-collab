import React, { useEffect, useRef, useState } from 'react';

/**
 * Animation 3 — numbers that count up the moment they scroll into view.
 */
const CountUp = ({ value, duration = 1100, prefix = '', suffix = '', className = '' }) => {
  const ref = useRef(null);
  const numeric = Number(value);
  const isNum = Number.isFinite(numeric);

  const prefersReduced = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const [display, setDisplay] = useState(isNum && !prefersReduced() ? 0 : value);

  useEffect(() => {
    if (!isNum || prefersReduced()) {
      setDisplay(value);
      return;
    }
    const el = ref.current;
    if (!el) return;

    let raf;
    const run = () => {
      const start = performance.now();
      const step = (now) => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setDisplay(Math.round(numeric * eased));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };

    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        run();
        io.disconnect();
      }
    }, { threshold: 0.4 });

    io.observe(el);
    return () => { io.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, [numeric, isNum, value, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}{isNum ? display.toLocaleString() : value}{suffix}
    </span>
  );
};

export default CountUp;
