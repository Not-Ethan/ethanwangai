'use client';
// The ridge counter (spec §3.1 · 02, §9): reads the latched ridge reveal from LIVE in its own rAF loop (no React state
// on the scroll path), scrambles digits for SCRAMBLE_MS after each change, and writes only when the text differs.
// The server render and the no-GL tier keep the full count.
import { useEffect, useRef } from 'react';
import { facts } from '@/valley/facts';
import { LIVE } from '@/gl/live';
import { useScroll } from '@/scroll/ScrollProvider';
import { copy } from './copy';
import { SCRAMBLE_MS, counterValue, scrambleDigits } from './counterText';

export function Counter() {
  const ref = useRef<HTMLParagraphElement>(null);
  const { reducedMotion } = useScroll();

  useEffect(() => {
    let raf = 0;
    let shown = -1;
    let target = '';
    let changedAt = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const el = ref.current;
      if (!el || LIVE.ridge <= 0) return;
      const n = counterValue(LIVE.ridge, facts.kalshi.trades);
      if (n !== shown) {
        shown = n;
        target = copy.kalshi.counter(n);
        changedAt = now;
      }
      const phase = reducedMotion ? 1 : Math.min(1, (now - changedAt) / SCRAMBLE_MS);
      const text = phase >= 1 ? target : scrambleDigits(target, phase, n);
      if (el.textContent !== text) el.textContent = text;
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion]);

  return (
    <p ref={ref} className="mono mt-2" data-counter>
      {copy.kalshi.counter(facts.kalshi.trades)}
    </p>
  );
}
