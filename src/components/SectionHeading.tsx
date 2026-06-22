"use client";

import { motion } from "framer-motion";
import { chapters } from "@/lib/data";

export default function SectionHeading({
  chapterId,
  kicker,
}: {
  chapterId: (typeof chapters)[number]["id"];
  kicker: string;
}) {
  const chapter = chapters.find((c) => c.id === chapterId)!;

  return (
    <div className="mb-14 md:mb-20">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="flex items-center gap-3"
      >
        <span className="font-mono text-xs tracking-[0.3em] text-accent uppercase">
          Chapter {chapter.index}
        </span>
        <span className="h-px w-12 bg-gradient-to-r from-accent/60 to-transparent" />
        <span className="font-mono text-xs tracking-[0.2em] text-muted uppercase">
          {kicker}
        </span>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, delay: 0.05 }}
        className="mt-4 font-display text-5xl md:text-7xl font-light text-light tracking-tight"
        style={{ fontVariationSettings: '"opsz" 144, "SOFT" 40' }}
      >
        {chapter.name}
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, delay: 0.15 }}
        className="mt-3 font-display italic text-lg md:text-xl text-sage/80"
      >
        {chapter.line}
      </motion.p>
    </div>
  );
}
