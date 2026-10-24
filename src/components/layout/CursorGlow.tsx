import { useEffect, useRef } from 'react';
import { useApp } from '../../context/store';
import { useMediaQuery } from '../../hooks/useNow';

/**
 * Subtle cursor-following glow. Desktop + fine pointer only, disabled for reduced motion.
 * pointer-events: none so it never interferes with clicks, selection or the map.
 */
export function CursorGlow() {
  const enabled = useApp((s) => s.settings.cursorGlow);
  const fine = useMediaQuery('(pointer: fine) and (min-width: 1100px)');
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const ref = useRef<HTMLDivElement>(null);
  const active = enabled && fine && !reduced;
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let x = -500, y = -500;
    const move = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!raf) raf = requestAnimationFrame(() => {
        raf = 0;
        if (ref.current) ref.current.style.transform = `translate3d(${x - 200}px, ${y - 200}px, 0)`;
      });
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => { window.removeEventListener('pointermove', move); cancelAnimationFrame(raf); };
  }, [active]);
  if (!active) return null;
  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[1] h-[400px] w-[400px] rounded-full no-print"
      style={{ background: 'radial-gradient(circle, rgb(var(--cyan) / 0.06) 0%, transparent 65%)', transform: 'translate3d(-500px,-500px,0)', transition: 'transform 80ms linear' }}
    />
  );
}
