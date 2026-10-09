'use client';
import { createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode, type RefObject } from 'react';
import Lenis from 'lenis';
import { SECTIONS, sectionRanges } from '@/valley/sections';
import type { SectionRange, Tier } from '@/valley/types';
import { detectTier } from './tier';
import { normalizeVelocity, deltaVelocity } from './velocity';

export interface ScrollState {
  g: number;            // 0..1 document progress (Lenis-smoothed scroll / maxScroll)
  scrollY: number;      // Lenis-smoothed scroll in px
  velocity: number;     // normalized, damped elsewhere; raw here: px per ms clamped to [-3, 3]
  maxScroll: number;
  vh: number;
  vw: number;
  ranges: SectionRange[];
  tops: number[];       // section page tops in px (remeasured on resize)
}

interface Ctx {
  state: RefObject<ScrollState>;
  scrollTo: (id: string) => void;
  reducedMotion: boolean;
  tier: Tier;
}

const ScrollCtx = createContext<Ctx | null>(null);

function subscribeRM(cb: () => void) {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}
function useReducedMotion() {
  return useSyncExternalStore(subscribeRM, () => window.matchMedia('(prefers-reduced-motion: reduce)').matches, () => false);
}

// detectTier() reads matchMedia/innerWidth/hardwareConcurrency, which only exist on the client.
// useSyncExternalStore renders the SSR-safe `getServerSnapshot` ('desktop') on the server AND on
// the client's first (hydration-matching) render, then corrects to the real detectTier() value in
// a post-commit effect -- so the server-rendered HTML and the client's hydration pass agree, and
// only the follow-up frame (if the device is actually 'phone') repaints. This mirrors useReducedMotion
// above and avoids the render-time `useMemo(() => detectTier(), [])` hydration mismatch for phone/coarse-pointer visitors.
function subscribeTier(cb: () => void) {
  if (typeof window === 'undefined') return () => {};
  const mq = window.matchMedia('(pointer: coarse)');
  mq.addEventListener('change', cb);
  window.addEventListener('resize', cb);
  return () => {
    mq.removeEventListener('change', cb);
    window.removeEventListener('resize', cb);
  };
}
function useTier(): Tier {
  return useSyncExternalStore(subscribeTier, detectTier, () => 'desktop');
}

export function ScrollProvider({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion();
  const tier = useTier();
  const state = useRef<ScrollState>({ g: 0, scrollY: 0, velocity: 0, maxScroll: 1, vh: 900, vw: 1440, ranges: [], tops: [] });
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const s = state.current;
    const measure = () => {
      s.vh = window.innerHeight;
      s.vw = window.innerWidth;
      s.tops = SECTIONS.map((sec) => {
        const el = document.getElementById(sec.id);
        return el ? el.offsetTop : 0;
      });
      const docHeight = document.documentElement.scrollHeight;
      s.maxScroll = Math.max(1, docHeight - s.vh);
      s.ranges = sectionRanges(s.tops, docHeight, s.vh);
      // a resize or rotation changes the document length: refresh g now, not on the next scroll event
      s.g = Math.min(1, Math.max(0, window.scrollY / s.maxScroll));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.documentElement);
    window.addEventListener('resize', measure);

    let prevY = window.scrollY;
    let prevT = performance.now();
    const onNative = () => {
      const now = performance.now();
      s.scrollY = window.scrollY;
      s.velocity = deltaVelocity(prevY, s.scrollY, now - prevT);
      prevY = s.scrollY;
      prevT = now;
      s.g = Math.min(1, Math.max(0, s.scrollY / s.maxScroll));
    };

    if (reducedMotion) {
      onNative();
      window.addEventListener('scroll', onNative, { passive: true });
      return () => {
        window.removeEventListener('scroll', onNative);
        window.removeEventListener('resize', measure);
        ro.disconnect();
      };
    }

    const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, syncTouch: false, smoothWheel: true });
    lenisRef.current = lenis;
    lenis.on('scroll', ({ scroll, velocity }: { scroll: number; velocity: number }) => {
      const now = performance.now();
      s.scrollY = scroll;
      // Lenis reports px per frame; on touch (native) fall back to deltas so velocity is never silently zero.
      s.velocity = velocity !== 0 ? normalizeVelocity(velocity / 16.67) : deltaVelocity(prevY, scroll, now - prevT);
      prevY = scroll;
      prevT = now;
      s.g = Math.min(1, Math.max(0, scroll / s.maxScroll));
    });
    let raf = 0;
    const loop = (t: number) => {
      lenis.raf(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      lenisRef.current = null;
      window.removeEventListener('resize', measure);
      ro.disconnect();
    };
  }, [reducedMotion]);

  const value = useMemo<Ctx>(() => ({
    state,
    reducedMotion,
    tier,
    scrollTo: (id: string) => {
      const el = document.getElementById(id);
      if (!el) return;
      const lenis = lenisRef.current;
      if (lenis) lenis.scrollTo(el, { duration: 1.4, easing: (t: number) => 1 - Math.pow(1 - t, 3) });
      else el.scrollIntoView({ behavior: 'auto' });
    },
  }), [reducedMotion, tier]);

  return <ScrollCtx.Provider value={value}>{children}</ScrollCtx.Provider>;
}

export function useScroll(): Ctx {
  const c = useContext(ScrollCtx);
  if (!c) throw new Error('useScroll outside ScrollProvider');
  return c;
}
