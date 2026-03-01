"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, useMotionValue, animate, AnimatePresence } from "framer-motion";
import ForestScene from "./ForestScene";
import DotNav from "./DotNav";
import { ZoomContext } from "./ZoomContext";

const TOTAL_PAGES = 5;

interface ZoomNavigatorProps {
  children: React.ReactNode;
}

export default function ZoomNavigator({ children }: ZoomNavigatorProps) {
  const pages = React.Children.toArray(children);
  const [currentPage, setCurrentPage] = useState(0);
  const [visiblePage, setVisiblePage] = useState(0);
  const isAnimating = useRef(false);
  const zoomPhase = useMotionValue(0);
  const contentRef = useRef<HTMLDivElement>(null);

  const goToPage = useCallback(
    async (targetPage: number) => {
      if (isAnimating.current) return;
      if (targetPage < 0 || targetPage >= TOTAL_PAGES) return;
      if (targetPage === currentPage) return;

      isAnimating.current = true;

      // 1. Fade out current content
      setVisiblePage(-1);
      await new Promise((r) => setTimeout(r, 200));

      // 2. Start forest transition (CSS transitions on color) + zoom phase
      setCurrentPage(targetPage);
      await animate(zoomPhase, [0, 1, 0], {
        duration: 0.55,
        ease: "easeInOut",
      });

      // 3. Fade in new content
      setVisiblePage(targetPage);

      // 4. Unlock after enter animation
      setTimeout(() => {
        isAnimating.current = false;
      }, 200);
    },
    [currentPage, zoomPhase]
  );

  // ── Wheel handler ────────────────────────────────────────
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (isAnimating.current) return;

      // Check if section content is internally scrollable
      const el = contentRef.current;
      if (el) {
        const { scrollTop, scrollHeight, clientHeight } = el;
        const atTop = scrollTop <= 1;
        const atBottom = scrollTop + clientHeight >= scrollHeight - 1;
        if (e.deltaY > 0 && !atBottom) return;
        if (e.deltaY < 0 && !atTop) return;
      }

      if (e.deltaY > 0) goToPage(currentPage + 1);
      else if (e.deltaY < 0) goToPage(currentPage - 1);
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [currentPage, goToPage]);

  // ── Keyboard handler ─────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAnimating.current) return;
      switch (e.key) {
        case "ArrowDown":
        case "PageDown":
          e.preventDefault();
          goToPage(currentPage + 1);
          break;
        case " ":
          e.preventDefault();
          goToPage(e.shiftKey ? currentPage - 1 : currentPage + 1);
          break;
        case "ArrowUp":
        case "PageUp":
          e.preventDefault();
          goToPage(currentPage - 1);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, goToPage]);

  // ── Touch handler ────────────────────────────────────────
  useEffect(() => {
    let touchStartYLocal = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartYLocal = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isAnimating.current) return;
      const deltaY = touchStartYLocal - e.changedTouches[0].clientY;
      if (Math.abs(deltaY) < 50) return;

      // Check scroll boundaries
      const el = contentRef.current;
      if (el) {
        const { scrollTop, scrollHeight, clientHeight } = el;
        const atTop = scrollTop <= 1;
        const atBottom = scrollTop + clientHeight >= scrollHeight - 1;
        if (deltaY > 0 && !atBottom) return;
        if (deltaY < 0 && !atTop) return;
      }

      if (deltaY > 0) goToPage(currentPage + 1);
      else goToPage(currentPage - 1);
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [currentPage, goToPage]);

  return (
    <ZoomContext.Provider value={{ currentPage, goToPage }}>
      <div className="h-screen overflow-hidden">
        <ForestScene page={currentPage} zoomPhase={zoomPhase} />

        {/* Section content overlay */}
        <AnimatePresence mode="wait">
          {visiblePage >= 0 && (
            <motion.div
              key={visiblePage}
              ref={contentRef}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-0 z-10 overflow-y-auto"
            >
              {pages[visiblePage]}
            </motion.div>
          )}
        </AnimatePresence>

        <DotNav />
      </div>
    </ZoomContext.Provider>
  );
}
