"use client";

import { motion } from "framer-motion";
import { FiArrowDown } from "react-icons/fi";
import { siteConfig } from "@/lib/data";

const ease = [0.22, 1, 0.36, 1] as const;

export default function Hero() {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col justify-center px-6 md:px-12"
    >
      <div className="absolute inset-0 scrim pointer-events-none" />

      <div className="relative max-w-6xl mx-auto w-full">
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease }}
          className="font-mono text-xs md:text-sm tracking-[0.35em] uppercase text-accent"
        >
          Chapter 00 — First Light
        </motion.p>

        <h1 className="mt-6 font-display font-light leading-[0.95] tracking-tight text-light text-readable text-[18vw] sm:text-[14vw] md:text-[10rem]">
          <motion.span
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4, ease }}
            className="block"
          >
            Ethan
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.55, ease }}
            className="block text-gradient italic"
            style={{ fontVariationSettings: '"opsz" 144, "SOFT" 60' }}
          >
            Wang
          </motion.span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.8, ease }}
          className="mt-8 max-w-xl text-lg md:text-2xl text-light/90 font-body leading-relaxed text-readable"
        >
          {siteConfig.tagline}
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 1, ease }}
          className="mt-4 max-w-xl text-sm md:text-base text-muted leading-relaxed"
        >
          Software engineer, quantitative trader, and startup founder — walk the
          trail and see what grows.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1.15, ease }}
          className="mt-10 flex flex-wrap items-center gap-4"
        >
          <a
            href="#projects"
            className="px-7 py-3 rounded-full bg-accent text-bg font-mono text-sm font-medium hover:bg-accent-soft transition-colors shadow-[0_0_30px_-6px_rgba(227,168,87,0.5)]"
          >
            Explore the work
          </a>
          <a
            href="#contact"
            className="px-7 py-3 rounded-full glass glass-hover font-mono text-sm text-light"
          >
            Get in touch
          </a>
        </motion.div>
      </div>

      <motion.a
        href="#about"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted hover:text-accent transition-colors"
      >
        <span className="font-mono text-[10px] tracking-[0.3em] uppercase">
          Scroll
        </span>
        <motion.span
          animate={{ y: [0, 7, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
        >
          <FiArrowDown size={16} />
        </motion.span>
      </motion.a>
    </section>
  );
}
