"use client";

import { motion } from "framer-motion";
import SectionHeading from "./SectionHeading";
import { skills } from "@/lib/data";
import { mulberry32 } from "@/lib/forest";

function Sprout() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-moss" aria-hidden>
      <path
        fill="currentColor"
        d="M12 22v-8m0 0c0-4-3-7-8-7 0 4 3 7 8 7Zm0 0c0-5 3.5-8 8-8 0 5-3.5 8-8 8Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        fillOpacity="0.25"
      />
    </svg>
  );
}

// Pills get a tiny seeded tilt so they look scattered on the forest floor
const rnd = mulberry32(133);
const TILTS = Array.from({ length: 32 }, () => (rnd() - 0.5) * 3);

export default function Skills() {
  const categories = Object.entries(skills);
  let tiltIdx = 0;

  return (
    <section id="skills" className="relative scroll-mt-20 px-6 py-28 md:py-36">
      <div className="mx-auto max-w-5xl">
        <SectionHeading num="04" name="The Undergrowth" title="What grows down here." />

        <div className="mt-14 space-y-12">
          {categories.map(([category, items], catIndex) => (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: catIndex * 0.1, duration: 0.5 }}
            >
              <h3 className="mb-5 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-fog">
                <Sprout />
                {category}
              </h3>
              <div className="flex flex-wrap gap-3">
                {items.map((skill, i) => {
                  const tilt = TILTS[tiltIdx++ % TILTS.length];
                  return (
                    <motion.span
                      key={skill}
                      initial={{ opacity: 0, scale: 0.7 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{
                        delay: catIndex * 0.08 + i * 0.05,
                        type: "spring",
                        bounce: 0.45,
                      }}
                      whileHover={{
                        scale: 1.07,
                        rotate: 0,
                        boxShadow: "0 0 18px rgba(251,191,36,0.25)",
                      }}
                      style={{ rotate: tilt }}
                      className="cursor-default rounded-full border border-moss/20 bg-pine/70 px-4 py-2 font-mono text-sm text-mist/85 backdrop-blur-sm transition-colors hover:border-firefly/40 hover:text-firefly"
                    >
                      {skill}
                    </motion.span>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
