"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { siteConfig } from "@/lib/data";
import { EASE } from "@/components/sections/reveal";

export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  // Scrubbed exit: the hero drifts up and dissolves as you start walking,
  // and reassembles when you scroll back.
  const y = useTransform(scrollYProgress, [0, 1], [0, -140]);
  const opacity = useTransform(scrollYProgress, [0, 0.65], [1, 0]);
  const cueOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);

  const enter = (delay: number) => ({
    initial: { opacity: 0, y: 42 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 1, delay, ease: EASE },
  });

  return (
    <section id="hero" ref={ref} className="relative flex h-screen items-center justify-center px-6">
      <motion.div style={{ y, opacity }} className="section-scrim text-center max-w-4xl">
        <motion.p
          {...enter(1.5)}
          className="kicker mb-6"
        >
          Software engineer · CS + Math @ Case Western
        </motion.p>

        <motion.h1
          {...enter(1.7)}
          className="font-display font-semibold text-ink leading-[0.95] text-[clamp(3.6rem,13vw,9.5rem)]"
          style={{ textShadow: "0 2px 34px rgba(4,7,5,0.55)" }}
        >
          Ethan <em className="font-normal">Wang</em>
        </motion.h1>

        <motion.p
          {...enter(2.0)}
          className="mt-7 text-base md:text-lg text-ink/80 max-w-xl mx-auto leading-relaxed"
        >
          {siteConfig.tagline}
        </motion.p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.8, duration: 1 }}
        className="absolute bottom-9 left-1/2 -translate-x-1/2"
      >
        <motion.div style={{ opacity: cueOpacity }} className="flex flex-col items-center gap-3">
          <span className="font-mono text-[10px] tracking-[0.28em] uppercase text-ink/60">
            scroll to walk
          </span>
          <span className="block h-10 w-px bg-ink/40 animate-cue" />
        </motion.div>
      </motion.div>
    </section>
  );
}
