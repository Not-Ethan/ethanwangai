"use client";

import { motion } from "framer-motion";
import { projects } from "@/lib/data";

function ProjectCard({ project, index }: { project: (typeof projects)[0]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className={`group relative rounded-xl border border-white/5 bg-bg/50 p-6 transition-all duration-500 hover:border-accent/30 hover:bg-bg-card-hover hover:shadow-[0_0_30px_rgba(74,222,128,0.1)] ${
        project.featured ? "md:col-span-2" : ""
      }`}
    >
      {project.featured && (
        <div className="absolute top-4 right-4 px-2 py-0.5 text-xs font-mono text-gold bg-gold/10 rounded border border-gold/30">
          Featured
        </div>
      )}

      <p className="text-xs font-mono text-muted">{project.dates}</p>

      <h3 className="text-xl font-heading font-bold text-light mt-2 group-hover:text-accent transition-colors">
        {project.title}
      </h3>

      <p className="text-sm text-muted mt-2 leading-relaxed">{project.description}</p>

      <div className="mt-4 inline-block px-3 py-1 rounded bg-accent/10 border border-accent/20">
        <span className="text-sm font-mono text-accent">{project.metric}</span>
      </div>

      <ul className="mt-4 space-y-1.5">
        {project.bullets.map((bullet, j) => (
          <li key={j} className="text-xs text-muted/80 flex gap-2">
            <span className="text-accent/60 mt-0.5 shrink-0">▹</span>
            {bullet}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2 mt-4">
        {project.tags.map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 text-xs font-mono text-accent/80 bg-accent/10 rounded border border-accent/20"
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
    <section className="min-h-screen flex items-center justify-center py-24 px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-5xl mx-auto w-full rounded-2xl bg-bg-card/80 backdrop-blur-md border border-white/5 p-8 md:p-12"
      >
        <h2 className="text-sm font-mono text-accent mb-12">03 / Projects</h2>

        <div className="grid md:grid-cols-2 gap-6">
          {projects.map((project, i) => (
            <ProjectCard key={i} project={project} index={i} />
          ))}
        </div>
      </motion.div>
    </section>
  );
}
