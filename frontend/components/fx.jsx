'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '../lib/utils';

/** Fades children in once they scroll into view. */
export function Reveal({ children, className, delay = 0, as: Tag = 'div' }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setShown(true); return undefined; }
    const io = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <Tag ref={ref} style={{ transitionDelay: `${delay}ms` }} className={cn('reveal', shown && 'in', className)}>{children}</Tag>;
}

/** Card with a cursor-following glow. */
export function Spot({ children, className, as: Tag = 'div', ...rest }) {
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
  return <Tag onMouseMove={onMove} className={cn('spot', className)} {...rest}>{children}</Tag>;
}

/** Animates a number up to its value the first time it is known. */
export function CountUp({ value, format = (v) => v.toLocaleString(), duration = 1100 }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (value === null || value === undefined) return undefined;
    const start = performance.now();
    const base = from.current;
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      const v = base + (value - base) * eased;
      setShown(v);
      if (t < 1) raf = requestAnimationFrame(tick); else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  if (value === null || value === undefined) return '—';
  return format(Math.round(shown));
}
