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

    // Section centers, measured once and on resize.
    const centers: number[] = [];
    const measure = () => {
      const vh = window.innerHeight;
      const maxScroll = document.documentElement.scrollHeight - vh;
      centers.length = 0;
      for (const s of stations) {
        const el = document.getElementById(s.id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const center = window.scrollY + rect.top + rect.height / 2 - vh / 2;
        centers.push(Math.min(Math.max(0, center), maxScroll));
      }
    };

    // Resistance valley: near a section's center, incoming wheel/touch
    // deltas are scaled down, so it takes more input to push through the
    // middle. Input shaping only — the scroll position is never moved
    // programmatically.
    const lenis = new Lenis({
      lerp: 0.09,
      wheelMultiplier: 1,
      virtualScroll: (e: { deltaY: number }) => {
        const vh = window.innerHeight;
        const here = window.scrollY;
        let dist = Infinity;
        for (const c of centers) {
          const d = Math.abs(c - here);
          if (d < dist) dist = d;
        }
        const radius = vh * 0.34;
        if (dist < radius) {
          const depth = 1 - dist / radius; // 0 at the rim → 1 at the center
          e.deltaY *= 1 - 0.75 * depth * depth; // down to ~0.25 at the center
        }
        return true;
      },
    });
    lenisRef.current = lenis;
    measure();
    window.addEventListener("resize", measure);

    lenis.on("scroll", ({ scroll, limit }: { scroll: number; limit: number }) => {
      progress.set(limit > 0 ? scroll / limit : 0);
    });

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
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
