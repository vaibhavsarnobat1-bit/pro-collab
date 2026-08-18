import React, { useEffect, useRef } from 'react';

const Background3D = ({ showImage = true, opacity = 0.28 }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // 3D Particles simulation
    const particleCount = Math.min(width > 768 ? 65 : 30, 80);
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        z: Math.random() * 800 + 100, // 3D depth
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        vz: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 2 + 1,
        color: i % 3 === 0 ? '#6366f1' : i % 3 === 1 ? '#a855f7' : '#38bdf8'
      });
    }

    let mouseX = width / 2;
    let mouseY = height / 2;

    const handleMouseMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Mouse influence
      const targetOffsetX = (mouseX - width / 2) * 0.05;
      const targetOffsetY = (mouseY - height / 2) * 0.05;

      // Update & Draw 3D nodes
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;
        if (p.z < 50) p.z = 900;
        if (p.z > 900) p.z = 50;

        // 3D perspective projection
        const fov = 400;
        const scale = fov / (fov + p.z);
        const projX = (p.x - width / 2 + targetOffsetX) * scale + width / 2;
        const projY = (p.y - height / 2 + targetOffsetY) * scale + height / 2;
        const projRadius = Math.max(0.5, p.radius * scale * 1.5);
        const alpha = Math.min(1, Math.max(0.1, (1000 - p.z) / 1000));

        // Draw node
        ctx.beginPath();
        ctx.arc(projX, projY, projRadius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha * 0.7;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Connect nearby nodes with 3D lines
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dz = p.z - p2.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < 160) {
            const scale2 = fov / (fov + p2.z);
            const projX2 = (p2.x - width / 2 + targetOffsetX) * scale2 + width / 2;
            const projY2 = (p2.y - height / 2 + targetOffsetY) * scale2 + height / 2;

            ctx.beginPath();
            ctx.moveTo(projX, projY);
            ctx.lineTo(projX2, projY2);
            ctx.strokeStyle = '#818cf8';
            ctx.globalAlpha = (1 - dist / 160) * 0.25 * alpha;
            ctx.lineWidth = 0.8 * scale;
            ctx.stroke();
          }
        }
      }

      ctx.globalAlpha = 1;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      
      {/* 3D Holographic Collaborative Image Background Layer */}
      {showImage && (
        <div
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
          style={{
            backgroundImage: `url('/images/pro_collab_3d_hero.jpg')`,
            opacity: opacity,
            filter: 'saturate(1.2) contrast(1.1) brightness(0.85)',
            transform: 'scale(1.02)'
          }}
        />
      )}

      {/* Radiant Glowing Ambient Light Orbs */}
      <div className="absolute top-[-10%] left-[15%] w-[500px] h-[500px] rounded-full bg-indigo-600/15 blur-[140px] animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] rounded-full bg-purple-600/15 blur-[160px] animate-pulse" style={{ animationDuration: '10s' }} />
      <div className="absolute top-[40%] right-[25%] w-[400px] h-[400px] rounded-full bg-cyan-500/10 blur-[130px] animate-pulse" style={{ animationDuration: '6s' }} />

      {/* Cybernetic Grid Matrix Overlay */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Interactive 3D Constellation Particle Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />

      {/* Subtle Vignette Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c10] via-transparent to-[#0a0c10]/80" />
    </div>
  );
};

export default Background3D;
