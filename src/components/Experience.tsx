"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { experience } from "@/lib/data";

function renderBullet(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="text-accent font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
  }),
};

export default function Experience() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const navigate = useCallback(
    (index: number) => {
      if (index === activeIndex) return;
      setDirection(index > activeIndex ? 1 : -1);
      setActiveIndex(index);
    },
    [activeIndex]
  );

  const prev = useCallback(() => {
    if (activeIndex > 0) {
      setDirection(-1);
      setActiveIndex(activeIndex - 1);
    }
  }, [activeIndex]);

  const next = useCallback(() => {
    if (activeIndex < experience.length - 1) {
      setDirection(1);
      setActiveIndex(activeIndex + 1);
    }
  }, [activeIndex]);

  const exp = experience[activeIndex];

  return (
    <section className="h-screen flex items-center justify-center py-16 px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto w-full rounded-2xl glass-panel panel-ring p-6 md:p-8"
      >
        <h2 className="text-sm font-mono section-title mb-6">02 / Experience</h2>

        {/* Slide area */}
        <div className="relative min-h-[320px] overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={activeIndex}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: "easeInOut" }}
            >
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                <div>
                  <h3 className="text-xl font-heading font-bold text-light">
                    {exp.link ? (
                      <a href={exp.link} target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">
                        {exp.company} <span className="text-accent text-sm">↗</span>
                      </a>
                    ) : exp.company}
                  </h3>
                  <p className="text-muted text-sm italic">{exp.role}</p>
                </div>
                <div className="text-sm font-mono text-cyan/70 whitespace-nowrap">{exp.dates}</div>
              </div>

              <p className="text-xs font-mono text-muted/60 mt-1">{exp.location}</p>

              <ul className="mt-5 space-y-3">
                {exp.bullets.map((bullet, j) => (
                  <li key={j} className="text-sm text-light/90 leading-relaxed flex gap-2">
                  <span className="text-cyan mt-1 shrink-0">&#9657;</span>
                  <span>{renderBullet(bullet)}</span>
                </li>
              ))}
            </ul>

              <div className="flex flex-wrap gap-2 mt-5">
                {exp.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 text-xs font-mono text-accent/90 bg-accent/10 rounded border border-cyan/25 shadow-[0_0_12px_rgba(86,215,211,0.15)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={prev}
            className={`p-1 transition-colors ${activeIndex === 0 ? "text-muted/20 cursor-default" : "text-muted hover:text-cyan"}`}
            aria-label="Previous experience"
            disabled={activeIndex === 0}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <div className="flex gap-2">
            {experience.map((_, i) => (
              <button
                key={i}
                onClick={() => navigate(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === activeIndex ? "bg-accent shadow-[0_0_12px_rgba(98,242,162,0.8)]" : "bg-muted/40"
                }`}
                aria-label={`Go to experience ${i + 1}`}
              />
            ))}
          </div>

          <button
            onClick={next}
            className={`p-1 transition-colors ${activeIndex === experience.length - 1 ? "text-muted/20 cursor-default" : "text-muted hover:text-cyan"}`}
            aria-label="Next experience"
            disabled={activeIndex === experience.length - 1}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </motion.div>
    </section>
  );
}
