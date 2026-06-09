"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { siteConfig } from "@/lib/data";
import { treelinePath, makeStars } from "@/lib/forest";

const STARS = makeStars(7, 110);
const RIDGE_BACK = treelinePath(11, 1440, 200, 0.35, 0.7);
const RIDGE_MID = treelinePath(23, 1440, 220, 0.45, 0.85);
const RIDGE_FRONT = treelinePath(42, 1440, 240, 0.55, 1);

function Leaf({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M17 3C9 3 4 8.5 4 15c0 2.5 1 4.5 1 4.5S6.5 21 9 21c6.5 0 11-5 11-13 0-2.5-.5-5-3-5Zm-9.5 14.5C9 13 11.5 9.5 15.5 6.5c-2.5 4-4.5 7.5-6.5 12.5l-1.5-1.5Z"
      />
    </svg>
  );
}

export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // The farther the layer, the slower it climbs as you descend past it
  const yBack = useTransform(scrollYProgress, [0, 1], [0, -40]);
  const yMid = useTransform(scrollYProgress, [0, 1], [0, -90]);
  const yFront = useTransform(scrollYProgress, [0, 1], [0, -150]);
  const yContent = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const fadeContent = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const yMoon = useTransform(scrollYProgress, [0, 1], [0, 60]);

  return (
    <section
      id="top"
      ref={ref}
      className="relative flex min-h-svh items-center justify-center overflow-hidden"
    >
      {/* Stars */}
      <div className="absolute inset-0" aria-hidden>
        {STARS.map((s, i) => (
          <span
            key={i}
            className={`absolute rounded-full ${
              s.bright ? "bg-mist" : "bg-mist/70"
            } animate-twinkle`}
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.size,
              height: s.size,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.duration}s`,
              boxShadow: s.bright ? "0 0 6px rgba(234,242,236,0.8)" : undefined,
            }}
          />
        ))}
      </div>

      {/* Shooting star */}
      <div
        aria-hidden
        className="absolute right-[8%] top-[14%] h-px w-28 animate-shoot bg-gradient-to-l from-mist via-mist/40 to-transparent"
      />

      {/* Moon */}
      <motion.div
        style={{ y: yMoon }}
        aria-hidden
        className="absolute right-[10%] top-[12%] md:right-[16%] md:top-[16%]"
      >
        <div className="absolute -inset-10 rounded-full bg-mist/10 blur-2xl" />
        <svg viewBox="0 0 64 64" className="relative h-16 w-16 md:h-20 md:w-20">
          <circle cx="32" cy="32" r="30" fill="#e8efe6" />
          <circle cx="22" cy="24" r="6" fill="#cfdacd" />
          <circle cx="40" cy="40" r="8" fill="#d8e2d6" />
          <circle cx="44" cy="20" r="4" fill="#d2ddd0" />
        </svg>
      </motion.div>

      {/* Name + tagline */}
      <motion.div
        style={{ y: yContent, opacity: fadeContent }}
        className="relative z-10 px-6 text-center"
      >
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.15 }}
          className="font-mono text-[9px] md:text-[11px] uppercase tracking-[0.25em] md:tracking-[0.35em] text-moss"
        >
          44m above the forest floor
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.3 }}
          className="mt-5 bg-gradient-to-b from-mist via-mist to-moss/60 bg-clip-text pb-[0.12em] font-display text-6xl font-bold leading-[1.1] text-transparent md:text-8xl"
        >
          {siteConfig.name}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.55 }}
          className="mx-auto mt-4 max-w-md font-display text-lg italic text-fog md:text-xl"
        >
          {siteConfig.tagline}
        </motion.p>
      </motion.div>

      {/* Treeline parallax layers */}
      <motion.div style={{ y: yBack }} className="absolute inset-x-0 bottom-0" aria-hidden>
        <svg viewBox="0 0 1440 200" preserveAspectRatio="none" className="block h-36 w-full md:h-48">
          <path d={RIDGE_BACK} fill="#11271c" />
        </svg>
      </motion.div>

      <div
        aria-hidden
        className="absolute inset-x-[-20%] bottom-16 h-24 animate-mist rounded-full bg-mist/5 blur-3xl"
      />

      <motion.div style={{ y: yMid }} className="absolute inset-x-0 -bottom-4" aria-hidden>
        <svg viewBox="0 0 1440 220" preserveAspectRatio="none" className="block h-44 w-full md:h-56">
          <path d={RIDGE_MID} fill="#0a1c11" />
        </svg>
      </motion.div>

      <motion.div style={{ y: yFront }} className="absolute inset-x-0 -bottom-8" aria-hidden>
        <svg viewBox="0 0 1440 240" preserveAspectRatio="none" className="block h-52 w-full md:h-64">
          <path d={RIDGE_FRONT} fill="#050d08" />
        </svg>
      </motion.div>

      {/* Scroll cue */}
      <motion.a
        href="#about"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 1 }}
        className="group absolute bottom-7 left-1/2 z-10 -translate-x-1/2 flex flex-col items-center gap-1.5"
        aria-label="Begin the descent"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-fog/80 transition-colors group-hover:text-leaf">
          begin the descent
        </span>
        <Leaf className="h-4 w-4 animate-fall text-moss" />
      </motion.a>
    </section>
  );
}
