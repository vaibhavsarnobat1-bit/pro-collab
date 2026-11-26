import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const CELL = 56;
const FADE_MS = 700;

export default function InteractiveGrid() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const activeCells = new Map();
    let rafId = null;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const onMouseMove = (e) => {
      if (reducedMotion) return;
      const target = e.target;
      if (
        target instanceof Element &&
        target.closest(
          'h1, h2, h3, h4, p, span, a, button, input, label, blockquote, figcaption, svg, img, header, footer, .lp-depth, .lp-btn, .lp-pill',
        )
      ) {
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const col = Math.floor(x / CELL);
      const row = Math.floor((y + scrollY) / CELL);
      const key = `${col}:${row}`;
      activeCells.set(key, { col, row, time: performance.now() });
    };

    const render = (now) => {
      ctx.clearRect(0, 0, width, height);
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      const isDark = document.documentElement.classList.contains('dark');

      // 1. Draw hovered/fading grid boxes anchored to page coordinates
      for (const [key, cell] of activeCells.entries()) {
        const age = now - cell.time;
        if (age >= FADE_MS) {
          activeCells.delete(key);
          continue;
        }
        const progress = 1 - age / FADE_MS;
        const alpha = progress * progress * (isDark ? 0.35 : 0.82);
        const x = cell.col * CELL;
        const y = cell.row * CELL - scrollY;
        if (y + CELL < 0 || y > height) continue;

        ctx.fillStyle = isDark
          ? `rgba(255, 255, 255, ${alpha})`
          : `rgba(17, 17, 17, ${alpha})`;
        ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
      }

      // 2. Draw crisp full-page grid lines
      const offsetY = -(scrollY % CELL);
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(10, 10, 10, 0.07)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= width; x += CELL) {
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, height);
      }
      for (let y = offsetY; y <= height; y += CELL) {
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(width, y + 0.5);
      }
      ctx.stroke();

      rafId = requestAnimationFrame(render);
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    rafId = requestAnimationFrame(render);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return createPortal(
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />,
    document.body,
  );
}
