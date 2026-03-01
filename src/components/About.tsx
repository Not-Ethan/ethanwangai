"use client";

import { motion } from "framer-motion";
import AnimatedCounter from "./AnimatedCounter";
import { stats } from "@/lib/data";

export default function About() {
  return (
    <section id="about" className="py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-sm font-mono text-accent mb-4"
        >
          01 / About
        </motion.h2>

        <div className="grid md:grid-cols-2 gap-16 items-start">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-xl md:text-2xl font-heading text-light leading-relaxed">
              I&apos;m a computer science and mathematics student at{" "}
              <span className="text-accent">Case Western Reserve University</span>{" "}
              who builds things at the intersection of quantitative systems, AI infrastructure, and startups.
            </p>
            <p className="mt-6 text-muted leading-relaxed">
              Currently co-founding Darch AI, where I architect high-throughput media pipelines
              serving 20M+ monthly impressions. Previously built AI tools at NIST. On the side,
              I run automated trading systems on prediction markets — reaching the top 100 on
              Kalshi&apos;s all-time crypto leaderboard.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 gap-8">
            {stats.map((stat, i) => (
              <AnimatedCounter key={i} value={stat.value} label={stat.label} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
