"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import SmoothScroll from "@/components/scroll/SmoothScroll";
import Navbar from "@/components/Navbar";
import TrailNav from "@/components/TrailNav";
import JourneyClock from "@/components/JourneyClock";

const ForestCanvas = dynamic(() => import("@/components/three/ForestCanvas"), {
  ssr: false,
});

export default function Journey({ children }: { children: React.ReactNode }) {
  return (
    <SmoothScroll>
      <ForestCanvas />
      <Navbar />
      <TrailNav />
      <JourneyClock />
      <main className="relative z-10">{children}</main>

      {/* Curtain: hides shader warm-up on first paint. */}
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 1.1, delay: 0.35, ease: "easeOut" }}
        className="pointer-events-none fixed inset-0 z-50 bg-bg"
      />
    </SmoothScroll>
  );
}
