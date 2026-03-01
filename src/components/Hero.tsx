"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { siteConfig } from "@/lib/data";

const ParticleNetwork = dynamic(() => import("./ParticleNetwork"), {
  ssr: false,
});

export default function Hero() {
  return (
    <section id="hero" className="relative h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <ParticleNetwork />
      </div>

      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-bg/30 via-transparent to-bg" />

      <div className="relative z-10 text-center px-6">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-6xl md:text-8xl font-heading font-bold text-light"
          style={{ textShadow: "0 0 40px rgba(59, 130, 246, 0.3)" }}
        >
          {siteConfig.name}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-6 text-lg md:text-xl text-muted font-mono"
        >
          {siteConfig.tagline}
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-8 z-10 flex flex-col items-center gap-2"
      >
        <span className="text-xs font-mono text-muted">scroll</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-4 h-7 border-2 border-muted/40 rounded-full flex justify-center pt-1"
        >
          <div className="w-1 h-1.5 bg-accent rounded-full" />
        </motion.div>
      </motion.div>
    </section>
  );
}
