"use client";

import { motion } from "framer-motion";
import { experience } from "@/lib/data";

export default function Experience() {
  return (
    <section className="min-h-screen flex items-center justify-center py-24 px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto w-full rounded-2xl bg-bg-card/80 backdrop-blur-md border border-white/5 p-8 md:p-12"
      >
        <h2 className="text-sm font-mono text-accent mb-12">02 / Experience</h2>

        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-trunk/60 via-trunk/30 to-transparent" />

          {experience.map((exp, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: i * 0.15 }}
              className="relative pl-12 pb-16 last:pb-0 group"
            >
              <div className="absolute left-[9px] top-1.5 w-3 h-3 rounded-full border-2 border-trunk bg-bg-card group-hover:bg-accent transition-colors duration-300" />

              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                <div>
                  <h3 className="text-xl font-heading font-bold text-light">{exp.company}</h3>
                  <p className="text-muted text-sm italic">{exp.role}</p>
                </div>
                <div className="text-sm font-mono text-muted whitespace-nowrap">{exp.dates}</div>
              </div>

              <p className="text-xs font-mono text-muted/60 mt-1">{exp.location}</p>

              <ul className="mt-4 space-y-2">
                {exp.bullets.map((bullet, j) => (
                  <li key={j} className="text-sm text-muted leading-relaxed flex gap-2">
                    <span className="text-accent mt-1 shrink-0">&#9657;</span>
                    {bullet}
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap gap-2 mt-4">
                {exp.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 text-xs font-mono text-accent/80 bg-accent/10 rounded border border-accent/20"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
