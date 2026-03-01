"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";

/* ── Leaf config ─────────────────────────────────────────────── */

interface LeafConfig {
  startX: number;
  endX: number;
  y: number;
  scrollStart: number;
  scrollEnd: number;
  rotateStart: number;
  rotateEnd: number;
  size: number;
  color: string;
  finalOpacity: number;
}

const leafConfigs: LeafConfig[] = [
  // Left side
  { startX: -80, endX: 50,  y: 12, scrollStart: 0.05, scrollEnd: 0.35, rotateStart: -45, rotateEnd: 15,  size: 24, color: "#2d5a27", finalOpacity: 0.7  },
  { startX: -60, endX: 70,  y: 32, scrollStart: 0.10, scrollEnd: 0.45, rotateStart: -30, rotateEnd: 25,  size: 20, color: "#3a7a32", finalOpacity: 0.6  },
  { startX: -90, endX: 35,  y: 55, scrollStart: 0.15, scrollEnd: 0.50, rotateStart: -50, rotateEnd: 10,  size: 28, color: "#1e4d1a", finalOpacity: 0.65 },
  { startX: -70, endX: 55,  y: 76, scrollStart: 0.20, scrollEnd: 0.55, rotateStart: -35, rotateEnd: 20,  size: 22, color: "#2d5a27", finalOpacity: 0.55 },
  // Right side
  { startX: 80,  endX: -45, y: 18, scrollStart: 0.08, scrollEnd: 0.40, rotateStart: 45,  rotateEnd: -15, size: 22, color: "#3a7a32", finalOpacity: 0.65 },
  { startX: 60,  endX: -65, y: 42, scrollStart: 0.12, scrollEnd: 0.48, rotateStart: 35,  rotateEnd: -20, size: 26, color: "#1e4d1a", finalOpacity: 0.7  },
  { startX: 90,  endX: -40, y: 62, scrollStart: 0.18, scrollEnd: 0.52, rotateStart: 50,  rotateEnd: -10, size: 20, color: "#2d5a27", finalOpacity: 0.6  },
  { startX: 70,  endX: -50, y: 82, scrollStart: 0.22, scrollEnd: 0.58, rotateStart: 40,  rotateEnd: -25, size: 24, color: "#3a7a32", finalOpacity: 0.55 },
];

/* ── Firefly config ──────────────────────────────────────────── */

const fireflyConfigs = [
  { x: "15%", y: "45%", size: 3,   drift: 1, dur: 4.2, glow: 3.1, delay: 0,   color: "#d4e860" },
  { x: "25%", y: "55%", size: 2,   drift: 2, dur: 5.5, glow: 4.2, delay: 0.8, color: "#b8d44f" },
  { x: "35%", y: "48%", size: 3,   drift: 3, dur: 3.8, glow: 3.5, delay: 1.5, color: "#d4e860" },
  { x: "45%", y: "62%", size: 2,   drift: 1, dur: 6.2, glow: 2.8, delay: 2.1, color: "#b8d44f" },
  { x: "55%", y: "50%", size: 3.5, drift: 2, dur: 4.8, glow: 3.8, delay: 0.3, color: "#d4e860" },
  { x: "65%", y: "58%", size: 2,   drift: 3, dur: 5.1, glow: 4.5, delay: 1.2, color: "#b8d44f" },
  { x: "75%", y: "44%", size: 3,   drift: 1, dur: 3.5, glow: 3.2, delay: 2.5, color: "#d4e860" },
  { x: "20%", y: "68%", size: 2,   drift: 2, dur: 5.8, glow: 2.6, delay: 0.6, color: "#b8d44f" },
  { x: "40%", y: "72%", size: 2.5, drift: 3, dur: 4.5, glow: 3.9, delay: 1.8, color: "#d4e860" },
  { x: "60%", y: "65%", size: 2,   drift: 1, dur: 6.5, glow: 4.1, delay: 0.9, color: "#b8d44f" },
  { x: "80%", y: "52%", size: 3,   drift: 2, dur: 3.9, glow: 3.4, delay: 2.3, color: "#d4e860" },
  { x: "30%", y: "75%", size: 2,   drift: 3, dur: 5.3, glow: 2.9, delay: 1.1, color: "#b8d44f" },
];

/* ── Leaf sub-component ──────────────────────────────────────── */

function Leaf({
  config,
  scrollYProgress,
}: {
  config: LeafConfig;
  scrollYProgress: MotionValue<number>;
}) {
  const x = useTransform(
    scrollYProgress,
    [config.scrollStart, config.scrollEnd],
    [config.startX, config.endX],
  );
  const rotate = useTransform(
    scrollYProgress,
    [config.scrollStart, config.scrollEnd],
    [config.rotateStart, config.rotateEnd],
  );
  const opacity = useTransform(
    scrollYProgress,
    [config.scrollStart, config.scrollStart + 0.08, config.scrollEnd],
    [0, config.finalOpacity, config.finalOpacity],
  );

  const isRight = config.startX > 0;

  return (
    <motion.svg
      style={{
        x,
        rotate,
        opacity,
        top: `${config.y}%`,
        ...(isRight ? { right: 0 } : { left: 0 }),
      }}
      className="absolute pointer-events-none"
      width={config.size}
      height={config.size * 1.6}
      viewBox="0 0 30 48"
      fill="none"
    >
      <path
        d="M15 2 C22 10 26 22 15 46 C4 22 8 10 15 2 Z"
        fill={config.color}
      />
      <path
        d="M15 6 L15 40"
        stroke={config.color}
        strokeWidth="0.8"
        opacity="0.4"
      />
    </motion.svg>
  );
}

/* ── Main component ──────────────────────────────────────────── */

export default function ForestScene() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // Parallax speeds per layer
  const y1 = useTransform(scrollYProgress, [0, 1], [0, 60]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, 250]);

  // Sun — sinks and fades as you scroll
  const sunY = useTransform(scrollYProgress, [0, 0.7], [0, 180]);
  const sunOpacity = useTransform(scrollYProgress, [0, 0.5], [0.9, 0]);
  const sunScale = useTransform(scrollYProgress, [0, 0.7], [1, 0.85]);

  // Firefly parallax (between mountain and tree speed)
  const yFireflies = useTransform(scrollYProgress, [0, 1], [0, 100]);

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Hardcoded greens below must stay in sync with --color-bg (#0b1a0f) */}

      {/* Sky gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0b1a0f] via-[#0f2614] to-[#132e18]" />

      {/* ── Sun ─ behind mountains, scroll-driven descent ────── */}
      <motion.div
        style={{ y: sunY, opacity: sunOpacity, scale: sunScale }}
        className="absolute left-1/2 -translate-x-1/2 bottom-[35%]"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.2 }}
          className="relative"
        >
          {/* Outer glow halo */}
          <div
            className="absolute -inset-16 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(245,197,66,0.15) 0%, rgba(245,197,66,0.05) 40%, transparent 70%)",
            }}
          />
          {/* Sun body */}
          <div
            className="w-20 h-20 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 40% 40%, #f5d76e, #f5c542 50%, #e8a830 100%)",
              boxShadow:
                "0 0 60px rgba(245,197,66,0.4), 0 0 120px rgba(245,197,66,0.15)",
            }}
          />
        </motion.div>
      </motion.div>

      {/* ── Layer 1: Distant mountains — slowest parallax ────── */}
      <motion.div style={{ y: y1 }} className="absolute inset-0">
        <svg
          viewBox="0 0 1440 400"
          className="absolute bottom-0 w-full h-[50%] min-h-[200px]"
          preserveAspectRatio="xMidYMax slice"
          fill="none"
        >
          <motion.path
            d="M0 400 L0 280 Q120 200 240 260 Q360 180 480 240 Q600 160 720 220 Q840 140 960 200 Q1080 160 1200 230 Q1320 190 1440 250 L1440 400 Z"
            fill="#0f2a12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5 }}
          />
        </svg>
      </motion.div>

      {/* ── Layer 2: Mid-ground tree line — medium parallax ──── */}
      <motion.div style={{ y: y2 }} className="absolute inset-0">
        <svg
          viewBox="0 0 1440 500"
          className="absolute bottom-0 w-full h-[55%] min-h-[220px]"
          preserveAspectRatio="xMidYMax slice"
          fill="none"
        >
          <motion.g
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
            style={{ transformOrigin: "bottom" }}
          >
            <path d="M80 500 L80 320 L60 320 L100 240 L80 240 L110 180 L90 180 L120 120 L150 180 L130 180 L160 240 L140 240 L180 320 L160 320 L160 500 Z" fill="#143d1a" />
            <path d="M200 500 L200 350 L180 350 L220 280 L200 280 L230 220 L210 220 L240 160 L270 220 L250 220 L280 280 L260 280 L300 350 L280 350 L280 500 Z" fill="#1a4a20" />
            <path d="M400 500 L400 300 L375 300 L420 220 L395 220 L440 150 L415 150 L450 90 L485 150 L460 150 L505 220 L480 220 L525 300 L500 300 L500 500 Z" fill="#143d1a" />
            <path d="M520 500 L520 340 L500 340 L540 270 L520 270 L555 210 L535 210 L565 150 L595 210 L575 210 L610 270 L590 270 L630 340 L610 340 L610 500 Z" fill="#1a4a20" />
            <path d="M680 500 L680 310 L660 310 L700 240 L680 240 L720 170 L700 170 L730 100 L760 170 L740 170 L780 240 L760 240 L800 310 L780 310 L780 500 Z" fill="#164218" />
            <path d="M880 500 L880 330 L860 330 L900 260 L880 260 L920 190 L900 190 L935 120 L970 190 L950 190 L990 260 L970 260 L1010 330 L990 330 L990 500 Z" fill="#143d1a" />
            <path d="M1020 500 L1020 350 L1000 350 L1040 280 L1020 280 L1060 210 L1040 210 L1075 140 L1110 210 L1090 210 L1130 280 L1110 280 L1150 350 L1130 350 L1130 500 Z" fill="#1a4a20" />
            <path d="M1250 500 L1250 310 L1230 310 L1270 230 L1250 230 L1290 160 L1270 160 L1305 100 L1340 160 L1320 160 L1360 230 L1340 230 L1380 310 L1360 310 L1360 500 Z" fill="#164218" />
          </motion.g>
          <rect x="0" y="420" width="1440" height="80" fill="#112e14" />
        </svg>
      </motion.div>

      {/* ── Fireflies — ambient CSS animation + scroll parallax ─ */}
      <motion.div style={{ y: yFireflies }} className="absolute inset-0 pointer-events-none">
        {fireflyConfigs.map((ff, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: ff.x,
              top: ff.y,
              width: ff.size,
              height: ff.size,
              backgroundColor: ff.color,
              boxShadow: `0 0 ${ff.size * 3}px ${ff.color}80, 0 0 ${ff.size * 6}px ${ff.color}40`,
              animation: `firefly-drift-${ff.drift} ${ff.dur}s ease-in-out ${ff.delay}s infinite, firefly-glow ${ff.glow}s ease-in-out ${ff.delay}s infinite`,
            }}
          />
        ))}
      </motion.div>

      {/* ── Layer 3: Foreground trees — fastest parallax ──────── */}
      <motion.div style={{ y: y3 }} className="absolute inset-0">
        <svg
          viewBox="0 0 1440 600"
          className="absolute bottom-0 w-full h-[50%] min-h-[200px]"
          preserveAspectRatio="xMidYMax slice"
          fill="none"
        >
          <motion.g
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 1.5, delay: 0.6, ease: "easeOut" }}
            style={{ transformOrigin: "bottom" }}
          >
            <path d="M-20 600 L-20 350 L-50 350 L10 260 L-20 260 L30 180 L0 180 L50 100 L100 180 L70 180 L120 260 L90 260 L150 350 L120 350 L120 600 Z" fill="#0d2e10" />
            <path d="M1320 600 L1320 340 L1290 340 L1340 250 L1310 250 L1360 170 L1330 170 L1380 90 L1430 170 L1400 170 L1450 250 L1420 250 L1470 340 L1440 340 L1440 600 Z" fill="#0d2e10" />
          </motion.g>
          <rect x="0" y="520" width="1440" height="80" fill="#0b1a0f" />
        </svg>
      </motion.div>

      {/* ── Leaves — scroll-driven drift from edges ──────────── */}
      <div className="absolute inset-0 pointer-events-none">
        {leafConfigs.map((leaf, i) => (
          <Leaf key={i} config={leaf} scrollYProgress={scrollYProgress} />
        ))}
      </div>

      {/* ── Ground fog ───────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#0b1a0f] via-[#0b1a0f]/80 to-transparent" />
    </div>
  );
}
