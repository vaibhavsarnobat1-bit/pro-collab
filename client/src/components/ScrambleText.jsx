import React, { useEffect, useRef, useState } from 'react';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ<>/{}[]#%$*+=~';
const prefersReduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Animation 1 — decode: text resolves from scrambled glyphs, left to right.
 */
const ScrambleText = ({ text, className = '', speed = 34, delay = 0, trigger = true }) => {
  const [out, setOut] = useState(prefersReduced() ? text : '');
  const frame = useRef(0);
  const raf = useRef(null);

  useEffect(() => {
    if (!trigger) return;
    if (prefersReduced()) {
      setOut(text);
      return;
    }

    let start = null;
    const total = text.length;
    frame.current = 0;

    const tick = (ts) => {
      if (start === null) start = ts;
      const elapsed = ts - start - delay;
      if (elapsed < 0) {
        raf.current = requestAnimationFrame(tick);
        return;
      }
      const revealed = Math.floor(elapsed / speed);
      frame.current = revealed;

      let next = '';
      for (let i = 0; i < total; i++) {
        const ch = text[i];
        if (ch === ' ') { next += ' '; continue; }
        if (i < revealed) next += ch;
        else next += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      setOut(next);

      if (revealed <= total) raf.current = requestAnimationFrame(tick);
    };

    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [text, speed, delay, trigger]);

  return <span className={className}>{out || text}</span>;
};

export default ScrambleText;
