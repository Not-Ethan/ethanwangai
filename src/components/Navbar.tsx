"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiGithub, FiMenu, FiX } from "react-icons/fi";
import { siteConfig } from "@/lib/data";
import { useJourneyScroll } from "@/components/scroll/SmoothScroll";

const navLinks = [
  { label: "about", moment: "morning", target: "#about" },
  { label: "experience", moment: "golden hour", target: "#experience" },
  { label: "projects", moment: "dusk", target: "#projects" },
  { label: "contact", moment: "midnight", target: "#contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { scrollTo } = useJourneyScroll();

  const go = (target: string) => {
    setOpen(false);
    scrollTo(target);
  };

  return (
    <>
      <motion.header
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.9, delay: 1.2, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-0 inset-x-0 z-40"
      >
        {/* soft veil so links read against a bright sky */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-bg/60 to-transparent pointer-events-none" />

        <nav className="relative flex items-center justify-between px-6 md:px-10 py-5">
          <button
            onClick={() => go("#hero")}
            className="font-display italic font-semibold text-xl text-ink hover:text-amber transition-colors"
          >
            Ethan Wang
          </button>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.target}
                onClick={() => go(link.target)}
                className="nav-link font-mono text-[13px] tracking-wide text-ink/70 hover:text-ink transition-colors"
              >
                {link.label}
              </button>
            ))}
            <a
              href={siteConfig.github}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="text-ink/70 hover:text-amber transition-colors"
            >
              <FiGithub size={18} />
            </a>
          </div>

          <button
            className="md:hidden text-ink p-2 -mr-2"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <FiX size={22} /> : <FiMenu size={22} />}
          </button>
        </nav>
      </motion.header>

      {/* Mobile menu — full-screen night sky */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-30 md:hidden bg-bg/92 backdrop-blur-xl flex flex-col justify-center px-10"
          >
            {navLinks.map((link, i) => (
              <motion.button
                key={link.target}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ delay: 0.08 + i * 0.07, duration: 0.4 }}
                onClick={() => go(link.target)}
                className="group flex items-baseline gap-4 py-4 text-left border-b hairline"
              >
                <span className="font-display text-4xl text-ink group-hover:text-amber transition-colors">
                  {link.label}
                </span>
                <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-muted">
                  {link.moment}
                </span>
              </motion.button>
            ))}
            <motion.a
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.4 }}
              href={siteConfig.github}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 font-mono text-sm text-muted hover:text-amber transition-colors"
            >
              github ↗
            </motion.a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
