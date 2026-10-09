'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { animate, stagger } from 'framer-motion';
import { useScroll } from '@/scroll/ScrollProvider';

// power3.out as a cubic-bezier (spec §9 DOM motion).
const EASE = [0.215, 0.61, 0.355, 1] as const;
const HIDDEN = 'translateY(100%)';
const SHOWN = 'translateY(0%)';

/**
 * Triggered line reveals on [data-reveal] (spec §9): when the wrapper enters the viewport its lines rise 100% → 0
 * with opacity, 0.5 s power3.out, 0.06 s apart; when it leaves below the viewport (scroll-back) they reverse.
 * The server HTML is fully visible: lines are hidden only after hydration, and only if the wrapper starts below
 * the fold, so no-JS and no-WebGL visitors always see the whole page. Reduced motion: no reveal at all.
 * One IntersectionObserver per wrapper; no per-frame layout reads.
 */
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { reducedMotion } = useScroll();

  useEffect(() => {
    const root = ref.current;
    if (!root || reducedMotion) return;
    const lines = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (lines.length === 0) return;
    let shown = true;
    let first = true;
    const io = new IntersectionObserver(([entry]) => {
      const below = entry.boundingClientRect.top > 0;
      if (first) {
        first = false;
        if (!entry.isIntersecting && below) {
          for (const el of lines) { el.style.opacity = '0'; el.style.transform = HIDDEN; }
          shown = false;
        }
        return;
      }
      if (entry.isIntersecting && !shown) {
        shown = true;
        animate(lines, { opacity: [0, 1], transform: [HIDDEN, SHOWN] }, { duration: 0.5, ease: EASE, delay: stagger(0.06) });
      } else if (!entry.isIntersecting && shown && below) {
        shown = false;
        animate(lines, { opacity: [1, 0], transform: [SHOWN, HIDDEN] }, { duration: 0.5, ease: EASE, delay: stagger(0.06, { from: 'last' }) });
      }
    }, { threshold: 0.15 });
    io.observe(root);
    return () => {
      io.disconnect();
      for (const el of lines) { el.style.opacity = ''; el.style.transform = ''; }
    };
  }, [reducedMotion]);

  return <div ref={ref} className={className}>{children}</div>;
}
