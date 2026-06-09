"use client";

import { motion } from "framer-motion";
import { FiGithub, FiLinkedin, FiMail } from "react-icons/fi";
import SectionHeading from "./SectionHeading";
import { siteConfig } from "@/lib/data";
import { mulberry32 } from "@/lib/forest";

const links = [
  { icon: FiMail, href: `mailto:${siteConfig.email}`, label: "Email" },
  { icon: FiLinkedin, href: siteConfig.linkedin, label: "LinkedIn" },
  { icon: FiGithub, href: siteConfig.github, label: "GitHub" },
];

const emberRnd = mulberry32(55);
const EMBERS = Array.from({ length: 10 }, () => ({
  left: 38 + emberRnd() * 24,
  delay: emberRnd() * 2.8,
  duration: 2.2 + emberRnd() * 1.8,
  size: 2 + emberRnd() * 3,
}));

function Campfire() {
  return (
    <div className="relative mx-auto h-44 w-56" aria-hidden>
      {/* Warm halo */}
      <div className="absolute left-1/2 top-1/2 h-40 w-52 -translate-x-1/2 -translate-y-1/3 animate-halo rounded-full bg-ember/20 blur-3xl" />

      {/* Rising embers */}
      {EMBERS.map((e, i) => (
        <span
          key={i}
          className="absolute bottom-12 animate-rise rounded-full bg-firefly"
          style={{
            left: `${e.left}%`,
            width: e.size,
            height: e.size,
            animationDelay: `${e.delay}s`,
            animationDuration: `${e.duration}s`,
          }}
        />
      ))}

      {/* Flames */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
        <svg viewBox="-30 -64 60 70" className="h-24 w-24 origin-bottom animate-flicker" style={{ animationDuration: "1.15s" }}>
          <path d="M0 6 C -26 -12 -13 -34 0 -56 C 13 -34 26 -12 0 6 Z" fill="#fb923c" opacity="0.85" />
        </svg>
        <svg viewBox="-30 -64 60 70" className="absolute bottom-0 left-1/2 h-16 w-16 -translate-x-1/2 origin-bottom animate-flicker" style={{ animationDuration: "0.8s" }}>
          <path d="M0 6 C -19 -8 -9 -25 0 -44 C 9 -25 19 -8 0 6 Z" fill="#fbbf24" />
        </svg>
        <svg viewBox="-30 -64 60 70" className="absolute bottom-0 left-1/2 h-10 w-10 -translate-x-1/2 origin-bottom animate-flicker" style={{ animationDuration: "0.6s" }}>
          <path d="M0 5 C -11 -4 -5 -13 0 -26 C 5 -13 11 -4 0 5 Z" fill="#fde68a" />
        </svg>
      </div>

      {/* Logs */}
      <div className="absolute bottom-8 left-1/2 h-3.5 w-28 -translate-x-1/2 rotate-12 rounded-full bg-[#3b2a1a]" />
      <div className="absolute bottom-8 left-1/2 h-3.5 w-28 -translate-x-1/2 -rotate-12 rounded-full bg-[#2e2014]" />
      {/* Ground glow */}
      <div className="absolute bottom-5 left-1/2 h-3 w-32 -translate-x-1/2 rounded-[100%] bg-ember/15 blur-md" />
    </div>
  );
}

export default function Contact() {
  return (
    <section id="contact" className="relative scroll-mt-20 overflow-hidden px-6 pt-28 md:pt-36">
      {/* The warm glow of the forest floor */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[420px] bg-[radial-gradient(ellipse_at_50%_100%,rgba(251,146,60,0.13),transparent_70%)]"
      />

      <div className="relative mx-auto max-w-2xl text-center">
        <SectionHeading num="05" name="The Campfire" title="You made it to the forest floor." align="center" />

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15, duration: 0.6 }}
          className="mx-auto mt-5 max-w-md leading-relaxed text-fog"
        >
          Always interested in new opportunities, collaborations, and interesting
          problems. Pull up a log — the fire&apos;s warm.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ delay: 0.2, duration: 0.7 }}
          className="mt-10"
        >
          <Campfire />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.25, duration: 0.6 }}
          className="mt-8"
        >
          <a
            href={`mailto:${siteConfig.email}`}
            className="inline-block rounded-full bg-firefly px-8 py-3.5 font-semibold text-night shadow-[0_0_30px_rgba(251,191,36,0.3)] transition-all duration-300 hover:shadow-[0_0_45px_rgba(251,191,36,0.5)] hover:brightness-110"
          >
            Say hello
          </a>

          <div className="mt-8 flex items-center justify-center gap-7">
            {links.map(({ icon: Icon, href, label }) => (
              <a
                key={label}
                href={href}
                target={href.startsWith("mailto") ? undefined : "_blank"}
                rel="noopener noreferrer"
                aria-label={label}
                className="group flex flex-col items-center gap-1.5 text-fog transition-colors hover:text-firefly"
              >
                <Icon size={20} />
                <span className="font-mono text-[10px] uppercase tracking-widest opacity-0 transition-opacity group-hover:opacity-100">
                  {label}
                </span>
              </a>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="relative mx-auto mt-20 max-w-6xl border-t border-mist/10 py-8">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="font-mono text-xs text-fog/70">
            © {new Date().getFullYear()} Ethan Wang
          </p>
          <p className="font-display text-sm italic text-fog/50">
            the forest sleeps; the systems trade on.
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="font-mono text-xs text-fog/70 transition-colors hover:text-leaf"
          >
            ↑ climb back to the canopy
          </button>
        </div>
      </footer>
    </section>
  );
}
