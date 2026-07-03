"use client";

import { useState } from "react";
import { motion, useMotionValueEvent } from "framer-motion";
import { stations } from "@/lib/journey";
import { useJourneyScroll } from "@/components/scroll/SmoothScroll";

/** Vertical trail on the right edge: a line that fills as you walk,
 *  with a station marker per section. */
export default function TrailNav() {
  const { progress, scrollTo } = useJourneyScroll();
  const [active, setActive] = useState(0);

  useMotionValueEvent(progress, "change", (p) => {
    let nearest = 0;
    stations.forEach((s, i) => {
      if (Math.abs(p - s.t) < Math.abs(p - stations[nearest].t)) nearest = i;
    });
    if (nearest !== active) setActive(nearest);
  });

  return (
    <motion.nav
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.9, delay: 1.6 }}
      aria-label="Journey progress"
      className="fixed right-4 md:right-7 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center"
    >
      <div className="relative h-44 w-px bg-ink/15">
        <motion.div
          className="absolute top-0 left-0 w-px bg-amber origin-top"
          style={{ scaleY: progress, height: "100%" }}
        />
        {stations.map((s, i) => (
          <button
            key={s.id}
            onClick={() => scrollTo(`#${s.id}`)}
            aria-label={`${s.nav} — ${s.label}`}
            aria-current={active === i ? "true" : undefined}
            className="group absolute -translate-x-1/2 -translate-y-1/2 left-1/2 p-2"
            style={{ top: `${s.t * 100}%` }}
          >
            <span
              className={`block h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                active === i
                  ? "bg-amber scale-150 shadow-[0_0_10px_rgba(255,180,94,0.9)]"
                  : "bg-ink/40 group-hover:bg-ink/80"
              }`}
            />
            <span className="pointer-events-none absolute right-6 top-1/2 -translate-y-1/2 whitespace-nowrap font-mono text-[10px] tracking-[0.18em] uppercase text-ink/80 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">
              {s.nav} · {s.label}
            </span>
          </button>
        ))}
      </div>
    </motion.nav>
  );
}
