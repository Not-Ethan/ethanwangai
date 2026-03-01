"use client";

import { motion } from "framer-motion";
import { useZoom } from "./ZoomContext";

const PAGE_LABELS = ["Home", "About", "Experience", "Projects", "Contact"];

export default function DotNav() {
  const { currentPage, goToPage } = useZoom();

  return (
    <nav
      className="fixed right-4 top-1/2 -translate-y-1/2 z-50 flex-col gap-4 hidden md:flex"
      aria-label="Page navigation"
    >
      {PAGE_LABELS.map((label, i) => (
        <button
          key={label}
          onClick={() => goToPage(i)}
          className="group relative flex items-center justify-end"
          aria-label={`Go to ${label}`}
          aria-current={i === currentPage ? "page" : undefined}
        >
          <span className="absolute right-7 px-2 py-1 text-xs font-mono text-light bg-bg-card/90 backdrop-blur-sm rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {label}
          </span>
          <motion.div
            animate={{
              scale: i === currentPage ? 1.4 : 1,
              backgroundColor: i === currentPage ? "#4ade80" : "#6b7f6b",
            }}
            transition={{ duration: 0.3 }}
            className="w-2.5 h-2.5 rounded-full"
          />
        </button>
      ))}
    </nav>
  );
}
