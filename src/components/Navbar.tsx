"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiGithub, FiMenu, FiX } from "react-icons/fi";
import { siteConfig } from "@/lib/data";
import { useZoom } from "./ZoomContext";

const navLinks = [
  { label: "About", page: 1 },
  { label: "Experience", page: 2 },
  { label: "Projects", page: 3 },
  { label: "Contact", page: 4 },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { currentPage, goToPage } = useZoom();
  const showBg = currentPage > 0 || mobileOpen;

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        showBg
          ? "bg-gradient-to-b from-bg/95 to-bg/70 backdrop-blur-xl border-b border-cyan/15 shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => goToPage(0)}
          className="font-heading font-bold text-lg text-light hover:text-accent transition-colors px-2.5 py-1 rounded-full border border-transparent hover:border-cyan/35 hover:bg-cyan/10"
        >
          EW
        </button>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <button
              key={link.page}
              onClick={() => goToPage(link.page)}
              data-active={currentPage === link.page}
              className={`font-mono text-sm transition-colors ${
                currentPage === link.page
                  ? "text-accent"
                  : "text-muted hover:text-accent"
              } nav-link`}
            >
              {link.label}
            </button>
          ))}
          <a
            href={siteConfig.github}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted hover:text-accent transition-colors rounded-full border border-transparent hover:border-cyan/35 p-2 hover:bg-cyan/10"
          >
            <FiGithub size={18} />
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-muted hover:text-accent transition-colors rounded-full border border-transparent hover:border-cyan/35 p-2 hover:bg-cyan/10"
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
            className="md:hidden overflow-hidden bg-bg/95 backdrop-blur-xl border-b border-cyan/15"
          >
            <div className="flex flex-col items-center gap-6 py-6">
              {navLinks.map((link) => (
                <button
                  key={link.page}
                  onClick={() => {
                    goToPage(link.page);
                    setMobileOpen(false);
                  }}
                  className={`font-mono text-sm transition-colors nav-link ${
                    currentPage === link.page
                      ? "text-accent"
                      : "text-muted hover:text-accent"
                  }`}
                  data-active={currentPage === link.page}
                >
                  {link.label}
                </button>
              ))}
              <a
                href={siteConfig.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted hover:text-accent transition-colors rounded-full border border-transparent hover:border-cyan/35 p-2 hover:bg-cyan/10"
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
