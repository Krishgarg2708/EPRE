import { useEffect, useRef } from 'react';
import { useApp } from '../../context/store';
import { useMediaQuery } from '../../hooks/useNow';

const POINTS = 22;

/**
 * Fluid cursor trail drawn on a full-screen canvas.
 * - Desktop + fine pointer only; disabled for touch and prefers-reduced-motion.
 * - pointer-events: none, so clicks, text selection and map dragging are unaffected.
 * - The animation loop sleeps once the trail has settled, so it costs nothing while idle.
 */
export function CursorTrail() {
  const enabled = useApp((s) => s.settings.cursorTrail);
  const theme = useApp((s) => s.settings.theme);
  const fine = useMediaQuery('(pointer: fine) and (min-width: 1100px)');
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const ref = useRef<HTMLCanvasElement>(null);
  const active = enabled && fine && !reduced;

  useEffect(() => {
    if (!active) return;
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };
    resize();

    const pts = Array.from({ length: POINTS }, () => ({ x: -100, y: -100 }));
    const target = { x: -100, y: -100 };
    let seen = false;
    let raf = 0;
    let visible = 0; // 0..1 fade for leaving the window
    let wantVisible = false;
    const rgb = getComputedStyle(document.documentElement).getPropertyValue('--cyan').trim().split(/\s+/).join(',') || '53,213,242';

    const frame = () => {
      raf = 0;
      // Head follows the pointer; each point eases toward the one ahead of it.
      pts[0].x += (target.x - pts[0].x) * 0.55;
      pts[0].y += (target.y - pts[0].y) * 0.55;
      for (let i = 1; i < POINTS; i++) {
        pts[i].x += (pts[i - 1].x - pts[i].x) * 0.42;
        pts[i].y += (pts[i - 1].y - pts[i].y) * 0.42;
      }
      visible += ((wantVisible ? 1 : 0) - visible) * 0.15;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 1; i < POINTS; i++) {
        const t = 1 - i / POINTS;
        const a = pts[i - 1], b = pts[i];
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        ctx.quadraticCurveTo(a.x, a.y, mx, my);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(${rgb},${0.55 * t * t * visible})`;
        ctx.lineWidth = 1 + 5 * t;
        ctx.shadowColor = `rgba(${rgb},${0.5 * visible})`;
        ctx.shadowBlur = 10 * t;
        ctx.stroke();
      }

      // Keep animating until the tail has caught up with the head and the fade has settled.
      const tail = pts[POINTS - 1];
      const moving = Math.abs(tail.x - target.x) + Math.abs(tail.y - target.y) > 0.5;
      const fading = Math.abs(visible - (wantVisible ? 1 : 0)) > 0.01;
      if (moving || fading) raf = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      target.x = e.clientX;
      target.y = e.clientY;
      if (!seen) {
        seen = true;
        pts.forEach((p) => { p.x = target.x; p.y = target.y; });
      }
      wantVisible = true;
      kick();
    };
    const leave = () => { wantVisible = false; kick(); };

    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);
    window.addEventListener('blur', leave);
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', leave);
      window.removeEventListener('blur', leave);
      window.removeEventListener('resize', resize);
    };
  }, [active, theme]);

  if (!active) return null;
  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-[1500] no-print" />;
}
