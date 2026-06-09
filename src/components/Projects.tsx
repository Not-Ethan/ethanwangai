"use client";

import { motion } from "framer-motion";
import { FiAward } from "react-icons/fi";
import SectionHeading from "./SectionHeading";
import { projects, awards } from "@/lib/data";
import { terrainSparkline } from "@/lib/forest";

const TERRAIN = terrainSparkline(99, 600, 120, 26);

function FeaturedTerrain() {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 h-28 overflow-hidden rounded-b-2xl opacity-80"
      aria-hidden
    >
      <svg viewBox="0 0 600 120" preserveAspectRatio="none" className="h-full w-full">
        <defs>
          <linearGradient id="terrain-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={TERRAIN.area} fill="url(#terrain-fill)" />
        <motion.path
          d={TERRAIN.line}
          fill="none"
          stroke="#34d399"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 2.2, ease: "easeInOut" }}
        />
      </svg>
      <span
        className="absolute h-2 w-2 animate-lantern rounded-full bg-firefly"
        style={{
          left: `${(TERRAIN.last[0] / 600) * 100}%`,
          top: `${(TERRAIN.last[1] / 120) * 100}%`,
          transform: "translate(-100%, -50%)",
        }}
      />
    </div>
  );
}

function ProjectCard({ project, index }: { project: (typeof projects)[0]; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay: index * 0.12 }}
      className={`group relative overflow-hidden rounded-2xl border border-mist/10 bg-pine/60 p-6 backdrop-blur-sm transition-all duration-500 hover:-translate-y-1 hover:border-moss/35 hover:shadow-[0_8px_40px_rgba(52,211,153,0.1)] md:p-8 ${
        project.featured ? "md:col-span-2 pb-28 md:pb-32" : ""
      }`}
    >
      {project.featured && (
        <span className="absolute right-5 top-5 rounded-full border border-firefly/30 bg-firefly/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-firefly">
          featured
        </span>
      )}

      <p className="font-mono text-[11px] text-fog/70">{project.dates}</p>

      <h3 className="mt-2 font-display text-2xl font-semibold text-mist transition-colors group-hover:text-leaf md:text-3xl">
        {project.title}
      </h3>

      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fog">
        {project.description}
      </p>

      <div className="mt-4 inline-flex items-start gap-2 rounded-lg border border-firefly/25 bg-firefly/[0.08] px-3 py-1.5">
        {project.award && <FiAward className="mt-0.5 shrink-0 text-firefly" size={14} />}
        <span className="font-mono text-xs text-firefly md:text-sm">{project.metric}</span>
      </div>

      <ul className="mt-5 space-y-2">
        {project.bullets.map((bullet, j) => (
          <li key={j} className="flex gap-2.5 text-sm leading-relaxed text-fog/90">
            <span className="mt-0.5 shrink-0 text-moss/80">▸</span>
            {bullet}
          </li>
        ))}
      </ul>

      <div className="relative z-10 mt-5 flex flex-wrap gap-2">
        {project.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-moss/20 bg-moss/10 px-2.5 py-0.5 font-mono text-[11px] text-leaf/90"
          >
            {tag}
          </span>
        ))}
      </div>

      {project.featured && <FeaturedTerrain />}
    </motion.article>
  );
}

export default function Projects() {
  return (
    <section id="projects" className="relative scroll-mt-20 px-6 py-28 md:py-36">
      {/* Moonlight pooling in the clearing */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-10 h-[480px] w-[min(900px,100vw)] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(234,242,236,0.05),transparent_65%)]"
      />

      <div className="relative mx-auto max-w-5xl">
        <SectionHeading num="03" name="The Clearing" title="Things grown in the open." />

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {projects.map((project, i) => (
            <ProjectCard key={project.title} project={project} index={i} />
          ))}
        </div>

        {/* Badges earned along the way */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-16 mb-5 font-mono text-[10px] uppercase tracking-[0.3em] text-fog/60"
        >
          badges earned along the way
        </motion.p>
        <div className="grid gap-4 sm:grid-cols-3">
          {awards.map((award, i) => (
            <motion.div
              key={award.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="flex items-start gap-3 rounded-xl border border-mist/10 bg-pine/40 p-4 transition-colors duration-300 hover:border-firefly/30"
            >
              <FiAward className="mt-0.5 shrink-0 text-firefly" size={18} />
              <div>
                <p className="text-sm font-medium leading-snug text-mist">{award.title}</p>
                <p className="mt-1 text-xs text-fog">{award.org}</p>
                <p className="mt-0.5 font-mono text-[10px] text-fog/60">{award.date}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
