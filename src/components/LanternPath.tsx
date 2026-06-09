"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useMotionValueEvent,
  animate,
  type MotionValue,
} from "framer-motion";
import { stats } from "@/lib/data";
import { treelinePath } from "@/lib/forest";

const DISTANT_RIDGE = treelinePath(31, 1440, 140, 0.25, 0.55);

// Where along the walk each lantern lights up, plus per-lantern hang/sway
// variation so the row feels hand-strung rather than manufactured.
const THRESHOLDS = [0.28, 0.46, 0.64, 0.82];
const HANGS = [56, 8, 80, 28];
const SWAYS = [5.4, 6.3, 4.8, 5.9];

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

function CountUp({ value, started }: { value: string; started: boolean }) {
  const { prefix, target, suffix, decimals } = parseValue(value);
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!started) return;
    const controls = animate(0, target, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v.toFixed(decimals)),
    });
    return () => controls.stop();
  }, [started, target, decimals]);

  return (
    <span className="tabular-nums">
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

function Lantern({
  stat,
  index,
  progress,
}: {
  stat: { value: string; label: string };
  index: number;
  progress: MotionValue<number>;
}) {
  const t = THRESHOLDS[index % THRESHOLDS.length];
  const lit = useTransform(progress, [t - 0.08, t], [0, 1]);
  const haloOpacity = useTransform(lit, [0, 1], [0.04, 0.65]);
  const numberColor = useTransform(lit, [0, 1], ["rgba(143,168,152,0.5)", "#3a2206"]);
  const [started, setStarted] = useState(false);
  useMotionValueEvent(progress, "change", (v) => {
    if (v >= t - 0.06) setStarted(true);
  });

  return (
    <div
      className="relative flex w-44 shrink-0 flex-col items-center md:w-52"
      style={{ paddingTop: HANGS[index % HANGS.length] }}
    >
      <div
        className="flex origin-top animate-sway flex-col items-center"
        style={{
          animationDuration: `${SWAYS[index % SWAYS.length]}s`,
          animationDelay: `${index * 0.8}s`,
        }}
      >
        {/* String vanishing into the dark canopy above */}
        <div
          aria-hidden
          className="h-28 w-px bg-gradient-to-b from-transparent via-mist/15 to-mist/35 md:h-36"
        />

        <div className="relative">
          {/* Warm halo once lit */}
          <motion.div
            aria-hidden
            style={{ opacity: haloOpacity }}
            className="absolute -inset-10 rounded-full bg-firefly/30 blur-2xl"
          />

          <svg viewBox="0 0 140 180" className="relative h-40 w-auto md:h-48" aria-hidden>
            <defs>
              <linearGradient id={`lit-${index}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fff0b8" />
                <stop offset="55%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
            </defs>
            {/* handle */}
            <path d="M50 22 Q70 -8 90 22" fill="none" stroke="#38503e" strokeWidth="5" strokeLinecap="round" />
            {/* chimney */}
            <rect x="58" y="14" width="24" height="12" rx="3" fill="#2c3a2e" />
            {/* top cap */}
            <path d="M36 26 L104 26 L114 42 L26 42 Z" fill="#324636" />
            {/* glass, dark until you reach it */}
            <rect x="30" y="46" width="80" height="92" rx="12" fill="#101d14" stroke="#2c3a2e" strokeWidth="3" />
            <motion.rect
              x="30"
              y="46"
              width="80"
              height="92"
              rx="12"
              fill={`url(#lit-${index})`}
              style={{ opacity: lit }}
            />
            {/* flame */}
            <motion.g style={{ opacity: lit }}>
              <ellipse cx="70" cy="120" rx="9" ry="13" fill="#fb923c" opacity="0.55" />
              <ellipse cx="70" cy="122" rx="5.5" ry="9" fill="#fff7d6" />
            </motion.g>
            {/* frame bars */}
            <line x1="48" y1="46" x2="48" y2="138" stroke="#2c3a2e" strokeWidth="2.5" opacity="0.85" />
            <line x1="92" y1="46" x2="92" y2="138" stroke="#2c3a2e" strokeWidth="2.5" opacity="0.85" />
            {/* base */}
            <path d="M26 138 L114 138 L104 156 L36 156 Z" fill="#324636" />
            <rect x="54" y="156" width="32" height="8" rx="3" fill="#2c3a2e" />
          </svg>

          {/* Stat inside the glass */}
          <div className="absolute inset-x-[21%] top-[28%] bottom-[26%] grid place-items-center">
            <motion.span
              style={{ color: numberColor }}
              className="font-mono text-lg font-medium md:text-xl"
            >
              <CountUp value={stat.value} started={started} />
            </motion.span>
          </div>
        </div>
      </div>

      <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-fog">
        {stat.label}
      </p>
    </div>
  );
}

/**
 * "Lanterns hung along the path": the section pins while vertical scroll
 * pans the scene sideways, like walking a trail past four hanging lanterns.
 * Each one flickers on as you reach it.
 */
export default function LanternPath() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [shift, setShift] = useState(0);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  useEffect(() => {
    const measure = () => {
      if (!stageRef.current || !trackRef.current) return;
      setShift(Math.max(0, trackRef.current.scrollWidth - stageRef.current.clientWidth));
    };
    measure();
    const t = setTimeout(measure, 600);
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
    };
  }, []);

  const x = useTransform(scrollYProgress, [0.04, 0.96], [0, -shift]);
  const xs = useSpring(x, { stiffness: 55, damping: 19, mass: 0.4 });
  const xRidge = useTransform(xs, (v) => v * 0.25);

  return (
    <section ref={sectionRef} className="relative h-[300vh]">
      <div ref={stageRef} className="sticky top-0 flex h-svh items-center overflow-hidden">
        {/* Distant ridge drifting slower: depth while you walk */}
        <motion.div style={{ x: xRidge }} className="absolute bottom-0 left-0 w-[200%]" aria-hidden>
          <svg viewBox="0 0 1440 140" preserveAspectRatio="none" className="block h-24 w-full md:h-32">
            <path d={DISTANT_RIDGE} fill="#0a150d" opacity="0.85" />
          </svg>
        </motion.div>

        {/* Low fog over the trail */}
        <div
          aria-hidden
          className="absolute inset-x-[-20%] bottom-10 h-20 animate-mist rounded-full bg-mist/[0.04] blur-3xl"
        />

        {/* Everything that pans as you walk */}
        <motion.div
          ref={trackRef}
          style={{ x: xs }}
          className="absolute flex items-center gap-12 pl-[8vw] pr-[12vw] md:gap-20"
        >
          {/* The trail underfoot */}
          <div
            aria-hidden
            className="absolute bottom-[-26vh] left-0 h-px w-full bg-[repeating-linear-gradient(90deg,rgba(234,242,236,0.2)_0_14px,transparent_14px_32px)]"
          />

          {/* Lead-in */}
          <div className="w-[72vw] shrink-0 sm:w-[26rem]">
            <p className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.3em] text-moss">
              <span className="inline-block h-px w-8 bg-moss/40" />
              lanterns hung along the path
            </p>
            <h3 className="mt-4 font-display text-3xl font-semibold text-mist md:text-4xl">
              Numbers gathered on the way down.
            </h3>
            <p className="mt-4 font-mono text-xs text-fog/70">
              keep scrolling to walk the path →
            </p>
          </div>

          {stats.map((stat, i) => (
            <Lantern key={stat.label} stat={stat} index={i} progress={scrollYProgress} />
          ))}

          {/* Walk off the end of the path */}
          <div className="w-[40vw] shrink-0 text-center sm:w-[16rem]">
            <p className="font-display text-xl italic text-fog/80">the path continues</p>
            <p className="mt-2 animate-bounce font-mono text-xs text-fog/60">↓</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
