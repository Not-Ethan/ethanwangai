"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiGithub, FiMenu, FiX } from "react-icons/fi";
import { siteConfig } from "@/lib/data";

const navLinks = [
  { label: "About", href: "#about" },
  { label: "Experience", href: "#experience" },
  { label: "Projects", href: "#projects" },
  { label: "Contact", href: "#contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || mobileOpen
          ? "bg-bg/80 backdrop-blur-md border-b border-white/5"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href="#hero" className="font-heading font-bold text-lg text-light hover:text-accent transition-colors">
          EW
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-mono text-sm text-muted hover:text-accent transition-colors"
            >
              {link.label}
            </a>
          ))}
          <a
            href={siteConfig.github}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted hover:text-accent transition-colors"
          >
            <FiGithub size={18} />
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-muted hover:text-accent transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <FiX size={22} /> : <FiMenu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden overflow-hidden bg-bg/95 backdrop-blur-md border-b border-white/5"
          >
            <div className="flex flex-col items-center gap-6 py-6">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="font-mono text-sm text-muted hover:text-accent transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <a
                href={siteConfig.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted hover:text-accent transition-colors"
              >
                <FiGithub size={18} />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
