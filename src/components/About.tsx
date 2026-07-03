"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView } from "framer-motion";
import { about, projectMetrics, skills } from "@/lib/data";
import { fadeUp, fadeRight, stagger, viewport, EASE } from "@/components/sections/reveal";

function CountUpValue({ value }: { value: string }) {
  const match = value.match(/^([^\d]*)([\d,]+)(.*)$/);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { amount: 0.7 });
  const [display, setDisplay] = useState("0");

  const numeric = match ? parseFloat(match[2].replace(/,/g, "")) : 0;
  const grouped = match ? match[2].includes(",") : false;

  useEffect(() => {
    if (!match) return;
    if (!inView) {
      setDisplay("0");
      return;
    }
    const controls = animate(0, numeric, {
      duration: 1.5,
      ease: EASE,
      onUpdate: (v) => {
        const rounded = Math.round(v);
        setDisplay(grouped ? rounded.toLocaleString("en-US") : String(rounded));
      },
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, numeric, grouped]);

  if (!match) return <span ref={ref}>{value}</span>;
  return (
    <span ref={ref}>
      {match[1]}
      {display}
      {match[3]}
    </span>
  );
}

export default function About() {
  return (
    <section id="about" className="relative flex min-h-screen items-center px-6 md:px-12 py-20">
      <div className="mx-auto w-full max-w-6xl">
        <div className="grid gap-10 md:grid-cols-[1.15fr_1fr] md:gap-16 items-start">
          {/* Left: the introduction */}
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={viewport}
            className="section-scrim"
          >
            <motion.p variants={fadeUp} className="kicker mb-5">
              01 · Morning — About
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="font-display font-semibold text-ink text-4xl md:text-6xl leading-tight"
            >
              A short <em className="font-normal">introduction</em>
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-8 text-lg md:text-xl text-ink/90 leading-relaxed">
              {about.lead}
            </motion.p>
            <motion.p variants={fadeUp} className="mt-5 text-base text-ink/75 leading-relaxed">
              {about.body}
            </motion.p>

            <motion.div variants={fadeUp} className="mt-8">
              {Object.entries(skills).map(([category, items]) => (
                <div key={category} className="flex flex-wrap items-baseline gap-x-2 gap-y-2 py-3 border-b hairline first:border-t">
                  <span className="w-full sm:w-32 shrink-0 font-mono text-[10px] tracking-[0.2em] uppercase text-muted">
                    {category}
                  </span>
                  {items.map((skill) => (
                    <span key={skill} className="font-mono text-xs text-ink/85">
                      {skill}
                      <span className="text-muted/50 last:hidden">&ensp;·&ensp;</span>
                    </span>
                  ))}
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right: the numbers */}
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={viewport}
            className="veil-panel rounded-2xl p-7 md:p-9"
          >
            {projectMetrics.map((venture, vi) => (
              <motion.div key={venture.name} variants={fadeRight} className={vi > 0 ? "mt-9 pt-9 border-t hairline" : ""}>
                <h3 className="font-mono text-[11px] tracking-[0.22em] uppercase text-amber">
                  {venture.link ? (
                    <a href={venture.link} target="_blank" rel="noopener noreferrer" className="hover:text-ember transition-colors">
                      {venture.name} ↗
                    </a>
                  ) : (
                    venture.name
                  )}
                </h3>
                <dl className="mt-5 space-y-5">
                  {venture.metrics.map((metric) => (
                    <div key={metric.label} className="flex items-baseline justify-between gap-4">
                      <dt className="order-2 text-right font-mono text-[11px] text-muted leading-snug max-w-[9rem]">
                        {metric.label}
                      </dt>
                      <dd className="order-1 font-display font-semibold text-3xl md:text-4xl text-ink tabular-nums">
                        <CountUpValue value={metric.value} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
