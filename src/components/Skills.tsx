"use client";

import { motion } from "framer-motion";
import SectionHeading from "./SectionHeading";
import { skills } from "@/lib/data";

export default function Skills() {
  const categories = Object.entries(skills);

  return (
    <section id="skills" className="relative py-32 md:py-40 px-6 md:px-12">
      <div className="max-w-5xl mx-auto">
        <SectionHeading chapterId="skills" kicker="Skills" />

        <div className="grid gap-5 md:grid-cols-3">
          {categories.map(([category, items], catIndex) => (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: catIndex * 0.1 }}
              className="glass rounded-2xl p-6"
            >
              <h3 className="text-xs font-mono text-accent uppercase tracking-[0.2em] mb-5">
                {category}
              </h3>
              <div className="flex flex-wrap gap-2.5">
                {items.map((skill, i) => (
                  <motion.span
                    key={skill}
                    initial={{ opacity: 0, scale: 0.85 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: catIndex * 0.1 + i * 0.04 }}
                    whileHover={{ y: -2 }}
                    className="px-3.5 py-1.5 text-sm font-mono text-light/80 bg-white/[0.03] rounded-full border border-white/10 hover:border-accent/40 hover:text-accent transition-colors cursor-default"
                  >
                    {skill}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
