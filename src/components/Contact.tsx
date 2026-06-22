"use client";

import { motion } from "framer-motion";
import { FiGithub, FiLinkedin, FiMail } from "react-icons/fi";
import SectionHeading from "./SectionHeading";
import { siteConfig } from "@/lib/data";

const links = [
  { icon: FiMail, href: `mailto:${siteConfig.email}`, label: "Email" },
  { icon: FiLinkedin, href: siteConfig.linkedin, label: "LinkedIn" },
  { icon: FiGithub, href: siteConfig.github, label: "GitHub" },
];

export default function Contact() {
  return (
    <section
      id="contact"
      className="relative py-32 md:py-44 px-6 md:px-12 min-h-screen flex flex-col justify-center"
    >
      <div className="max-w-3xl mx-auto w-full text-center">
        <div className="text-left mb-12 md:mb-16 inline-block">
          <SectionHeading chapterId="contact" kicker="Contact" />
        </div>

        <motion.h3
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-4xl md:text-6xl font-display font-light text-light leading-tight"
        >
          Let&apos;s build something
          <span className="text-gradient italic"> that grows.</span>
        </motion.h3>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="mt-5 text-muted max-w-xl mx-auto"
        >
          Always interested in new opportunities, collaborations, and
          interesting problems worth chasing into the dark.
        </motion.p>

        <motion.a
          href={`mailto:${siteConfig.email}`}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          whileHover={{ scale: 1.03 }}
          className="inline-block mt-9 px-8 py-3.5 rounded-full glass glass-hover font-mono text-sm text-accent"
        >
          {siteConfig.email}
          <span className="animate-blink ml-0.5 text-sage">▌</span>
        </motion.a>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="flex justify-center gap-7 mt-10"
        >
          {links.map(({ icon: Icon, href, label }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-accent hover:-translate-y-1 transition-all"
              aria-label={label}
            >
              <Icon size={22} />
            </a>
          ))}
        </motion.div>
      </div>

      <div className="mt-28 text-center">
        <p className="text-xs font-mono text-muted/40">
          Designed &amp; built by Ethan Wang — wander back to{" "}
          <a href="#hero" className="text-sage/60 hover:text-accent transition-colors">
            first light
          </a>
          .
        </p>
      </div>
    </section>
  );
}
