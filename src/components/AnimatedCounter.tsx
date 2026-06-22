"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

interface AnimatedCounterProps {
  value: string;
  label: string;
}

export default function AnimatedCounter({ value, label }: AnimatedCounterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const isNumeric = /[\d.]/.test(value);
  // Non-numeric values (e.g. "Top 100") render as-is; numeric ones count up.
  const [displayValue, setDisplayValue] = useState(() =>
    isNumeric ? "0" : value
  );

  useEffect(() => {
    if (!isInView || !isNumeric) return;

    const numericMatch = value.replace(/,/g, "").match(/[\d.]+/);
    if (!numericMatch) return;

    const target = parseFloat(numericMatch[0]);
    const prefix = value.substring(0, value.indexOf(numericMatch[0]));
    const suffix = value.substring(value.indexOf(numericMatch[0]) + numericMatch[0].length);
    const isFloat = numericMatch[0].includes(".");
    const duration = 2000;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;

      let formatted: string;
      if (target >= 1000) {
        formatted = Math.round(current).toLocaleString();
      } else if (isFloat) {
        formatted = current.toFixed(1);
      } else {
        formatted = Math.round(current).toString();
      }

      setDisplayValue(`${prefix}${formatted}${suffix}`);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    requestAnimationFrame(animate);
  }, [isInView, isNumeric, value]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.5 }}
      className="text-center"
    >
      <div className="text-3xl md:text-4xl font-mono font-bold text-accent">
        {displayValue}
      </div>
      <div className="mt-1 text-sm text-muted font-mono">{label}</div>
    </motion.div>
  );
}
