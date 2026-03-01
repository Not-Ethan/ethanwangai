"use client";

import { motion } from "framer-motion";
import { skills } from "@/lib/data";

export default function Skills() {
  const categories = Object.entries(skills);

  return (
    <section id="skills" className="py-32 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-sm font-mono text-accent mb-16"
        >
          04 / Skills
        </motion.h2>

        <div className="space-y-10">
          {categories.map(([category, items], catIndex) => (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: catIndex * 0.1 }}
            >
              <h3 className="text-xs font-mono text-muted uppercase tracking-wider mb-4">
                {category}
              </h3>
              <div className="flex flex-wrap gap-3">
                {items.map((skill, i) => (
                  <motion.span
                    key={skill}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: catIndex * 0.1 + i * 0.05 }}
                    whileHover={{ scale: 1.05, boxShadow: "0 0 15px rgba(59,130,246,0.3)" }}
                    className="px-4 py-2 text-sm font-mono text-light/80 bg-bg-card rounded-lg border border-white/5 hover:border-accent/40 hover:text-accent transition-all cursor-default"
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
