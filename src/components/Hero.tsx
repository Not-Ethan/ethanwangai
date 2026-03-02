"use client";

import { motion } from "framer-motion";
import { siteConfig } from "@/lib/data";

export default function Hero() {
  return (
    <section className="relative h-screen flex items-start justify-center pt-[22vh]">
      <div className="aurora-overlay z-[1]" />
      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/40 via-transparent to-black/30 pointer-events-none" />

      <div className="relative z-10 text-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="inline-flex items-center gap-2 rounded-full border border-cyan/35 bg-bg/40 px-3 py-1 text-[11px] font-mono tracking-[0.16em] text-cyan/90 mb-5 floating-soft"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-accent twinkle" />
          CS + MATH @ CWRU
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-6xl md:text-8xl font-heading font-bold hero-gradient-text"
          style={{ textShadow: "0 2px 20px rgba(0,0,0,0.6), 0 0 40px rgba(74, 222, 128, 0.3)" }}
        >
          {siteConfig.name}
        </motion.h1>

      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-8 z-10 flex flex-col items-center gap-2"
      >
        <span className="text-xs font-mono text-cyan/80 tracking-[0.15em]">zoom</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-4 h-7 border-2 border-cyan/40 rounded-full flex justify-center pt-1 bg-bg/35 backdrop-blur"
        >
          <div className="w-1 h-1.5 bg-accent rounded-full shadow-[0_0_12px_rgba(98,242,162,0.9)]" />
        </motion.div>
      </motion.div>
    </section>
  );
}
