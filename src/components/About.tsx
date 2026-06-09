"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import SectionHeading from "./SectionHeading";
import { treelinePath } from "@/lib/forest";

const CANOPY_OVERHEAD = treelinePath(77, 1440, 160, 0.4, 0.9);

export default function About() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const yCanopy = useTransform(scrollYProgress, [0, 1], [-30, 30]);

  return (
    <section ref={ref} id="about" className="relative scroll-mt-20 overflow-hidden px-6 py-28 md:py-36">
      {/* Canopy hanging overhead: you've dropped below the treetops */}
      <motion.div style={{ y: yCanopy }} className="absolute inset-x-0 -top-2" aria-hidden>
        <svg
          viewBox="0 0 1440 160"
          preserveAspectRatio="none"
          className="block h-24 w-full rotate-180 md:h-32"
        >
          <path d={CANOPY_OVERHEAD} fill="#071109" opacity="0.9" />
        </svg>
      </motion.div>

      {/* Moonlight shafts through the leaves */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 left-[12%] h-[120%] w-24 -skew-x-12 bg-gradient-to-b from-mist/[0.05] to-transparent" />
        <div className="absolute -top-20 left-[55%] h-[110%] w-40 -skew-x-12 bg-gradient-to-b from-mist/[0.035] to-transparent" />
        <div className="absolute -top-20 right-[8%] h-[100%] w-16 -skew-x-12 bg-gradient-to-b from-mist/[0.045] to-transparent" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <SectionHeading num="01" name="The Descent" title="Beneath the treetops." />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="mt-12 max-w-3xl"
        >
          <p className="font-display text-xl leading-relaxed text-mist md:text-2xl">
            I&apos;m a computer science and mathematics student at{" "}
            <span className="text-leaf">Case Western Reserve University</span> who
            builds things at the intersection of quantitative systems, AI
            infrastructure, and startups.
          </p>
          <p className="mt-6 leading-relaxed text-fog">
            Currently co-founding Darch AI, where I architect high-throughput media
            pipelines serving 20M+ monthly impressions. Previously built AI tools at
            NIST. On the side, I run automated trading systems on prediction markets,
            reaching the top 100 on Kalshi&apos;s all-time crypto leaderboard.
          </p>
          <p className="mt-6 font-display italic text-fog/70">
            The deeper you scroll, the closer you get to the forest floor. Keep
            descending.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
