import React, { useEffect, useRef } from 'react';

/**
 * DeveloperBackgroundVideo — Ultra-Premium Animated Canvas Background
 * Layers (back to front):
 *   1. Deep space gradient base
 *   2. Aurora borealis animated waves
 *   3. Floating neon orbs (glow blended)
 *   4. Cyber grid
 *   5. Twinkling star field
 *   6. Neural network mesh + nodes
 *   7. Code rain streams
 *   8. Scanline sweep effect
 */
const DeveloperBackgroundVideo = ({ overlayOpacity = 0.62, showGrid = true }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);

    /* ── Helpers ── */
    const rand = (a, b) => Math.random() * (b - a) + a;
    const randI = (a, b) => Math.floor(rand(a, b));

    /* ── Aurora Bands ── */
    const AURORA = [
      { yBase: 0.15, amp: 0.09, freq: 0.00075, speed: 0.00038, color: [99, 102, 241] },
      { yBase: 0.28, amp: 0.07, freq: 0.00055, speed: 0.00028, color: [139, 92, 246] },
      { yBase: 0.52, amp: 0.08, freq: 0.00065, speed: 0.00032, color: [56, 189, 248] },
      { yBase: 0.68, amp: 0.07, freq: 0.00085, speed: 0.00030, color: [16, 185, 129] },
    ];

    /* ── Stars ── */
    let stars = [];
    const initStars = () => {
      stars = Array.from({ length: 180 }, () => ({
        x: rand(0, W), y: rand(0, H),
        r: rand(0.5, 2.0),
        phase: rand(0, Math.PI * 2),
        spd: rand(0.008, 0.024),
        col: ['rgba(255,255,255,', 'rgba(139,92,246,', 'rgba(56,189,248,'][randI(0, 3)]
      }));
    };

    /* ── Neon Orbs ── */
    const ORB_COLORS = [
      [99,102,241],[139,92,246],[56,189,248],[16,185,129],[244,63,94],[251,191,36],[20,184,166]
    ];
    let orbs = [];
    const initOrbs = () => {
      orbs = Array.from({ length: 8 }, (_, i) => ({
        x: rand(0.08, 0.92) * W, y: rand(0.08, 0.92) * H,
        radius: rand(90, 240),
        phase: rand(0, Math.PI * 2),
        speed: rand(0.004, 0.010),
        color: ORB_COLORS[i % 7]
      }));
    };

    /* ── Neural Nodes ── */
    const NODE_COLS = [[99,102,241],[56,189,248],[16,185,129]];
    let nodes = [];
    const initNodes = () => {
      const cnt = Math.min(Math.floor(W / 26), 58);
      nodes = Array.from({ length: cnt }, () => ({
        x: rand(0, W), y: rand(0, H),
        vx: rand(-0.32, 0.32), vy: rand(-0.32, 0.32),
        r: rand(1.4, 3.0),
        pulse: rand(0, Math.PI * 2),
        ci: randI(0, 3)
      }));
    };

    /* ── Code Rain ── */
    const CODE_CHARS = [
      'const','async','=>','{}','[]','io()','delta',
      'sync','peer','room','01','10','JWT','RTC',
      'ws://','emit()','join','.on(','#','//','/**',
      'useState','socket','collab','Monaco','delta'
    ];
    let rain = [];
    const initRain = () => {
      rain = Array.from({ length: 32 }, () => ({
        x: rand(0, W), y: rand(-H, H),
        spd: rand(0.45, 1.15),
        text: CODE_CHARS[randI(0, CODE_CHARS.length)],
        alpha: rand(0.06, 0.20),
        size: randI(10, 14),
        col: ['#818cf8','#38bdf8','#34d399','#c084fc'][randI(0,4)]
      }));
    };

    const initAll = () => { initStars(); initOrbs(); initNodes(); initRain(); };
    initAll();

    const onResize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
      initAll();
    };
    window.addEventListener('resize', onResize);

    /* ── Render Loop ── */
    let t = 0;
    const draw = () => {
      t++;
      ctx.clearRect(0, 0, W, H);

      /* 1. Deep Space Base */
      const bg = ctx.createLinearGradient(0, 0, W * 0.6, H);
      bg.addColorStop(0, '#03040b');
      bg.addColorStop(0.5, '#050810');
      bg.addColorStop(1, '#02030a');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      /* 2. Aurora Waves */
      for (const band of AURORA) {
        const [r,g,b] = band.color;
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        for (let pass = 0; pass < 3; pass++) {
          const baseY = H * band.yBase + Math.sin(t * band.speed * 55 + pass * 1.8) * H * band.amp;
          const halfH = 110 + pass * 18;
          const grad = ctx.createLinearGradient(0, baseY - halfH, 0, baseY + halfH);
          grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
          grad.addColorStop(0.4, `rgba(${r},${g},${b},0.065)`);
          grad.addColorStop(0.5, `rgba(${r},${g},${b},0.12)`);
          grad.addColorStop(0.6, `rgba(${r},${g},${b},0.065)`);
          grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(0, baseY - halfH);
          for (let x = 0; x <= W; x += 6) {
            const wy = baseY + Math.sin(x * band.freq + t * band.speed * 55 + pass * 2) * H * band.amp * 0.75;
            ctx.lineTo(x, wy);
          }
          ctx.lineTo(W, baseY + halfH);
          ctx.lineTo(0, baseY + halfH);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      /* 3. Neon Orbs */
      for (const orb of orbs) {
        orb.phase += orb.speed;
        orb.x += Math.sin(orb.phase * 0.65) * 0.25;
        orb.y += Math.cos(orb.phase * 0.48) * 0.20;
        if (orb.x < -orb.radius) orb.x = W + orb.radius;
        if (orb.x > W + orb.radius) orb.x = -orb.radius;
        if (orb.y < -orb.radius) orb.y = H + orb.radius;
        if (orb.y > H + orb.radius) orb.y = -orb.radius;
        const [r,g,b] = orb.color;
        const pls = 0.048 + 0.032 * Math.sin(orb.phase * 2.1);
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const og = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius);
        og.addColorStop(0, `rgba(${r},${g},${b},${(pls * 2.3).toFixed(3)})`);
        og.addColorStop(0.38, `rgba(${r},${g},${b},${pls.toFixed(3)})`);
        og.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = og;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      /* 4. Cyber Grid */
      if (showGrid) {
        ctx.save();
        ctx.strokeStyle = 'rgba(99,102,241,0.018)';
        ctx.lineWidth = 0.7;
        const gs = 55;
        for (let x = 0; x < W; x += gs) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
        for (let y = 0; y < H; y += gs) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
        ctx.restore();
      }

      /* 5. Stars */
      for (const s of stars) {
        s.phase += s.spd;
        const a = 0.3 + 0.6 * (0.5 + 0.5 * Math.sin(s.phase));
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const sg = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 5);
        sg.addColorStop(0, `${s.col}${(a * 0.8).toFixed(2)})`);
        sg.addColorStop(1, `${s.col}0)`);
        ctx.fillStyle = sg;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `${s.col}${Math.min(a + 0.25, 1).toFixed(2)})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      /* 6. Neural Mesh Lines */
      const MD = 145;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const d = Math.sqrt(dx*dx + dy*dy);
          if (d < MD) {
            const f = 1 - d / MD;
            const [r,g,b] = NODE_COLS[nodes[i].ci];
            ctx.strokeStyle = `rgba(${r},${g},${b},${(f * 0.24).toFixed(3)})`;
            ctx.lineWidth = f * 1.1;
            ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.stroke();
          }
        }
      }

      /* 6b. Neural Nodes */
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
        n.pulse += 0.045;
        const pr = n.r + Math.sin(n.pulse) * 0.85;
        const [r,g,b] = NODE_COLS[n.ci];
        const ga = 0.22 + 0.18 * Math.sin(n.pulse);
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const ng = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, pr * 7);
        ng.addColorStop(0, `rgba(${r},${g},${b},${ga})`);
        ng.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = ng;
        ctx.beginPath(); ctx.arc(n.x, n.y, pr * 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(${r},${g},${b},0.88)`;
        ctx.beginPath(); ctx.arc(n.x, n.y, Math.max(0.5, pr), 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      /* 7. Code Rain */
      ctx.save();
      for (const d of rain) {
        d.y -= d.spd;
        if (d.y < -30) {
          d.y = H + 20; d.x = rand(0, W);
          d.text = CODE_CHARS[randI(0, CODE_CHARS.length)];
        }
        ctx.font = `${d.size}px "Fira Code", monospace`;
        ctx.fillStyle = d.col;
        ctx.globalAlpha = d.alpha;
        ctx.fillText(d.text, d.x, d.y);
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      /* 8. Scanline sweep */
      const sy = (t * 1.6) % (H + 80) - 40;
      const sg2 = ctx.createLinearGradient(0, sy, 0, sy + 70);
      sg2.addColorStop(0, 'rgba(99,102,241,0)');
      sg2.addColorStop(0.5, 'rgba(99,102,241,0.028)');
      sg2.addColorStop(1, 'rgba(99,102,241,0)');
      ctx.fillStyle = sg2;
      ctx.fillRect(0, sy, W, 70);

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animId);
    };
  }, [showGrid]);

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden select-none">
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Legibility vignette overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 85% 75% at 50% 38%, rgba(3,5,13,${overlayOpacity * 0.50}) 0%, rgba(2,3,10,${overlayOpacity * 0.90}) 100%)`
        }}
      />
      {/* Bottom content fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-52"
        style={{ background: 'linear-gradient(to bottom, transparent, rgba(2,3,10,0.65))' }}
      />
    </div>
  );
};

export default DeveloperBackgroundVideo;
