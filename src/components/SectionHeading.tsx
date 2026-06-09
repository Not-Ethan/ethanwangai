"use client";

import { motion } from "framer-motion";

export default function SectionHeading({
  num,
  name,
  title,
  align = "left",
}: {
  num: string;
  name: string;
  title: string;
  align?: "left" | "center";
}) {
  const centered = align === "center";
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6 }}
      className={centered ? "text-center" : ""}
    >
      <p
        className={`flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.3em] text-moss ${
          centered ? "justify-center" : ""
        }`}
      >
        <span className="inline-block h-px w-8 bg-moss/40" />
        {num} · {name}
        {centered && <span className="inline-block h-px w-8 bg-moss/40" />}
      </p>
      <h2 className="mt-4 font-display text-3xl font-semibold text-mist md:text-5xl">
        {title}
      </h2>
    </motion.div>
  );
}
