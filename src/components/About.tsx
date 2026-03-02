"use client";

import { motion } from "framer-motion";
import ProjectMetricsCarousel from "./ProjectMetricsCarousel";
import { projectMetrics, skills } from "@/lib/data";

export default function About() {
  const categories = Object.entries(skills);

  return (
    <section className="h-screen flex items-center justify-center py-16 px-6">
      <div className="max-w-6xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl glass-panel panel-ring p-6 md:p-8"
        >
          <h2 className="text-sm font-mono section-title mb-3">01 / About</h2>

          <div className="grid md:grid-cols-2 gap-8 items-start">
            <div>
              <p className="text-lg md:text-xl font-heading text-light leading-relaxed">
                I&apos;m a computer science and mathematics student at{" "}
                <span className="text-accent">Case Western Reserve University</span>{" "}
                who builds things at the intersection of quantitative systems, AI infrastructure, and startups.
              </p>
              <p className="mt-4 text-sm text-muted leading-relaxed">
                Currently co-founding Darch AI, where I architect high-throughput media pipelines
                serving 20M+ monthly impressions. Previously built AI tools at NIST. On the side,
                I run automated trading systems on prediction markets — reaching the top 100 on
                Kalshi&apos;s all-time crypto leaderboard.
              </p>
            </div>

            <ProjectMetricsCarousel projects={projectMetrics} />
          </div>

          {/* Skills */}
          <div className="mt-5 pt-4 border-t border-white/5">
            <h3 className="text-sm font-mono text-accent mb-3">Skills</h3>
            <div className="space-y-2.5">
              {categories.map(([category, items]) => (
                <div key={category} className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono text-cyan/60 uppercase tracking-wider w-24 shrink-0">
                    {category}
                  </span>
                  {items.map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 text-xs font-mono text-light/85 bg-bg/45 rounded border border-cyan/20 hover:border-accent/45 hover:text-accent hover:-translate-y-0.5 transition-all cursor-default"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
