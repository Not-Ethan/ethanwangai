"use client";

import { motion } from "framer-motion";
import SectionHeading from "./SectionHeading";
import { projects } from "@/lib/data";

function ProjectCard({
  project,
  index,
}: {
  project: (typeof projects)[0];
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay: index * 0.12 }}
      className={`group relative glass glass-hover rounded-2xl p-7 ${
        project.featured ? "md:col-span-2" : ""
      }`}
    >
      {project.featured && (
        <div className="absolute top-5 right-5 px-2.5 py-0.5 text-xs font-mono text-gold bg-gold/10 rounded-full border border-gold/30">
          Featured
        </div>
      )}

      <p className="text-xs font-mono text-muted">{project.dates}</p>

      <h3 className="text-2xl font-display font-medium text-light mt-2 group-hover:text-accent transition-colors">
        {project.title}
      </h3>

      <p className="text-sm text-light/70 mt-3 leading-relaxed max-w-2xl">
        {project.description}
      </p>

      <div className="mt-5 inline-block px-3.5 py-1.5 rounded-full bg-accent/10 border border-accent/25">
        <span className="text-sm font-mono text-accent">{project.metric}</span>
      </div>

      <ul className="mt-5 space-y-1.5">
        {project.bullets.map((bullet, j) => (
          <li key={j} className="text-xs text-muted flex gap-2">
            <span className="text-sage/70 mt-0.5 shrink-0">▹</span>
            {bullet}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2 mt-5">
        {project.tags.map((tag) => (
          <span
            key={tag}
            className="px-2.5 py-0.5 text-xs font-mono text-sage bg-sage/10 rounded-full border border-sage/20"
          >
            {tag}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

export default function Projects() {
  return (
    <section
      id="projects"
      className="relative min-h-screen flex items-center py-28 px-6 md:px-12"
    >
      <div className="max-w-5xl mx-auto w-full">
        <SectionHeading chapterId="projects" kicker="Projects" />

        <div className="grid md:grid-cols-2 gap-5">
          {projects.map((project, i) => (
            <ProjectCard key={i} project={project} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
