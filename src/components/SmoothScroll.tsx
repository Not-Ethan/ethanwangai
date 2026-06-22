"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { scrollState } from "@/lib/scroll";

/**
 * Buttery inertial scrolling via Lenis. Lenis still drives the native scroll
 * position, so Framer Motion's whileInView / useScroll keep working, while we
 * also mirror progress into the shared scrollState the 3D scene reads.
 */
export default function SmoothScroll({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const lenis = new Lenis({
      duration: reduce ? 0 : 1.1,
      smoothWheel: !reduce,
      wheelMultiplier: 1,
      touchMultiplier: 1.4,
    });

    lenis.on(
      "scroll",
      (e: { progress: number; velocity: number }) => {
        scrollState.progress = e.progress;
        scrollState.velocity = e.velocity;
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
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
