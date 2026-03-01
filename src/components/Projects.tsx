"use client";

import { motion } from "framer-motion";
import { projects } from "@/lib/data";

function ProjectCard({ project, index }: { project: typeof projects[0]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.15 }}
      className={`group relative rounded-xl border border-white/5 bg-bg-card p-6 transition-all duration-500 hover:border-accent/30 hover:bg-bg-card-hover hover:shadow-[0_0_30px_rgba(59,130,246,0.1)] ${
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

      <p className="text-sm text-muted mt-2 leading-relaxed">
        {project.description}
      </p>

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
    <section id="projects" className="py-32 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-sm font-mono text-accent mb-16"
        >
          03 / Projects
        </motion.h2>

        <div className="grid md:grid-cols-2 gap-6">
          {projects.map((project, i) => (
            <ProjectCard key={i} project={project} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
