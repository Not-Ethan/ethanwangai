"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { projects } from "@/lib/data";

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

export default function Projects() {
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
    if (activeIndex < projects.length - 1) {
      setDirection(1);
      setActiveIndex(activeIndex + 1);
    }
  }, [activeIndex]);

  const project = projects[activeIndex];

  return (
    <section className="h-screen flex items-center justify-center py-16 px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto w-full rounded-2xl bg-bg-card/80 backdrop-blur-md border border-white/5 p-6 md:p-8"
      >
        <h2 className="text-sm font-mono text-accent mb-6">03 / Projects</h2>

        {/* Slide area */}
        <div className="relative min-h-[300px] overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={activeIndex}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="group"
            >
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <p className="text-xs font-mono text-muted">{project.dates}</p>
                  <h3 className="text-2xl font-heading font-bold text-light mt-1">
                    {project.title}
                  </h3>
                </div>
                {project.featured && (
                  <div className="px-2 py-0.5 text-xs font-mono text-gold bg-gold/10 rounded border border-gold/30 shrink-0">
                    Featured
                  </div>
                )}
              </div>

              <p className="text-sm text-muted mt-3 leading-relaxed">{project.description}</p>

              <div className={`mt-4 inline-flex items-center gap-2 px-3 py-1 rounded ${project.award ? "bg-gold/10 border border-gold/30" : "bg-accent/10 border border-accent/20"}`}>
                {project.award && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-gold shrink-0">
                    <path d="M12 2L9 8.5H3L7.5 13L5.5 20L12 16L18.5 20L16.5 13L21 8.5H15L12 2Z" fill="currentColor"/>
                  </svg>
                )}
                <span className={`text-sm font-mono ${project.award ? "text-gold" : "text-accent"}`}>{project.metric}</span>
              </div>

              <ul className="mt-5 space-y-2.5">
                {project.bullets.map((bullet, j) => (
                  <li key={j} className="text-sm text-muted/80 flex gap-2">
                    <span className="text-accent/60 mt-0.5 shrink-0">▹</span>
                    {bullet}
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap gap-2 mt-5">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 text-xs font-mono text-accent/80 bg-accent/10 rounded border border-accent/20"
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
            className={`p-1 transition-colors ${activeIndex === 0 ? "text-muted/20 cursor-default" : "text-muted hover:text-light"}`}
            aria-label="Previous project"
            disabled={activeIndex === 0}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <div className="flex gap-2">
            {projects.map((_, i) => (
              <button
                key={i}
                onClick={() => navigate(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === activeIndex ? "bg-accent" : "bg-muted/40"
                }`}
                aria-label={`Go to project ${i + 1}`}
              />
            ))}
          </div>

          <button
            onClick={next}
            className={`p-1 transition-colors ${activeIndex === projects.length - 1 ? "text-muted/20 cursor-default" : "text-muted hover:text-light"}`}
            aria-label="Next project"
            disabled={activeIndex === projects.length - 1}
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
