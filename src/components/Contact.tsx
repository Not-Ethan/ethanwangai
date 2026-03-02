"use client";

import { motion } from "framer-motion";
import { FiGithub, FiLinkedin, FiMail } from "react-icons/fi";
import { siteConfig } from "@/lib/data";

const links = [
  { icon: FiMail, href: `mailto:${siteConfig.email}`, label: "Email" },
  { icon: FiLinkedin, href: siteConfig.linkedin, label: "LinkedIn" },
  { icon: FiGithub, href: siteConfig.github, label: "GitHub" },
];

export default function Contact() {
  return (
    <section className="h-screen flex items-center justify-center py-16 px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl mx-auto w-full text-center rounded-2xl glass-panel panel-ring p-8 md:p-12"
      >
        <h2 className="text-sm font-mono section-title mb-6">04 / Contact</h2>

        <h3 className="text-4xl md:text-5xl font-heading font-bold text-light">
          Let&apos;s build something.
        </h3>

        <p className="mt-4 text-muted">
          Always interested in new opportunities, collaborations, and interesting problems.
        </p>

        <motion.a
          href={`mailto:${siteConfig.email}`}
          whileHover={{ scale: 1.05 }}
          className="inline-block mt-8 px-8 py-3 font-mono text-sm text-accent border border-cyan/40 rounded-lg bg-cyan/10 hover:bg-cyan/20 shadow-[0_0_26px_rgba(98,242,162,0.25)] transition-colors"
        >
          {siteConfig.email}<span className="animate-blink ml-0.5">▌</span>
        </motion.a>

        <div className="flex justify-center gap-6 mt-10">
          {links.map(({ icon: Icon, href, label }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-accent transition-all hover:scale-110 transform rounded-full border border-cyan/20 bg-bg/35 p-2 hover:border-accent/55 hover:bg-cyan/10"
              aria-label={label}
            >
              <Icon size={22} />
            </a>
          ))}
        </div>

        <p className="mt-16 text-xs font-mono text-muted/40">
          Designed &amp; built by Ethan Wang
        </p>
      </motion.div>
    </section>
  );
}
