"use client";

import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useReducedMotion,
} from "framer-motion";
import { projects } from "@/lib/data";
import { fadeLeft, fadeRight, fadeUp, stagger, viewport } from "@/components/sections/reveal";

function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const sx = useSpring(rx, { stiffness: 180, damping: 20 });
  const sy = useSpring(ry, { stiffness: 180, damping: 20 });

  const onMove = (e: React.MouseEvent) => {
    if (reduced || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    ry.set(px * 7);
    rx.set(-py * 7);
  };

  const onLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX: sx, rotateY: sy, transformPerspective: 900 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function Projects() {
  return (
    <section id="projects" className="relative flex min-h-screen items-center px-6 md:px-12 py-28">
      <div className="mx-auto w-full max-w-5xl">
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={viewport} className="section-scrim mb-14">
          <motion.p variants={fadeUp} className="kicker mb-5">
            03 · Dusk — Projects
          </motion.p>
          <motion.h2 variants={fadeUp} className="font-display font-semibold text-ink text-4xl md:text-6xl leading-tight">
            Things that <em className="font-normal">glow</em> after dark
          </motion.h2>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-2 items-stretch">
          {projects.map((project, i) => (
            <motion.div
              key={project.title}
              variants={i % 2 === 0 ? fadeLeft : fadeRight}
              initial="hidden"
              whileInView="show"
              viewport={viewport}
            >
              <TiltCard className="group h-full veil-panel rounded-2xl p-7 md:p-8 transition-colors duration-300 hover:border-amber/35">
                <div className="flex items-start justify-between gap-4">
                  <p className="font-mono text-[11px] text-muted">{project.dates}</p>
                  {project.award && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber/35 bg-amber/10 px-3 py-1 font-mono text-[10px] tracking-[0.14em] uppercase text-amber">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path d="M12 2L9 8.5H3L7.5 13L5.5 20L12 16L18.5 20L16.5 13L21 8.5H15L12 2Z" />
                      </svg>
                      award
                    </span>
                  )}
                </div>

                <h3 className="mt-3 font-display font-semibold text-2xl md:text-[1.7rem] leading-snug text-ink group-hover:text-amber transition-colors duration-300">
                  {project.title}
                </h3>

                <p className="mt-4 text-[15px] text-ink/80 leading-relaxed">{project.description}</p>

                <p className="mt-5 font-mono text-xs text-amber leading-relaxed">{project.metric}</p>

                <ul className="mt-5 space-y-2.5">
                  {project.bullets.map((bullet, j) => (
                    <li key={j} className="flex gap-3 text-sm text-ink/75 leading-relaxed">
                      <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-fern" />
                      {bullet}
                    </li>
                  ))}
                </ul>

                <div className="mt-7 flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
                    <span key={tag} className="rounded-full border hairline px-3 py-1 font-mono text-[11px] text-moss">
                      {tag}
                    </span>
                  ))}
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
