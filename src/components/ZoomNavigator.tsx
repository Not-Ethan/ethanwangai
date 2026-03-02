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
const WHEEL_RUBBER_FACTOR = 0.0006;
const TOUCH_RUBBER_FACTOR = 0.0024;
const MAX_PULL_OFFSET = 0.36;
const PAGE_ADVANCE_THRESHOLD = 0.2;
const SWIPE_THRESHOLD = 20;

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
  const basePage = useRef(0);
  const pullOffset = useRef(0);
  const prevNearest = useRef(0);

  /* ── Derived MotionValues (GPU-driven, no re-renders) ──── */

  const contentOpacity = useTransform(scrollPos, (pos) => {
    const nearest = Math.round(pos);
    const dist = Math.abs(pos - nearest);
    return Math.max(0.68, 1 - dist * 1.3);
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
      pullOffset.current = 0;
      basePage.current = target;
      snapAnim.current = animate(scrollPos, target, {
        type: "spring",
        stiffness: 270,
        damping: 29,
        mass: 0.65,
        onComplete: () => {
          isTransitioning.current = false;
          setCurrentPage(target);
          setVisiblePage(target);
        },
      });
    },
    [scrollPos]
  );

  const applyPull = useCallback(
    (rawOffset: number) => {
      const atStart = basePage.current === 0;
      const atEnd = basePage.current === TOTAL_PAGES - 1;
      let limited = Math.max(-MAX_PULL_OFFSET, Math.min(MAX_PULL_OFFSET, rawOffset));
      if ((atStart && limited < 0) || (atEnd && limited > 0)) {
        limited *= 0.45;
      }
      pullOffset.current = limited;
      scrollPos.set(basePage.current + limited);
    },
    [scrollPos]
  );

  const settlePull = useCallback(() => {
    if (isTransitioning.current) return;
    const offset = pullOffset.current;
    let target = basePage.current;
    if (Math.abs(offset) >= PAGE_ADVANCE_THRESHOLD) {
      const dir = offset > 0 ? 1 : -1;
      target = Math.max(0, Math.min(TOTAL_PAGES - 1, basePage.current + dir));
    }
    animateToPage(target);
  }, [animateToPage]);

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
      applyPull(pullOffset.current + e.deltaY * WHEEL_RUBBER_FACTOR);
      settlePull();
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [applyPull, settlePull]);

  /* ── Touch handler ─────────────────────────────────────── */

  useEffect(() => {
    let touchStartY = 0;
    let touchLastY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (isTransitioning.current) return;
      snapAnim.current?.stop();
      touchStartY = e.touches[0].clientY;
      touchLastY = touchStartY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isTransitioning.current) return;
      e.preventDefault();
      const currentY = e.touches[0].clientY;
      const delta = touchLastY - currentY;
      touchLastY = currentY;
      applyPull(pullOffset.current + delta * TOUCH_RUBBER_FACTOR);
    };

    const handleTouchEnd = () => {
      if (isTransitioning.current) return;
      const delta = touchStartY - touchLastY;
      if (Math.abs(delta) < SWIPE_THRESHOLD) {
        animateToPage(basePage.current);
        return;
      }
      settlePull();
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [applyPull, settlePull, animateToPage]);

  /* ── Keyboard handler ──────────────────────────────────── */

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const current = basePage.current;
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
  }, [goToPage]);

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
