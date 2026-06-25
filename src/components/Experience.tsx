"use client";

import { motion } from "framer-motion";
import SectionHeading from "./SectionHeading";
import { experience } from "@/lib/data";

export default function Experience() {
  return (
    <section
      id="experience"
      className="relative min-h-screen flex items-center py-28 px-6 md:px-12"
    >
      <div className="max-w-4xl mx-auto w-full">
        <SectionHeading chapterId="experience" kicker="Experience" />

        <div className="relative">
          {/* The trail */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-accent/60 via-sage/30 to-transparent" />

          {experience.map((exp, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="relative pl-12 pb-12 last:pb-0 group"
            >
              <span className="absolute left-0 top-1.5 h-4 w-4 rounded-full border-2 border-accent bg-bg transition-all duration-500 group-hover:bg-accent group-hover:shadow-[0_0_14px_2px_rgba(227,168,87,0.6)]" />

              <div className="glass glass-hover rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                  <div>
                    <h3 className="text-xl font-display font-medium text-light">
                      {exp.company}
                    </h3>
                    <p className="text-sage/80 text-sm italic">{exp.role}</p>
                  </div>
                  <div className="text-xs font-mono text-muted whitespace-nowrap">
                    {exp.dates}
                  </div>
                </div>

                <p className="text-xs font-mono text-muted/60 mt-1">
                  {exp.location}
                </p>

                <ul className="mt-4 space-y-2">
                  {exp.bullets.map((bullet, j) => (
                    <li
                      key={j}
                      className="text-sm text-light/70 leading-relaxed flex gap-2"
                    >
                      <span className="text-accent mt-1 shrink-0">▹</span>
                      {bullet}
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap gap-2 mt-5">
                  {exp.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-0.5 text-xs font-mono text-sage bg-sage/10 rounded-full border border-sage/20"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
