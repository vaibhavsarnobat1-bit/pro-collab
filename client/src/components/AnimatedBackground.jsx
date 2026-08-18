import React, { useEffect, useRef, useState } from 'react';

const AnimatedBackground = ({ 
  variant = 'default',
  className = '' 
}) => {
  const canvasRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect() || { width: window.innerWidth, height: window.innerHeight };
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      ctx.scale(dpr, dpr);
      setDimensions({ width: rect.width, height: rect.height });
    };

    const particles = [];
    const particleCount = variant === 'dense' ? 60 : 35;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * dimensions.width,
        y: Math.random() * dimensions.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 2 + 1,
        opacity: Math.random() * 0.4 + 0.1,
        color: ['#6366f1', '#8b5cf6', '#14b8a6', '#f59e0b'][Math.floor(Math.random() * 4)],
        phase: Math.random() * Math.PI * 2
      });
    }

    const connections = variant !== 'minimal';

    const animate = () => {
      if (!ctx || dimensions.width === 0) return;

      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      particles.forEach(p => {
        p.x += p.vx + Math.sin(Date.now() * 0.001 + p.phase) * 0.1;
        p.y += p.vy + Math.cos(Date.now() * 0.001 + p.phase) * 0.1;

        if (p.x < 0) p.x = dimensions.width;
        if (p.x > dimensions.width) p.x = 0;
        if (p.y < 0) p.y = dimensions.height;
        if (p.y > dimensions.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      if (connections) {
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 0.5;

        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 140) {
              ctx.globalAlpha = (1 - dist / 140) * 0.15;
              ctx.beginPath();
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.stroke();
              ctx.globalAlpha = 1;
            }
          }
        }
      }

      requestAnimationFrame(animate);
    };

    resize();
    animate();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [variant, dimensions.width, dimensions.height]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none z-0 ${className}`}
      aria-hidden="true"
    />
  );
};

export default AnimatedBackground;