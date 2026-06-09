"use client";

import { useEffect, useState } from "react";
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { journey } from "@/lib/data";

const CANOPY_HEIGHT_M = 44;

type Dot = { id: string; name: string; p: number };

/**
 * Fixed trail map on the right edge (desktop only): a dashed path that fills
 * in as you descend, waypoint dots for each section, and an altimeter
 * counting down from the canopy to the forest floor.
 */
export default function TrailProgress() {
  const { scrollYProgress } = useScroll();
  const smooth = useSpring(scrollYProgress, { stiffness: 70, damping: 22 });
  const fillHeight = useTransform(smooth, (v) => `${v * 100}%`);
  const markerTop = useTransform(smooth, (v) => `${v * 100}%`);

  const [altitude, setAltitude] = useState(CANOPY_HEIGHT_M);
  const [activeIdx, setActiveIdx] = useState(0);
  const [dots, setDots] = useState<Dot[]>([]);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setAltitude(Math.max(0, Math.round(CANOPY_HEIGHT_M * (1 - v))));
    let idx = 0;
    for (let i = 0; i < dots.length; i++) {
      if (v >= dots[i].p - 0.04) idx = i;
    }
    setActiveIdx(idx);
  });

  useEffect(() => {
    const measure = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      setDots(
        journey.map((s) => {
          const el = document.getElementById(s.id);
          const top = el ? el.getBoundingClientRect().top + window.scrollY : 0;
          return { id: s.id, name: s.name, p: Math.min(1, Math.max(0, top / docHeight)) };
        })
      );
    };
    measure();
    const t = setTimeout(measure, 900);
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <div
      aria-label="Trail progress"
      className="fixed right-5 xl:right-8 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col items-center gap-4"
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog/80 [writing-mode:vertical-rl]">
        {journey[activeIdx]?.name ?? journey[0].name}
      </span>

      <div className="relative h-64 w-px border-l border-dashed border-mist/15">
        <motion.div
          style={{ height: fillHeight }}
          className="absolute -left-px top-0 w-px bg-gradient-to-b from-moss/30 via-moss to-firefly shadow-[0_0_8px_rgba(52,211,153,0.6)]"
        />

        {dots.map((d, i) => (
          <button
            key={d.id}
            aria-label={`Go to ${d.name}`}
            onClick={() => document.getElementById(d.id)?.scrollIntoView({ behavior: "smooth" })}
            style={{ top: `${d.p * 100}%` }}
            className="group absolute -left-px -translate-x-1/2 -translate-y-1/2 p-1.5"
          >
            <span
              className={`block h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                i <= activeIdx
                  ? "bg-moss shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                  : "bg-fog/40"
              }`}
            />
            <span className="pointer-events-none absolute right-full top-1/2 mr-2 -translate-y-1/2 whitespace-nowrap rounded border border-canopy/60 bg-pine/95 px-2 py-1 font-mono text-[10px] text-fog opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              {d.name}
            </span>
          </button>
        ))}

        <motion.div
          style={{ top: markerTop }}
          className="absolute -left-px -translate-x-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-firefly shadow-[0_0_12px_3px_rgba(251,191,36,0.5)]"
        />
      </div>

      <div className="text-center">
        <div className="font-mono text-[11px] tabular-nums text-mist/90">
          {altitude > 0 ? `▲ ${altitude}m` : "● 0m"}
        </div>
        <div className="font-mono text-[9px] uppercase tracking-widest text-fog/60">
          {altitude > 0 ? "altitude" : "floor"}
        </div>
      </div>
    </div>
  );
}
