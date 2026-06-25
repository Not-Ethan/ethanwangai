"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import Snap from "lenis/snap";
import { scrollState } from "@/lib/scroll";
import { chapters } from "@/lib/data";

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/**
 * Buttery inertial scrolling via Lenis, plus magnetic section snapping.
 *
 * Lenis still drives the native scroll position, so Framer Motion's
 * whileInView / useScroll keep working, while we mirror progress into the
 * shared scrollState the 3D scene reads.
 *
 * On desktop, a mandatory Snap pulls the page to the nearest section centre:
 * the further you are between two sections the stronger the pull back, so a
 * decisive scroll stroke lands cleanly on the next scene instead of stranding
 * you mid-transition. Disabled for touch / reduced-motion.
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
      lerp: reduce ? 1 : 0.09,
      smoothWheel: !reduce,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
    });

    lenis.on("scroll", (e: { progress: number; velocity: number }) => {
      scrollState.progress = e.progress;
      scrollState.velocity = e.velocity;
    });

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // Magnetic snapping — desktop pointers only, never on touch / reduced-motion.
    const canSnap =
      !reduce &&
      window.matchMedia("(min-width: 820px) and (pointer: fine)").matches;

    let snap: Snap | undefined;
    let cleanupSnap: (() => void) | undefined;
    if (canSnap) {
      snap = new Snap(lenis, {
        type: "mandatory",
        duration: 1.1,
        easing: easeInOutCubic,
        debounce: 250,
      });
      // Snap to the centre of each chapter section.
      const removers = chapters
        .map((c) => document.getElementById(c.id))
        .filter((el): el is HTMLElement => !!el)
        .map((el) => snap!.addElement(el, { align: ["center"] }));
      cleanupSnap = () => removers.forEach((r) => r());
    }

    return () => {
      cancelAnimationFrame(raf);
      cleanupSnap?.();
      snap?.destroy();
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
