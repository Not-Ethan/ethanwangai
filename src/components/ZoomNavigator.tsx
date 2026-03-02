"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  useMotionValueEvent,
} from "framer-motion";
import ForestScene from "./ForestScene";
import DotNav from "./DotNav";
import Navbar from "./Navbar";
import { ZoomContext } from "./ZoomContext";

const TOTAL_PAGES = 5;
const SWIPE_THRESHOLD = 35;

interface ZoomNavigatorProps {
  children: React.ReactNode;
}

export default function ZoomNavigator({ children }: ZoomNavigatorProps) {
  const pages = React.Children.toArray(children);
  const scrollPos = useMotionValue(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [visiblePage, setVisiblePage] = useState(0);
  const snapAnim = useRef<ReturnType<typeof animate>>(undefined);
  const isTransitioning = useRef(false);
  const prevNearest = useRef(0);

  /* ── Derived MotionValues (GPU-driven, no re-renders) ──── */

  const contentOpacity = useTransform(scrollPos, (pos) => {
    const nearest = Math.round(pos);
    const dist = Math.abs(pos - nearest);
    return Math.max(0, 1 - dist * 4);
  });

  const contentY = useTransform(scrollPos, (pos) => {
    const nearest = Math.round(pos);
    return (pos - nearest) * -30;
  });

  /* ── State updates at discrete thresholds ──────────────── */

  useMotionValueEvent(scrollPos, "change", (pos) => {
    const nearest = Math.round(pos);
    if (nearest !== prevNearest.current) {
      prevNearest.current = nearest;
      setCurrentPage(nearest);
      setVisiblePage(nearest);
    }
  });

  /* ── Page transition driver (one gesture -> one page) ─── */

  const animateToPage = useCallback(
    (target: number) => {
      if (target < 0 || target >= TOTAL_PAGES) return;
      snapAnim.current?.stop();
      isTransitioning.current = true;
      snapAnim.current = animate(scrollPos, target, {
        duration: 0.62,
        ease: [0.22, 1, 0.36, 1],
        onComplete: () => {
          isTransitioning.current = false;
        },
      });
    },
    [scrollPos]
  );

  /* ── goToPage (nav buttons, keyboard) ──────────────────── */

  const goToPage = useCallback(
    (page: number) => {
      if (page < 0 || page >= TOTAL_PAGES || isTransitioning.current) return;
      animateToPage(page);
    },
    [animateToPage]
  );

  /* ── Wheel handler ─────────────────────────────────────── */

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (isTransitioning.current || Math.abs(e.deltaY) < 8) return;
      const current = Math.round(scrollPos.get());
      const dir = e.deltaY > 0 ? 1 : -1;
      animateToPage(Math.max(0, Math.min(TOTAL_PAGES - 1, current + dir)));
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [scrollPos, animateToPage]);

  /* ── Touch handler ─────────────────────────────────────── */

  useEffect(() => {
    let touchStartY = 0;
    let touchEndY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
      touchEndY = touchStartY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      touchEndY = e.touches[0].clientY;
    };

    const handleTouchEnd = () => {
      if (isTransitioning.current) return;
      const delta = touchStartY - touchEndY;
      if (Math.abs(delta) < SWIPE_THRESHOLD) return;
      const current = Math.round(scrollPos.get());
      const dir = delta > 0 ? 1 : -1;
      animateToPage(Math.max(0, Math.min(TOTAL_PAGES - 1, current + dir)));
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [scrollPos, animateToPage]);

  /* ── Keyboard handler ──────────────────────────────────── */

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const current = Math.round(scrollPos.get());
      switch (e.key) {
        case "ArrowDown":
        case "PageDown":
          e.preventDefault();
          goToPage(Math.min(TOTAL_PAGES - 1, current + 1));
          break;
        case " ": {
          e.preventDefault();
          const dir = e.shiftKey ? -1 : 1;
          goToPage(
            Math.max(0, Math.min(TOTAL_PAGES - 1, current + dir))
          );
          break;
        }
        case "ArrowUp":
        case "PageUp":
          e.preventDefault();
          goToPage(Math.max(0, current - 1));
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPage, scrollPos]);

  /* ── Render ────────────────────────────────────────────── */

  return (
    <ZoomContext.Provider value={{ currentPage, goToPage }}>
      <div className="h-screen overflow-hidden">
        <ForestScene scrollPos={scrollPos} />
        <Navbar />

        <motion.div
          key={visiblePage}
          style={{ opacity: contentOpacity, y: contentY }}
          className="fixed inset-0 z-10"
        >
          {pages[visiblePage]}
        </motion.div>

        <DotNav />
      </div>
    </ZoomContext.Provider>
  );
}
