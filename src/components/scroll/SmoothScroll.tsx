"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import Lenis from "lenis";
import { motionValue, type MotionValue } from "framer-motion";
import { stations } from "@/lib/journey";

function subscribeReducedMotion(callback: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function useReducedMotionPreference(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );
}

interface ScrollContextValue {
  /** Normalized document scroll progress, 0–1. Safe to read from rAF loops. */
  progress: MotionValue<number>;
  scrollTo: (target: string) => void;
  reducedMotion: boolean;
}

const ScrollContext = createContext<ScrollContextValue | null>(null);

export function useJourneyScroll() {
  const ctx = useContext(ScrollContext);
  if (!ctx) throw new Error("useJourneyScroll must be used inside <SmoothScroll>");
  return ctx;
}

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const progress = useMemo(() => motionValue(0), []);
  const lenisRef = useRef<Lenis | null>(null);
  const reducedMotion = useReducedMotionPreference();

  useEffect(() => {
    const updateFromNative = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.set(max > 0 ? window.scrollY / max : 0);
    };

    if (reducedMotion) {
      updateFromNative();
      window.addEventListener("scroll", updateFromNative, { passive: true });
      window.addEventListener("resize", updateFromNative);
      return () => {
        window.removeEventListener("scroll", updateFromNative);
        window.removeEventListener("resize", updateFromNative);
      };
    }

    const lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1 });
    lenisRef.current = lenis;

    // Magnetic settle: when scrolling comes to rest near a section's
    // center, ease the last stretch so stations feel like resting points
    // — resistance, not a hard snap.
    let settleTimer = 0;
    let lastVelocity = 0;

    const trySettle = () => {
      if (Math.abs(lastVelocity) > 0.08) return;
      const vh = window.innerHeight;
      const maxScroll = document.documentElement.scrollHeight - vh;
      let best: number | null = null;
      let bestDist = Infinity;
      for (const s of stations) {
        const el = document.getElementById(s.id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const center = Math.min(
          Math.max(0, window.scrollY + rect.top + rect.height / 2 - vh / 2),
          maxScroll
        );
        const dist = Math.abs(center - lenis.scroll);
        if (dist < bestDist) {
          bestDist = dist;
          best = center;
        }
      }
      if (best !== null && bestDist > 6 && bestDist < vh * 0.3) {
        lenis.scrollTo(best, {
          duration: 1.1,
          easing: (t) => 1 - Math.pow(1 - t, 3),
        });
      }
    };

    lenis.on(
      "scroll",
      ({ scroll, limit, velocity }: { scroll: number; limit: number; velocity: number }) => {
        progress.set(limit > 0 ? scroll / limit : 0);
        lastVelocity = velocity;
        window.clearTimeout(settleTimer);
        settleTimer = window.setTimeout(trySettle, 160);
      }
    );

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(settleTimer);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [progress, reducedMotion]);

  const value = useMemo<ScrollContextValue>(
    () => ({
      progress,
      reducedMotion,
      scrollTo: (target: string) => {
        const lenis = lenisRef.current;
        if (lenis) {
          lenis.scrollTo(target, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 3) });
        } else {
          document.querySelector(target)?.scrollIntoView({ behavior: "auto" });
        }
      },
    }),
    [progress, reducedMotion]
  );

  return <ScrollContext.Provider value={value}>{children}</ScrollContext.Provider>;
}
