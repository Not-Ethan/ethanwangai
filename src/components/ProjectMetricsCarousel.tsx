"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AnimatedCounter from "./AnimatedCounter";

interface Metric {
  value: string;
  label: string;
}

interface Project {
  name: string;
  link?: string;
  accent: string;
  metrics: Metric[];
}

interface ProjectMetricsCarouselProps {
  projects: Project[];
  interval?: number;
}

const accentClasses: Record<string, { text: string; bg: string; dot: string }> = {
  accent: {
    text: "text-accent",
    bg: "bg-accent",
    dot: "bg-accent",
  },
  gold: {
    text: "text-gold",
    bg: "bg-gold",
    dot: "bg-gold",
  },
};

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

export default function ProjectMetricsCarousel({
  projects,
  interval = 5000,
}: ProjectMetricsCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [progress, setProgress] = useState(0);
  const pauseUntilRef = useRef(0);
  const lastTickRef = useRef(Date.now());

  const navigate = useCallback(
    (index: number) => {
      setDirection(index > activeIndex ? 1 : -1);
      setActiveIndex(index);
      setProgress(0);
      pauseUntilRef.current = Date.now() + interval;
      lastTickRef.current = Date.now();
    },
    [activeIndex, interval]
  );

  const next = useCallback(() => {
    const nextIndex = (activeIndex + 1) % projects.length;
    setDirection(1);
    setActiveIndex(nextIndex);
    setProgress(0);
    lastTickRef.current = Date.now();
  }, [activeIndex, projects.length]);

  const prev = useCallback(() => {
    const prevIndex = (activeIndex - 1 + projects.length) % projects.length;
    setDirection(-1);
    setActiveIndex(prevIndex);
    setProgress(0);
    pauseUntilRef.current = Date.now() + interval;
    lastTickRef.current = Date.now();
  }, [activeIndex, projects.length, interval]);

  useEffect(() => {
    let raf: number;

    const tick = () => {
      const now = Date.now();
      const isPaused = now < pauseUntilRef.current;

      if (!isPaused) {
        const elapsed = now - lastTickRef.current;
        const newProgress = Math.min(elapsed / interval, 1);
        setProgress(newProgress);

        if (newProgress >= 1) {
          next();
          return;
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [next, interval]);

  const project = projects[activeIndex];
  const colors = accentClasses[project.accent] ?? accentClasses.accent;

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6 }}
      className="flex flex-col items-center gap-6"
    >
      {/* Project name */}
      <h3 className={`font-mono text-sm tracking-wider uppercase ${colors.text}`}>
        {project.link ? (
          <a href={project.link} target="_blank" rel="noopener noreferrer" className="hover:underline">
            {project.name} ↗
          </a>
        ) : project.name}
      </h3>

      {/* Metrics slide area */}
      <div className="relative w-full min-h-[200px] flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={activeIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="flex flex-col items-center gap-8 w-full"
          >
            {project.metrics.map((metric, i) => (
              <AnimatedCounter
                key={`${activeIndex}-${i}`}
                value={metric.value}
                label={metric.label}
                colorClass={colors.text}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-4">
        <button
          onClick={prev}
          className="text-muted hover:text-light transition-colors p-1"
          aria-label="Previous project"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div className="flex gap-2">
          {projects.map((p, i) => (
            <button
              key={i}
              onClick={() => navigate(i)}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === activeIndex ? colors.dot : "bg-muted/40"
              }`}
              aria-label={`Go to ${p.name}`}
            />
          ))}
        </div>

        <button
          onClick={() => navigate((activeIndex + 1) % projects.length)}
          className="text-muted hover:text-light transition-colors p-1"
          aria-label="Next project"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Timer bar */}
      <div className="w-24 h-0.5 bg-muted/20 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${colors.bg} rounded-full`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </motion.div>
  );
}
