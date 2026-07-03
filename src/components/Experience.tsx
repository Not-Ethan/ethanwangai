"use client";

import { motion } from "framer-motion";
import { experience } from "@/lib/data";
import { fadeLeft, fadeUp, stagger, viewport } from "@/components/sections/reveal";

function renderBullet(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="text-amber font-medium">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    )
  );
}

export default function Experience() {
  return (
    <section id="experience" className="relative flex min-h-screen items-center px-6 md:px-12 py-20">
      <div className="mx-auto w-full max-w-4xl">
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={viewport} className="section-scrim mb-10">
          <motion.p variants={fadeUp} className="kicker mb-5">
            02 · Golden Hour — Experience
          </motion.p>
          <motion.h2 variants={fadeUp} className="font-display font-semibold text-ink text-4xl md:text-6xl leading-tight">
            Where I&apos;ve <em className="font-normal">worked</em>
          </motion.h2>
        </motion.div>

        <div className="relative border-l hairline pl-8 md:pl-12 space-y-10">
          {experience.map((exp) => (
            <motion.article
              key={exp.company}
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={viewport}
              className="relative"
            >
              {/* trail marker */}
              <motion.span
                variants={fadeLeft}
                className="absolute -left-8 md:-left-12 top-3 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-amber shadow-[0_0_14px_rgba(255,180,94,0.8)]"
              />

              <motion.div variants={fadeUp} className="veil-panel rounded-2xl p-6 md:p-8">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                  <h3 className="font-display font-semibold text-2xl text-ink">
                    {exp.link ? (
                      <a href={exp.link} target="_blank" rel="noopener noreferrer" className="hover:text-amber transition-colors">
                        {exp.company} <span className="text-amber text-base">↗</span>
                      </a>
                    ) : (
                      exp.company
                    )}
                  </h3>
                  <span className="font-mono text-xs text-muted whitespace-nowrap">{exp.dates}</span>
                </div>
                <p className="mt-1 font-mono text-[11px] tracking-[0.16em] uppercase text-amber/80">
                  {exp.role} · {exp.location}
                </p>

                <ul className="mt-5 space-y-3">
                  {exp.bullets.map((bullet, j) => (
                    <li key={j} className="flex gap-3 text-[15px] text-ink/85 leading-relaxed">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-fern" />
                      <span>{renderBullet(bullet)}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 flex flex-wrap gap-2">
                  {exp.tags.map((tag) => (
                    <span key={tag} className="rounded-full border hairline px-3 py-1 font-mono text-[11px] text-moss">
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
