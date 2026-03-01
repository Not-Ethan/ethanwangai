"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  useMotionValueEvent,
  type MotionValue,
} from "framer-motion";
import ForestScene from "./ForestScene";
import DotNav from "./DotNav";
import Navbar from "./Navbar";
import { ZoomContext } from "./ZoomContext";

const TOTAL_PAGES = 5;
const SCROLL_SENSITIVITY = 0.002;
const SNAP_DELAY = 150;

interface ZoomNavigatorProps {
  children: React.ReactNode;
}

export default function ZoomNavigator({ children }: ZoomNavigatorProps) {
  const pages = React.Children.toArray(children);
  const scrollPos = useMotionValue(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [visiblePage, setVisiblePage] = useState(0);
  const snapTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const snapAnim = useRef<ReturnType<typeof animate>>(undefined);
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

  /* ── Snapping ──────────────────────────────────────────── */

  const snapToNearest = useCallback(() => {
    const pos = scrollPos.get();
    const target = Math.round(pos);
    snapAnim.current?.stop();
    snapAnim.current = animate(scrollPos, target, {
      type: "spring",
      stiffness: 200,
      damping: 25,
    });
  }, [scrollPos]);

  const resetSnapTimer = useCallback(() => {
    clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(snapToNearest, SNAP_DELAY);
  }, [snapToNearest]);

  useEffect(() => {
    return () => clearTimeout(snapTimer.current);
  }, []);

  /* ── goToPage (nav buttons, keyboard) ──────────────────── */

  const goToPage = useCallback(
    (page: number) => {
      if (page < 0 || page >= TOTAL_PAGES) return;
      clearTimeout(snapTimer.current);
      snapAnim.current?.stop();
      snapAnim.current = animate(scrollPos, page, {
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1],
      });
    },
    [scrollPos]
  );

  /* ── Wheel handler ─────────────────────────────────────── */

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      snapAnim.current?.stop();

      const pos = scrollPos.get();
      const newPos = Math.max(
        0,
        Math.min(TOTAL_PAGES - 1, pos + e.deltaY * SCROLL_SENSITIVITY)
      );
      scrollPos.set(newPos);
      resetSnapTimer();
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [scrollPos, resetSnapTimer]);

  /* ── Touch handler ─────────────────────────────────────── */

  useEffect(() => {
    let lastTouchY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      lastTouchY = e.touches[0].clientY;
      snapAnim.current?.stop();
      clearTimeout(snapTimer.current);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const currentY = e.touches[0].clientY;
      const delta = lastTouchY - currentY;
      lastTouchY = currentY;

      const pos = scrollPos.get();
      const newPos = Math.max(
        0,
        Math.min(TOTAL_PAGES - 1, pos + delta * 0.004)
      );
      scrollPos.set(newPos);
    };

    const handleTouchEnd = () => {
      snapToNearest();
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [scrollPos, snapToNearest]);

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
