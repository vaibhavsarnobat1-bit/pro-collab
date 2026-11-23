import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * SceneBackground — real WebGL (Three.js) background.
 * Connected-drift particle field + a few softly-lit geometric forms,
 * pointer parallax, gentle scroll response, theme aware, cheap, safe.
 *
 * Render behind everything with React.lazy + Suspense. Default export.
 * Falls back to nothing (never an error UI) when WebGL is unavailable.
 */

const FALLBACK_COLORS = {
  dark: { brand: '#6f6f6f', cyan: '#a5a5a5', violet: '#999999', ink: '#f2f2f2' },
  light: { brand: '#535353', cyan: '#6d6d6d', violet: '#555555', ink: '#141414' },
};

function readTheme(themeProp) {
  const root = document.documentElement;
  const isDark =
    themeProp === 'dark' || themeProp === 'light'
      ? themeProp === 'dark'
      : root.classList.contains('dark');
  const cs = root.isConnected ? getComputedStyle(root) : null;
  const pick = (name, fallback) => {
    const v = cs ? cs.getPropertyValue(name).trim() : '';
    return v || fallback;
  };
  const fb = isDark ? FALLBACK_COLORS.dark : FALLBACK_COLORS.light;
  return {
    isDark,
    brand: pick('--brand', fb.brand),
    cyan: pick('--cyan', fb.cyan),
    violet: pick('--violet', fb.violet),
    ink: pick('--ink', fb.ink),
  };
}

function particleCountForWidth(w) {
  if (w >= 1440) return 1400;
  if (w >= 1024) return 1200;
  if (w >= 768) return 1000;
  return 900;
}

export default function SceneBackground({ theme }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // --- renderer (WebGL may be unavailable — decoration only, never crash) ---
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'low-power',
      });
    } catch (err) {
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      58,
      Math.max(window.innerWidth, 1) / Math.max(window.innerHeight, 1),
      0.1,
      220
    );
    camera.position.set(0, 0, 36);

    const disposables = { geometries: new Set(), materials: new Set() };
    const track = (obj) => {
      if (obj.geometry) disposables.geometries.add(obj.geometry);
      if (obj.material) disposables.materials.add(obj.material);
      return obj;
    };

    // --- particle field (drifting, connected) ---
    const count = particleCountForWidth(window.innerWidth);
    const spread = { x: 84, y: 52, z: 46 };
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * spread.x;
      positions[i * 3 + 1] = (Math.random() - 0.5) * spread.y;
      positions[i * 3 + 2] = (Math.random() - 0.5) * spread.z;
    }
    const pointsGeo = new THREE.BufferGeometry();
    pointsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // precompute connected pairs once (cheap static lattice, whole group drifts)
    const linkDist = 6.4;
    const linkDistSq = linkDist * linkDist;
    const lineIndices = [];
    for (let i = 0; i < count; i++) {
      const ix = positions[i * 3];
      const iy = positions[i * 3 + 1];
      const iz = positions[i * 3 + 2];
      for (let j = i + 1; j < count; j++) {
        const dx = ix - positions[j * 3];
        if (dx * dx > linkDistSq) continue;
        const dy = iy - positions[j * 3 + 1];
        if (dx * dx + dy * dy > linkDistSq) continue;
        const dz = iz - positions[j * 3 + 2];
        if (dx * dx + dy * dy + dz * dz < linkDistSq) lineIndices.push(i, j);
      }
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', pointsGeo.getAttribute('position'));
    lineGeo.setIndex(lineIndices);

    const pointsMat = new THREE.PointsMaterial({ size: 0.34, transparent: true, depthWrite: false });
    const lineMat = new THREE.LineBasicMaterial({ transparent: true, depthWrite: false });
    const field = new THREE.Group();
    const points = track(new THREE.Points(pointsGeo, pointsMat));
    const lines = track(new THREE.LineSegments(lineGeo, lineMat));
    field.add(points, lines);
    scene.add(field);
    disposables.geometries.add(pointsGeo); // shared with lineGeo

    // --- large softly-lit geometric forms ---
    const forms = [];
    const formDefs = [
      { geo: new THREE.IcosahedronGeometry(7.2, 1), pos: [-16, 4.5, -10], spin: [0.06, 0.1, 0.02] },
      { geo: new THREE.TorusKnotGeometry(3.6, 0.95, 110, 14), pos: [16.5, -6, -7], spin: [0.04, 0.07, 0.05] },
      { geo: new THREE.OctahedronGeometry(4.6, 0), pos: [4, 10.5, -16], spin: [0.08, 0.04, 0.06] },
      { geo: new THREE.TorusGeometry(4.4, 0.5, 12, 48), pos: [-8, -11, -14], spin: [0.05, 0.09, 0.03] },
    ];
    const formMats = [];
    formDefs.forEach((def, i) => {
      const mat = new THREE.MeshStandardMaterial({
        roughness: 0.42,
        metalness: 0.32,
        flatShading: true,
        transparent: true,
      });
      const mesh = track(new THREE.Mesh(def.geo, mat));
      mesh.position.set(def.pos[0], def.pos[1], def.pos[2]);
      mesh.userData.spin = def.spin;
      mesh.userData.variant = i;
      forms.push(mesh);
      formMats.push(mat);
      scene.add(mesh);
    });

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.7);
    keyLight.position.set(6, 12, 10);
    const accentA = new THREE.PointLight(0xffffff, 90, 120, 1.7);
    const accentB = new THREE.PointLight(0xffffff, 70, 110, 1.7);
    accentA.position.set(-14, 6, 6);
    accentB.position.set(14, -8, 8);
    scene.add(ambient, keyLight, accentA, accentB);

    // --- theme application ---
    let currentTheme = null;
    const applyTheme = () => {
      const t = readTheme(theme);
      currentTheme = t;
      const c = new THREE.Color();
      pointsMat.color.set(c.set(t.isDark ? t.cyan : t.brand).getHex());
      pointsMat.opacity = t.isDark ? 0.75 : 0.42;
      pointsMat.blending = t.isDark ? THREE.AdditiveBlending : THREE.NormalBlending;
      lineMat.color.set(t.brand);
      lineMat.opacity = t.isDark ? 0.14 : 0.09;
      const formColors = [t.brand, t.violet, t.cyan, t.brand];
      formMats.forEach((mat, i) => {
        mat.color.set(formColors[i % formColors.length]);
        mat.opacity = t.isDark ? 0.3 : 0.2;
        if (t.isDark) {
          mat.emissive.set(formColors[i % formColors.length]);
          mat.emissiveIntensity = 0.12;
        } else {
          mat.emissive.set(0x000000);
          mat.emissiveIntensity = 0;
        }
        mat.needsUpdate = true;
      });
      ambient.intensity = t.isDark ? 0.5 : 0.85;
      accentA.color.set(t.brand);
      accentB.color.set(t.cyan);
    };
    applyTheme();

    // react live to theme flips driven by the rest of the app
    const domObserver = new MutationObserver(applyTheme);
    domObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });

    // --- input: pointer parallax + scroll ---
    const pointer = { x: 0, y: 0 }; // normalized target [-1, 1]
    const eased = { x: 0, y: 0 };
    let scrollTarget = 0;
    let scrollEased = 0;
    const onPointerMove = (e) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const onScroll = () => {
      const max = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1
      );
      scrollTarget = window.scrollY / max; // 0..1
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // --- sizing ---
    const resize = () => {
      const w = Math.max(window.innerWidth, 1);
      const h = Math.max(window.innerHeight, 1);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    let resizeObserver;
    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(document.documentElement);
    } else {
      window.addEventListener('resize', resize);
    }

    // --- render loop with visibility / off-screen pausing ---
    let rafId = 0;
    let running = false;
    let inView = true;
    let tabVisible = document.visibilityState !== 'hidden';
    const clock = new THREE.Clock();
    const baseCamZ = camera.position.z;

    const renderFrame = () => {
      const dt = Math.min(clock.getDelta(), 0.05);

      // damped pointer parallax (lerp)
      eased.x += (pointer.x - eased.x) * Math.min(1, dt * 2.4);
      eased.y += (pointer.y - eased.y) * Math.min(1, dt * 2.4);
      scrollEased += (scrollTarget - scrollEased) * Math.min(1, dt * 2.0);

      camera.position.x = eased.x * 3.2;
      camera.position.y = -eased.y * 2.0 - scrollEased * 6.0;
      camera.position.z = baseCamZ - scrollEased * 4.0;
      camera.lookAt(0, -scrollEased * 3.0, 0);

      field.rotation.y += dt * 0.028;
      field.rotation.x += dt * 0.01;

      forms.forEach((mesh) => {
        const s = mesh.userData.spin;
        mesh.rotation.x += s[0] * dt;
        mesh.rotation.y += s[1] * dt;
        mesh.rotation.z += s[2] * dt;
      });

      renderer.render(scene, camera);
    };

    const loop = () => {
      if (!running) return;
      renderFrame();
      rafId = requestAnimationFrame(loop);
    };

    const syncRunning = () => {
      const wantsRun = tabVisible && inView && !reducedMotion;
      if (wantsRun && !running) {
        running = true;
        clock.getDelta(); // discard the paused gap
        rafId = requestAnimationFrame(loop);
      } else if (!wantsRun && running) {
        running = false;
        cancelAnimationFrame(rafId);
      }
    };

    const onVisibility = () => {
      tabVisible = document.visibilityState !== 'hidden';
      syncRunning();
    };
    document.addEventListener('visibilitychange', onVisibility);

    let viewObserver;
    if ('IntersectionObserver' in window) {
      viewObserver = new IntersectionObserver(
        (entries) => {
          inView = entries.some((entry) => entry.isIntersecting);
          syncRunning();
        },
        { threshold: 0 }
      );
      viewObserver.observe(canvas);
    }

    if (reducedMotion) {
      // one static frame, no animation
      renderFrame();
    } else {
      syncRunning();
    }

    // --- cleanup ---
    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', onScroll);
      if (resizeObserver) resizeObserver.disconnect();
      else window.removeEventListener('resize', resize);
      if (viewObserver) viewObserver.disconnect();
      domObserver.disconnect();
      disposables.geometries.forEach((g) => g.dispose());
      disposables.materials.forEach((m) => m.dispose());
      scene.clear();
      renderer.dispose();
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
        display: 'block',
      }}
    />
  );
}
