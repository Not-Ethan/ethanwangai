"use client";

import { useState } from "react";
import { motion, useMotionValueEvent } from "framer-motion";
import { journeyClock } from "@/lib/journey";
import { useJourneyScroll } from "@/components/scroll/SmoothScroll";

/** Little clock in the corner: the walk runs from 05:30 to midnight. */
export default function JourneyClock() {
  const { progress } = useJourneyScroll();
  const [time, setTime] = useState("05:30");
  const [night, setNight] = useState(false);

  useMotionValueEvent(progress, "change", (p) => {
    const t = journeyClock(p);
    if (t !== time) setTime(t);
    setNight(p > 0.68);
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.9, delay: 2 }}
      aria-hidden
      className="fixed bottom-5 left-6 md:left-10 z-40 flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] text-ink/50 select-none"
    >
      <span className="text-[13px] leading-none">{night ? "☾" : "☀"}</span>
      <span>{time}</span>
    </motion.div>
  );
}
