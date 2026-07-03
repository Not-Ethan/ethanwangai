"use client";

import { motion } from "framer-motion";
import { FiGithub, FiLinkedin, FiMail } from "react-icons/fi";
import { contact, siteConfig } from "@/lib/data";
import { fadeUp, stagger, viewport } from "@/components/sections/reveal";

const links = [
  { icon: FiMail, href: `mailto:${siteConfig.email}`, label: "Email" },
  { icon: FiLinkedin, href: siteConfig.linkedin, label: "LinkedIn" },
  { icon: FiGithub, href: siteConfig.github, label: "GitHub" },
];

export default function Contact() {
  return (
    <section id="contact" className="relative flex min-h-screen flex-col items-center justify-center px-6 md:px-12 py-28">
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={viewport}
        className="section-scrim mx-auto max-w-2xl text-center"
      >
        <motion.p variants={fadeUp} className="kicker mb-5">
          04 · Midnight — Contact
        </motion.p>

        <motion.h2 variants={fadeUp} className="font-display font-semibold text-ink text-5xl md:text-7xl leading-tight">
          The trail <em className="font-normal">ends</em> here.
        </motion.h2>

        <motion.p variants={fadeUp} className="mt-7 text-base md:text-lg text-ink/80 leading-relaxed">
          {contact.body}
        </motion.p>

        <motion.div variants={fadeUp} className="mt-10">
          <motion.a
            href={`mailto:${siteConfig.email}`}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.98 }}
            className="inline-block rounded-full bg-amber px-8 py-4 font-mono text-sm font-medium text-[#1c1206] shadow-[0_0_38px_rgba(255,180,94,0.35)] hover:bg-ember hover:shadow-[0_0_46px_rgba(232,132,61,0.45)] transition-[background-color,box-shadow] duration-300"
          >
            {siteConfig.email}
            <span className="animate-blink ml-1">▍</span>
          </motion.a>
        </motion.div>

        <motion.div variants={fadeUp} className="mt-10 flex justify-center gap-4">
          {links.map(({ icon: Icon, href, label }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="rounded-full border hairline p-3 text-ink/70 hover:text-amber hover:border-amber/40 hover:-translate-y-0.5 transition-all duration-300"
            >
              <Icon size={19} />
            </a>
          ))}
        </motion.div>

        <motion.p variants={fadeUp} className="mt-20 font-mono text-[11px] text-ink/35">
          © 2026 Ethan Wang · designed &amp; built by hand · three.js + next.js
        </motion.p>
      </motion.div>
    </section>
  );
}
