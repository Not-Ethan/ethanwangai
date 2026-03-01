"use client";

import { motion } from "framer-motion";
import ProjectMetricsCarousel from "./ProjectMetricsCarousel";
import { projectMetrics, skills } from "@/lib/data";

export default function About() {
  const categories = Object.entries(skills);

  return (
    <section className="min-h-screen flex items-center justify-center py-24 px-6">
      <div className="max-w-6xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl bg-bg-card/80 backdrop-blur-md border border-white/5 p-8 md:p-12"
        >
          <h2 className="text-sm font-mono text-accent mb-4">01 / About</h2>

          <div className="grid md:grid-cols-2 gap-16 items-start">
            <div>
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
            </div>

            <ProjectMetricsCarousel projects={projectMetrics} />
          </div>

          {/* Skills (folded in) */}
          <div className="mt-12 pt-8 border-t border-white/5">
            <h3 className="text-sm font-mono text-accent mb-6">Skills</h3>
            <div className="space-y-6">
              {categories.map(([category, items]) => (
                <div key={category}>
                  <h4 className="text-xs font-mono text-muted uppercase tracking-wider mb-3">
                    {category}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {items.map((skill) => (
                      <span
                        key={skill}
                        className="px-3 py-1.5 text-sm font-mono text-light/80 bg-bg/50 rounded-lg border border-white/5 hover:border-accent/40 hover:text-accent transition-all cursor-default"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
