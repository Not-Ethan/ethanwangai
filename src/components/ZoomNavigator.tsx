"use client";

import React, { useState, useRef, useCallback } from "react";
import { useScroll, useTransform } from "framer-motion";
import ForestScene from "./ForestScene";
import DotNav from "./DotNav";
import Navbar from "./Navbar";
import { ZoomContext } from "./ZoomContext";

interface ZoomNavigatorProps {
  children: React.ReactNode;
}

export default function ZoomNavigator({ children }: ZoomNavigatorProps) {
  const pages = React.Children.toArray(children);
  const totalPages = pages.length;
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const { scrollYProgress } = useScroll({ container: containerRef });
  const scrollPos = useTransform(scrollYProgress, [0, 1], [0, Math.max(0, totalPages - 1)]);

  const goToPage = useCallback(
    (page: number) => {
      if (!containerRef.current) return;
      const clamped = Math.max(0, Math.min(totalPages - 1, page));
      containerRef.current.scrollTo({
        top: clamped * containerRef.current.clientHeight,
        behavior: "smooth",
      });
    },
    [totalPages]
  );

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const index = Math.round(containerRef.current.scrollTop / containerRef.current.clientHeight);
    setCurrentPage(Math.max(0, Math.min(totalPages - 1, index)));
  }, [totalPages]);

  return (
    <ZoomContext.Provider value={{ currentPage, goToPage }}>
      <div className="h-screen overflow-hidden">
        <ForestScene scrollPos={scrollPos} />
        <Navbar />

        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="relative z-10 h-screen overflow-y-auto snap-y snap-mandatory scroll-smooth overscroll-y-contain"
        >
          {pages.map((page, i) => (
            <div key={i} className="snap-start snap-always h-screen">
              {page}
            </div>
          ))}
        </div>

        <DotNav />
      </div>
    </ZoomContext.Provider>
  );
}
