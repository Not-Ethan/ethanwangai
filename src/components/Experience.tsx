"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import SectionHeading from "./SectionHeading";
import { experience, education } from "@/lib/data";

/** Renders **bold** spans from the data strings. */
function Emphasis({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-medium text-mist/90">
            {part}
          </strong>
        ) : (
          part
        )
      )}
    </>
  );
}

function Waypoint({ side, accent = false }: { side: "left" | "right"; accent?: boolean }) {
  return (
    <div
      className={`absolute top-2 left-4 -translate-x-1/2 md:left-auto ${
        side === "left"
          ? "md:right-[-2.5rem] md:translate-x-1/2"
          : "md:left-[-2.5rem] md:-translate-x-1/2"
      }`}
      aria-hidden
    >
      <motion.span
        initial={{ scale: 0.6, opacity: 0.4 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true, margin: "-30% 0px -30% 0px" }}
        transition={{ duration: 0.5, type: "spring", bounce: 0.4 }}
        className={`block h-3.5 w-3.5 rotate-45 border-2 ${
          accent
            ? "border-firefly bg-firefly/20 shadow-[0_0_12px_rgba(251,191,36,0.6)]"
            : "border-moss bg-night shadow-[0_0_12px_rgba(52,211,153,0.5)]"
        }`}
      />
    </div>
  );
}

function TrailCard({
  children,
  side,
}: {
  children: React.ReactNode;
  side: "left" | "right";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: side === "left" ? -28 : 28, y: 12 }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6 }}
      className={`relative pl-12 md:pl-0 md:w-[calc(50%-2.5rem)] ${
        side === "right" ? "md:ml-auto" : ""
      }`}
    >
      {children}
    </motion.div>
  );
}

export default function Experience() {
  const trailRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: trailRef,
    offset: ["start 0.8", "end 0.55"],
  });
  const trailFill = useSpring(scrollYProgress, { stiffness: 70, damping: 22 });

  const baseCampSide = experience.length % 2 === 0 ? "left" : "right";

  return (
    <section id="experience" className="relative scroll-mt-20 px-6 py-28 md:py-36">
      <div className="mx-auto max-w-5xl">
        <SectionHeading num="02" name="The Trail" title="Waypoints along the way." />

        <div ref={trailRef} className="relative mt-16">
          {/* The trail: a dashed path that lights up as you walk it */}
          <div
            className="absolute left-4 top-0 h-full -translate-x-1/2 border-l border-dashed border-mist/15 md:left-1/2"
            aria-hidden
          />
          <motion.div
            style={{ scaleY: trailFill }}
            className="absolute left-4 top-0 h-full w-px -translate-x-1/2 origin-top bg-gradient-to-b from-moss via-moss/80 to-firefly shadow-[0_0_10px_rgba(52,211,153,0.5)] md:left-1/2"
            aria-hidden
          />

          <div className="space-y-14 md:space-y-20">
            {experience.map((exp, i) => {
              const side = i % 2 === 0 ? "left" : "right";
              return (
                <div key={exp.company} className="relative">
                  <TrailCard side={side}>
                    <Waypoint side={side} />
                    <div className="rounded-2xl border border-mist/10 bg-pine/60 p-6 backdrop-blur-sm transition-colors duration-500 hover:border-moss/30 md:p-7">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <h3 className="font-display text-xl font-semibold text-mist md:text-2xl">
                          {"link" in exp && exp.link ? (
                            <a
                              href={exp.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="transition-colors hover:text-leaf"
                            >
                              {exp.company} ↗
                            </a>
                          ) : (
                            exp.company
                          )}
                        </h3>
                        <span className="font-mono text-xs text-fog/80">{exp.dates}</span>
                      </div>
                      <p className="mt-1 font-display italic text-leaf/90">{exp.role}</p>
                      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-fog/60">
                        {exp.location}
                      </p>

                      <ul className="mt-5 space-y-2.5">
                        {exp.bullets.map((bullet, j) => (
                          <li key={j} className="flex gap-2.5 text-sm leading-relaxed text-fog">
                            <span className="mt-1 shrink-0 text-moss">▸</span>
                            <span>
                              <Emphasis text={bullet} />
                            </span>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-5 flex flex-wrap gap-2">
                        {exp.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-moss/20 bg-moss/10 px-2.5 py-0.5 font-mono text-[11px] text-leaf/90"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </TrailCard>
                </div>
              );
            })}

            {/* Base camp: education */}
            <div className="relative">
              <TrailCard side={baseCampSide}>
                <Waypoint side={baseCampSide} accent />
                <div className="rounded-2xl border border-firefly/20 bg-pine/60 p-6 backdrop-blur-sm md:p-7">
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-firefly/90">
                    base camp · education
                  </p>
                  <h3 className="mt-2 font-display text-xl font-semibold text-mist md:text-2xl">
                    {education.school}
                  </h3>
                  <p className="mt-1 text-sm text-fog">{education.degree}</p>
                  <p className="mt-2 font-mono text-xs text-fog/70">
                    {education.location} · {education.graduation}
                  </p>
                </div>
              </TrailCard>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
