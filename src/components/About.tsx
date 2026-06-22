"use client";

import { motion } from "framer-motion";
import AnimatedCounter from "./AnimatedCounter";
import SectionHeading from "./SectionHeading";
import { stats } from "@/lib/data";

export default function About() {
  return (
    <section id="about" className="relative py-32 md:py-40 px-6 md:px-12">
      <div className="max-w-6xl mx-auto">
        <SectionHeading chapterId="about" kicker="About" />

        <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-start">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
          >
            <p className="text-2xl md:text-3xl font-display font-light text-light leading-snug">
              I build things at the intersection of{" "}
              <span className="text-gradient">quantitative systems</span>,{" "}
              <span className="text-gradient">AI infrastructure</span>, and{" "}
              <span className="text-gradient">startups</span>.
            </p>
            <p className="mt-6 text-muted leading-relaxed">
              I&apos;m a computer science and mathematics student at Case Western
              Reserve University. Currently co-founding Darch AI, where I
              architect high-throughput media pipelines serving 20M+ monthly
              impressions. Previously built AI tools at NIST. On the side, I run
              automated trading systems on prediction markets — reaching the top
              100 on Kalshi&apos;s all-time crypto leaderboard.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 gap-4">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: i * 0.08 }}
                className="glass glass-hover rounded-2xl p-6 flex flex-col justify-center"
              >
                <AnimatedCounter value={stat.value} label={stat.label} />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
