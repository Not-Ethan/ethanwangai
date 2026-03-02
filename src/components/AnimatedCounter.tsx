"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

interface AnimatedCounterProps {
  value: string;
  label: string;
  colorClass?: string;
}

function parseValue(value: string) {
  // Find numeric portion (including commas/dots) in the original string
  const match = value.match(/[\d,.]+/);
  if (!match) return null;
  const start = match.index!;
  const prefix = value.substring(0, start);
  const suffix = value.substring(start + match[0].length);
  const target = parseFloat(match[0].replace(/,/g, ""));
  const hasCommas = match[0].includes(",");
  const isFloat = match[0].replace(/,/g, "").includes(".");
  return { prefix, suffix, target, hasCommas, isFloat };
}

export default function AnimatedCounter({ value, label, colorClass = "text-accent" }: AnimatedCounterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const [displayValue, setDisplayValue] = useState(() => {
    const parsed = parseValue(value);
    if (!parsed) return value;
    return `${parsed.prefix}0${parsed.suffix}`;
  });

  useEffect(() => {
    if (!isInView) return;

    const parsed = parseValue(value);
    if (!parsed) return;

    const { prefix, suffix, target, hasCommas, isFloat } = parsed;
    const duration = 2000;
    const startTime = Date.now();
    let frameId = 0;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;

      let formatted: string;
      if (isFloat) {
        formatted = current.toFixed(1);
      } else if (hasCommas) {
        formatted = Math.round(current).toLocaleString();
      } else {
        formatted = Math.round(current).toString();
      }

      setDisplayValue(`${prefix}${formatted}${suffix}`);

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [isInView, value]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="text-center"
    >
      <div className={`text-3xl md:text-4xl font-mono font-bold ${colorClass}`}>
        {parseValue(value) ? displayValue : value}
      </div>
      <div className="mt-1 text-sm text-muted font-mono">{label}</div>
    </motion.div>
  );
}
