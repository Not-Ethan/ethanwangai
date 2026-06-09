"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiGithub, FiMenu, FiX } from "react-icons/fi";
import { siteConfig, journey } from "@/lib/data";

const navItems = journey.slice(1); // skip "top"

function PineMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-moss" aria-hidden>
      <path
        fill="currentColor"
        d="M12 2 7.5 9h2.6L6 15.5h4.5V19h3v-3.5H18L13.9 9h2.6L12 2Z"
      />
    </svg>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled && !open
          ? "bg-night/70 backdrop-blur-md border-b border-moss/10"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a
          href="#top"
          className="flex items-center gap-2 group"
          aria-label="Back to top"
        >
          <PineMark />
          <span className="font-display text-lg font-semibold text-mist transition-colors group-hover:text-leaf">
            Ethan Wang
          </span>
        </a>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-7">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="group relative font-mono text-[13px] text-fog transition-colors hover:text-leaf"
            >
              {item.nav}
              <span className="absolute -bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 scale-0 rounded-full bg-firefly transition-transform duration-300 group-hover:scale-100" />
            </a>
          ))}
          <a
            href={siteConfig.github}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="text-fog transition-colors hover:text-leaf"
          >
            <FiGithub size={18} />
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden relative z-50 text-fog transition-colors hover:text-leaf"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>
      </div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="md:hidden fixed inset-0 z-40 flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-sky via-night to-night"
          >
            {navItems.map((item, i) => (
              <motion.a
                key={item.id}
                href={`#${item.id}`}
                onClick={() => setOpen(false)}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.06 * i, duration: 0.35 }}
                className="py-3 text-center"
              >
                <span className="block font-display text-3xl font-semibold text-mist transition-colors hover:text-leaf">
                  {item.nav}
                </span>
                <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.3em] text-moss/70">
                  {item.num} · {item.name}
                </span>
              </motion.a>
            ))}
            <motion.a
              href={siteConfig.github}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-6 text-fog hover:text-leaf"
              aria-label="GitHub"
            >
              <FiGithub size={22} />
            </motion.a>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
