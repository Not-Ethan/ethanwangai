"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { chapters } from "@/lib/data";

/** A vertical chapter rail that tracks which part of the story you're in. */
export default function ScrollProgress() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const sections = chapters
      .map((c) => document.getElementById(c.id))
      .filter((el): el is HTMLElement => !!el);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = chapters.findIndex((c) => c.id === entry.target.id);
            if (idx !== -1) setActive(idx);
          }
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <motion.nav
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 1.4, duration: 0.8 }}
      className="fixed right-6 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col gap-5"
      aria-hidden="true"
    >
      {chapters.map((c, i) => {
        const isActive = i === active;
        return (
          <a
            key={c.id}
            href={`#${c.id}`}
            className="group flex items-center justify-end gap-3"
          >
            <span
              className={`font-mono text-[10px] tracking-widest uppercase transition-all duration-500 ${
                isActive
                  ? "text-accent opacity-100 translate-x-0"
                  : "text-muted opacity-0 group-hover:opacity-70 translate-x-2 group-hover:translate-x-0"
              }`}
            >
              {c.name}
            </span>
            <span className="relative flex h-2.5 w-2.5 items-center justify-center">
              <span
                className={`rounded-full transition-all duration-500 ${
                  isActive
                    ? "h-2.5 w-2.5 bg-accent shadow-[0_0_12px_2px_rgba(227,168,87,0.6)]"
                    : "h-1.5 w-1.5 bg-muted/40 group-hover:bg-sage/60"
                }`}
              />
            </span>
          </a>
        );
      })}
    </motion.nav>
  );
}
