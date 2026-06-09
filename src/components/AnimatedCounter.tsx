"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "framer-motion";

/** Parses values like "1.5M+", "13K+", "Top 100" into animatable parts. */
function parseValue(value: string) {
  const match = value.match(/^([^\d]*)([\d.]+)(.*)$/);
  if (!match) return { prefix: "", target: 0, suffix: value, decimals: 0 };
  const target = parseFloat(match[2]);
  return {
    prefix: match[1],
    target,
    suffix: match[3],
    decimals: target % 1 !== 0 ? 1 : 0,
  };
}

export default function AnimatedCounter({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const { prefix, target, suffix, decimals } = parseValue(value);
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, target, {
      duration: 2,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v.toFixed(decimals)),
    });
    return () => controls.stop();
  }, [inView, target, decimals]);

  return (
    <div
      ref={ref}
      className="group relative overflow-hidden rounded-2xl border border-moss/15 bg-pine/60 p-5 backdrop-blur-sm transition-all duration-500 hover:border-firefly/40 hover:shadow-[0_0_30px_rgba(251,191,36,0.12)]"
    >
      <span
        aria-hidden
        className="absolute right-4 top-4 h-1.5 w-1.5 animate-lantern rounded-full bg-firefly"
      />
      <div className="font-mono text-3xl font-medium tabular-nums text-mist md:text-4xl">
        {prefix}
        {display}
        {suffix}
      </div>
      <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-fog">
        {label}
      </div>
    </div>
  );
}
