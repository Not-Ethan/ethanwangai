"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

/* ── Underbrush leaf config ──────────────────────────────────── */

interface FrameLeaf {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  width: number;
  rotate: number;
  color: string;
  opacity: number;
  blur?: number;
  sway: 1 | 2 | 3;
  swayDuration: number;
  swayDelay: number;
  variant: 1 | 2 | 3;
  flipX?: boolean;
}

const frameLeaves: FrameLeaf[] = [
  // Top-left cluster
  { top: "-8%", left: "-4%",   width: 320, rotate: 25,   color: "#1a3d1c", opacity: 0.7,  sway: 1, swayDuration: 8,  swayDelay: 0,   variant: 1 },
  { top: "-3%", left: "4%",    width: 240, rotate: 45,   color: "#2a5a2d", opacity: 0.5,  sway: 2, swayDuration: 10, swayDelay: 1.2, variant: 2, blur: 1 },
  { top: "5%",  left: "-6%",   width: 200, rotate: 10,   color: "#1e4d1f", opacity: 0.6,  sway: 3, swayDuration: 9,  swayDelay: 0.5, variant: 3 },
  // Top-right cluster
  { top: "-6%", right: "-3%",  width: 300, rotate: -30,  color: "#1a3d1c", opacity: 0.65, sway: 2, swayDuration: 9,  swayDelay: 0.8, variant: 2, flipX: true },
  { top: "0%",  right: "5%",   width: 220, rotate: -50,  color: "#2a5a2d", opacity: 0.45, sway: 1, swayDuration: 11, swayDelay: 2,   variant: 1, blur: 1.5, flipX: true },
  { top: "8%",  right: "-5%",  width: 180, rotate: -15,  color: "#1e4d1f", opacity: 0.55, sway: 3, swayDuration: 8,  swayDelay: 1.5, variant: 3, flipX: true },
  // Left edge
  { top: "35%", left: "-8%",   width: 260, rotate: 5,    color: "#143d18", opacity: 0.5,  sway: 1, swayDuration: 10, swayDelay: 0.3, variant: 3 },
  { top: "55%", left: "-5%",   width: 200, rotate: 20,   color: "#1e4d1f", opacity: 0.4,  sway: 2, swayDuration: 9,  swayDelay: 1.8, variant: 1, blur: 1 },
  // Right edge
  { top: "40%", right: "-7%",  width: 240, rotate: -10,  color: "#143d18", opacity: 0.5,  sway: 3, swayDuration: 11, swayDelay: 0.6, variant: 2, flipX: true },
  { top: "60%", right: "-4%",  width: 190, rotate: -25,  color: "#1e4d1f", opacity: 0.4,  sway: 1, swayDuration: 8,  swayDelay: 2.2, variant: 3, flipX: true, blur: 1 },
  // Bottom corners
  { bottom: "-5%", left: "-3%",  width: 280, rotate: 160,  color: "#0d2e10", opacity: 0.6,  sway: 2, swayDuration: 10, swayDelay: 0.4, variant: 1 },
  { bottom: "-8%", right: "-2%", width: 250, rotate: -155, color: "#0d2e10", opacity: 0.55, sway: 3, swayDuration: 9,  swayDelay: 1,   variant: 2, flipX: true },
];

/* ── Leaf SVG paths ──────────────────────────────────────────── */

const leafPaths: Record<1 | 2 | 3, { outline: string; vein: string; sideVeins: string[] }> = {
  1: {
    outline: "M50 4 C68 16 78 38 68 68 C62 82 56 92 50 96 C44 92 38 82 32 68 C22 38 32 16 50 4 Z",
    vein: "M50 10 L50 90",
    sideVeins: ["M50 25 L34 17", "M50 25 L66 17", "M50 42 L30 32", "M50 42 L70 32", "M50 58 L34 50", "M50 58 L66 50", "M50 72 L38 66", "M50 72 L62 66"],
  },
  2: {
    outline: "M50 2 C56 12 72 20 80 16 C72 28 64 36 56 40 C64 48 72 62 68 78 C60 72 52 64 50 56 C48 64 40 72 32 78 C28 62 36 48 44 40 C36 36 28 28 20 16 C28 20 44 12 50 2 Z",
    vein: "M50 8 L50 74",
    sideVeins: ["M50 20 L32 12", "M50 20 L68 12", "M50 38 L36 28", "M50 38 L64 28", "M50 54 L40 48", "M50 54 L60 48"],
  },
  3: {
    outline: "M50 2 C60 14 64 32 62 52 C60 72 56 86 50 96 C44 86 40 72 38 52 C36 32 40 14 50 2 Z",
    vein: "M50 8 L50 90",
    sideVeins: ["M50 18 L40 12", "M50 18 L60 12", "M50 32 L38 24", "M50 32 L62 24", "M50 46 L38 38", "M50 46 L62 38", "M50 60 L40 54", "M50 60 L60 54", "M50 74 L42 68", "M50 74 L58 68"],
  },
};

/* ── Firefly config ──────────────────────────────────────────── */

const fireflyConfigs = [
  { x: "15%", y: "45%", size: 3,   drift: 1, dur: 4.2, glow: 3.1, delay: 0,   color: "#d4e860" },
  { x: "25%", y: "55%", size: 2.5, drift: 2, dur: 5.5, glow: 4.2, delay: 0.8, color: "#b8d44f" },
  { x: "35%", y: "48%", size: 3,   drift: 3, dur: 3.8, glow: 3.5, delay: 1.5, color: "#d4e860" },
  { x: "45%", y: "62%", size: 2,   drift: 1, dur: 6.2, glow: 2.8, delay: 2.1, color: "#b8d44f" },
  { x: "55%", y: "50%", size: 3.5, drift: 2, dur: 4.8, glow: 3.8, delay: 0.3, color: "#d4e860" },
  { x: "65%", y: "58%", size: 2.5, drift: 3, dur: 5.1, glow: 4.5, delay: 1.2, color: "#b8d44f" },
  { x: "75%", y: "44%", size: 3,   drift: 1, dur: 3.5, glow: 3.2, delay: 2.5, color: "#d4e860" },
  { x: "20%", y: "68%", size: 2,   drift: 2, dur: 5.8, glow: 2.6, delay: 0.6, color: "#b8d44f" },
  { x: "40%", y: "72%", size: 3,   drift: 3, dur: 4.5, glow: 3.9, delay: 1.8, color: "#d4e860" },
  { x: "60%", y: "65%", size: 2,   drift: 1, dur: 6.5, glow: 4.1, delay: 0.9, color: "#b8d44f" },
  { x: "80%", y: "52%", size: 3,   drift: 2, dur: 3.9, glow: 3.4, delay: 2.3, color: "#d4e860" },
  { x: "30%", y: "75%", size: 2.5, drift: 3, dur: 5.3, glow: 2.9, delay: 1.1, color: "#b8d44f" },
];

/* ── Main component ──────────────────────────────────────────── */

export default function ForestScene() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  /* ── Layer parallax (translateY) ───────────────────────────── */
  const y1 = useTransform(scrollYProgress, [0, 1], [0, 60]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, 250]);
  const yFireflies = useTransform(scrollYProgress, [0, 1], [0, 100]);

  /* ── Sun descent ───────────────────────────────────────────── */
  const sunY = useTransform(scrollYProgress, [0, 0.6], [0, 200]);
  const sunOpacity = useTransform(scrollYProgress, [0, 0.45], [0.9, 0]);
  const sunScale = useTransform(scrollYProgress, [0, 0.6], [1, 0.8]);

  /* ── Zoom-through: each layer scales up + fades as you scroll */

  // Underbrush leaves — closest, clears first
  const scaleLeaves = useTransform(scrollYProgress, [0, 0.45], [1, 3.5]);
  const opacityLeaves = useTransform(scrollYProgress, [0.08, 0.4], [1, 0]);

  // Foreground trees
  const scaleFg = useTransform(scrollYProgress, [0, 0.65], [1, 2]);
  const opacityFg = useTransform(scrollYProgress, [0.2, 0.6], [1, 0]);

  // Fireflies
  const opacityFireflies = useTransform(scrollYProgress, [0.15, 0.55], [1, 0]);

  // Mid-ground trees
  const scaleMg = useTransform(scrollYProgress, [0, 0.8], [1, 1.4]);
  const opacityMg = useTransform(scrollYProgress, [0.3, 0.7], [1, 0]);

  // Mountains
  const scaleMt = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const opacityMt = useTransform(scrollYProgress, [0.4, 0.8], [1, 0]);

  // Sky / atmosphere — last to go
  const opacitySky = useTransform(scrollYProgress, [0.5, 0.9], [1, 0]);

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Hardcoded greens below must stay in sync with --color-bg (#0b1a0f) */}

      {/* ── Sky + atmosphere — fades last ────────────────────── */}
      <motion.div style={{ opacity: opacitySky }} className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#060e08] via-[#0b1a0f] to-[#132e18]" />
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 120% 40% at 50% 75%, rgba(40,70,30,0.4) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            background:
              "linear-gradient(175deg, transparent 20%, rgba(180,220,140,0.3) 22%, transparent 24%), " +
              "linear-gradient(168deg, transparent 35%, rgba(180,220,140,0.2) 37%, transparent 39%), " +
              "linear-gradient(182deg, transparent 50%, rgba(180,220,140,0.15) 52%, transparent 54%)",
          }}
        />
      </motion.div>

      {/* ── Sun — sinks behind mountains ─────────────────────── */}
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
          <div
            className="absolute -inset-32 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(245,197,66,0.12) 0%, rgba(245,180,60,0.06) 30%, rgba(200,160,50,0.02) 50%, transparent 70%)",
            }}
          />
          <div
            className="w-24 h-24 rounded-full"
            style={{
              background: "radial-gradient(circle at 40% 40%, #f5d76e, #f5c542 50%, #e8a830 100%)",
              boxShadow: "0 0 80px rgba(245,197,66,0.5), 0 0 160px rgba(245,197,66,0.2), 0 0 240px rgba(245,180,60,0.1)",
            }}
          />
        </motion.div>
      </motion.div>

      {/* ── Mountains — barely zooms, fades mid-late ─────────── */}
      <motion.div style={{ y: y1, scale: scaleMt, opacity: opacityMt }} className="absolute inset-0">
        <svg
          viewBox="0 0 1440 400"
          className="absolute bottom-0 w-full h-[60%] min-h-[250px]"
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

      {/* ── Mid-ground trees — moderate zoom + fade ──────────── */}
      <motion.div style={{ y: y2, scale: scaleMg, opacity: opacityMg }} className="absolute inset-0">
        <svg
          viewBox="0 0 1440 500"
          className="absolute bottom-0 w-full h-[70%] min-h-[300px]"
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

      {/* ── Fireflies — fade with mid-ground ─────────────────── */}
      <motion.div style={{ y: yFireflies, opacity: opacityFireflies }} className="absolute inset-0 pointer-events-none">
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

      {/* ── Foreground trees — strong zoom + fade ────────────── */}
      <motion.div style={{ y: y3, scale: scaleFg, opacity: opacityFg }} className="absolute inset-0">
        <svg
          viewBox="0 0 1440 600"
          className="absolute bottom-0 w-full h-[65%] min-h-[280px]"
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

      {/* ── Underbrush leaves — zoom past fastest ────────────── */}
      <motion.div
        style={{ scale: scaleLeaves, opacity: opacityLeaves }}
        className="absolute inset-0 pointer-events-none"
      >
        {frameLeaves.map((leaf, i) => {
          const shape = leafPaths[leaf.variant];
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: leaf.opacity }}
              transition={{ duration: 1.5, delay: 0.3 + i * 0.08 }}
              className="absolute"
              style={{
                top: leaf.top,
                bottom: leaf.bottom,
                left: leaf.left,
                right: leaf.right,
                width: leaf.width,
                height: leaf.width,
              }}
            >
              {/* Sway animation wrapper */}
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  animation: `leaf-sway-${leaf.sway} ${leaf.swayDuration}s ease-in-out ${leaf.swayDelay}s infinite`,
                  transformOrigin: "top center",
                }}
              >
                {/* Static rotation + flip */}
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    transform: `rotate(${leaf.rotate}deg)${leaf.flipX ? " scaleX(-1)" : ""}`,
                    filter: leaf.blur ? `blur(${leaf.blur}px)` : undefined,
                  }}
                >
                  <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
                    <path d={shape.outline} fill={leaf.color} />
                    <path d={shape.vein} stroke={leaf.color} strokeWidth="1" opacity="0.25" />
                    {shape.sideVeins.map((d, j) => (
                      <path key={j} d={d} stroke={leaf.color} strokeWidth="0.5" opacity="0.15" />
                    ))}
                  </svg>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ── Ground fog ───────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#0b1a0f] via-[#0b1a0f]/80 to-transparent" />
    </div>
  );
}
