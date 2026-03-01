"use client";

import React from "react";
import { motion, useTransform, useMotionTemplate, type MotionValue } from "framer-motion";

/* ── Theme color arrays (one value per page, interpolated smoothly) ── */

const P = [0, 1, 2, 3, 4];

const SKY_TOP =        ["#1a0a2e", "#0a4a30", "#2e1a3d", "#1a0a1e", "#050a0f"];
const SKY_MID =        ["#3d1f5c", "#1a6b4a", "#8b4a6b", "#6b2a3d", "#0a1a12"];
const SKY_BOTTOM =     ["#e8734a", "#2d8a5e", "#d4764a", "#e85a3a", "#0b1a0f"];
const ATMO_GLOW =      ["rgba(232,115,74,0.30)", "rgba(74,222,128,0.12)", "rgba(212,118,74,0.25)", "rgba(232,90,58,0.35)", "rgba(200,216,232,0.05)"];
const CELESTIAL =      ["#f5c542", "#f5e870", "#e8734a", "#d44a2e", "#c8d8e8"];
const CELESTIAL_GLOW = ["rgba(245,197,66,0.5)", "rgba(245,232,112,0.35)", "rgba(232,115,74,0.4)", "rgba(212,74,46,0.5)", "rgba(200,216,232,0.15)"];
const CANOPY_LIGHT =   ["#1a4a20", "#2a6a30", "#1e4420", "#142218", "#0a1a0c"];
const CANOPY_MID =     ["#143d1a", "#1e5a24", "#163318", "#0f1a10", "#060f08"];
const CANOPY_DARK =    ["#0f2a12", "#164218", "#0f2510", "#0a120a", "#040a05"];
const MOUNTAIN =       ["#0f2a12", "#1a4a20", "#12301a", "#0d1a0f", "#060f08"];
const GROUND_MG =      ["#112e14", "#163a1a", "#0f2510", "#0a140c", "#050c07"];
const GROUND_FG =      ["#0b1a0f", "#0e2a12", "#0a1a0d", "#070f08", "#040a06"];
const TRUNK =          ["#5a3a1e", "#6b4f2e", "#4a2e14", "#3a2010", "#1a1208"];

const CELESTIAL_SIZE =   [96, 64, 88, 104, 48];
const CELESTIAL_BOTTOM = [35, 68, 30, 15, 65];
const FIREFLY_OPACITY =  [0.3, 0.08, 0.6, 0.8, 1];

/* ── Tree path helpers ───────────────────────────────────────────── */

function makeCanopy(cx: number, top: number, base: number, spread: number, weight = 0.5): string {
  const h = base - top;
  const sy = top + h * weight;
  return `M${cx} ${top} C${cx} ${top + h * 0.1} ${cx - spread * 0.4} ${sy} ${cx - spread} ${base} L${cx + spread} ${base} C${cx + spread * 0.4} ${sy} ${cx} ${top + h * 0.1} ${cx} ${top} Z`;
}

function makeTrunk(cx: number, cBase: number, bottom: number, tw: number, bw: number): string {
  return `M${cx - tw} ${cBase} L${cx - bw} ${bottom} L${cx + bw} ${bottom} L${cx + tw} ${cBase} Z`;
}

/* ── Pre-computed tree data ──────────────────────────────────────── */

interface TreeCfg {
  cx: number; top: number; base: number; spread: number; weight: number;
  trunkH: number; tw: number; bw: number;
  shade: "light" | "mid" | "dark";
}

const mgTreeCfg: TreeCfg[] = [
  { cx: 70,   top: 140, base: 340, spread: 48, weight: 0.45, trunkH: 160, tw: 10, bw: 14, shade: "mid" },
  { cx: 200,  top: 160, base: 360, spread: 52, weight: 0.55, trunkH: 140, tw: 11, bw: 15, shade: "light" },
  { cx: 340,  top: 120, base: 330, spread: 44, weight: 0.40, trunkH: 170, tw: 9,  bw: 13, shade: "dark" },
  { cx: 480,  top: 170, base: 350, spread: 62, weight: 0.60, trunkH: 150, tw: 12, bw: 16, shade: "mid" },
  { cx: 620,  top: 100, base: 320, spread: 50, weight: 0.45, trunkH: 180, tw: 11, bw: 15, shade: "light" },
  { cx: 760,  top: 155, base: 345, spread: 38, weight: 0.35, trunkH: 155, tw: 8,  bw: 12, shade: "dark" },
  { cx: 900,  top: 125, base: 335, spread: 56, weight: 0.50, trunkH: 165, tw: 12, bw: 16, shade: "mid" },
  { cx: 1040, top: 145, base: 355, spread: 42, weight: 0.42, trunkH: 145, tw: 9,  bw: 13, shade: "light" },
  { cx: 1180, top: 110, base: 325, spread: 58, weight: 0.55, trunkH: 175, tw: 12, bw: 16, shade: "dark" },
  { cx: 1320, top: 165, base: 350, spread: 46, weight: 0.48, trunkH: 150, tw: 10, bw: 14, shade: "mid" },
];

const fgTreeCfg: TreeCfg[] = [
  { cx: 40,   top: 80,  base: 380, spread: 75, weight: 0.50, trunkH: 220, tw: 14, bw: 20, shade: "dark" },
  { cx: 1410, top: 60,  base: 370, spread: 80, weight: 0.45, trunkH: 230, tw: 15, bw: 22, shade: "dark" },
];

interface ComputedTree {
  outer: string;
  inner: string;
  trunk: string;
  shade: "light" | "mid" | "dark";
}

function precompute(cfgs: TreeCfg[]): ComputedTree[] {
  return cfgs.map((t) => ({
    outer: makeCanopy(t.cx, t.top, t.base, t.spread, t.weight),
    inner: makeCanopy(t.cx, t.top + 20, t.base - 15, t.spread * 0.5, t.weight * 0.9),
    trunk: makeTrunk(t.cx, t.base, t.base + t.trunkH, t.tw, t.bw),
    shade: t.shade,
  }));
}

const mgTrees = precompute(mgTreeCfg);
const fgTrees = precompute(fgTreeCfg);

/* ── Firefly configs (20) ────────────────────────────────────────── */

const fireflyConfigs = [
  { x: "15%", y: "45%", size: 3,   drift: 1 as const, dur: 4.2, glow: 3.1, delay: 0,   color: "#d4e860" },
  { x: "25%", y: "55%", size: 2.5, drift: 2 as const, dur: 5.5, glow: 4.2, delay: 0.8, color: "#b8d44f" },
  { x: "35%", y: "48%", size: 3,   drift: 3 as const, dur: 3.8, glow: 3.5, delay: 1.5, color: "#d4e860" },
  { x: "45%", y: "62%", size: 2,   drift: 1 as const, dur: 6.2, glow: 2.8, delay: 2.1, color: "#b8d44f" },
  { x: "55%", y: "50%", size: 3.5, drift: 2 as const, dur: 4.8, glow: 3.8, delay: 0.3, color: "#d4e860" },
  { x: "65%", y: "58%", size: 2.5, drift: 3 as const, dur: 5.1, glow: 4.5, delay: 1.2, color: "#b8d44f" },
  { x: "75%", y: "44%", size: 3,   drift: 1 as const, dur: 3.5, glow: 3.2, delay: 2.5, color: "#d4e860" },
  { x: "20%", y: "68%", size: 2,   drift: 2 as const, dur: 5.8, glow: 2.6, delay: 0.6, color: "#b8d44f" },
  { x: "40%", y: "72%", size: 3,   drift: 3 as const, dur: 4.5, glow: 3.9, delay: 1.8, color: "#d4e860" },
  { x: "60%", y: "65%", size: 2,   drift: 1 as const, dur: 6.5, glow: 4.1, delay: 0.9, color: "#b8d44f" },
  { x: "80%", y: "52%", size: 3,   drift: 2 as const, dur: 3.9, glow: 3.4, delay: 2.3, color: "#d4e860" },
  { x: "30%", y: "75%", size: 2.5, drift: 3 as const, dur: 5.3, glow: 2.9, delay: 1.1, color: "#b8d44f" },
  { x: "10%", y: "60%", size: 2.5, drift: 1 as const, dur: 4.0, glow: 3.3, delay: 0.4, color: "#d4e860" },
  { x: "50%", y: "42%", size: 3,   drift: 2 as const, dur: 5.0, glow: 4.0, delay: 1.6, color: "#b8d44f" },
  { x: "70%", y: "70%", size: 2,   drift: 3 as const, dur: 6.0, glow: 2.7, delay: 2.0, color: "#d4e860" },
  { x: "85%", y: "48%", size: 3.5, drift: 1 as const, dur: 3.6, glow: 3.6, delay: 0.7, color: "#b8d44f" },
  { x: "22%", y: "78%", size: 2,   drift: 2 as const, dur: 5.6, glow: 4.3, delay: 1.3, color: "#d4e860" },
  { x: "42%", y: "56%", size: 3,   drift: 3 as const, dur: 4.3, glow: 3.0, delay: 2.4, color: "#b8d44f" },
  { x: "58%", y: "74%", size: 2.5, drift: 1 as const, dur: 5.2, glow: 4.4, delay: 0.5, color: "#d4e860" },
  { x: "88%", y: "62%", size: 3,   drift: 2 as const, dur: 4.6, glow: 3.7, delay: 1.9, color: "#b8d44f" },
];

/* ── Underbrush leaf config ──────────────────────────────────────── */

interface FrameLeaf {
  top?: string; bottom?: string; left?: string; right?: string;
  width: number; rotate: number; color: string; opacity: number;
  blur?: number; sway: 1 | 2 | 3; swayDuration: number; swayDelay: number;
  variant: 1 | 2 | 3; flipX?: boolean;
}

const frameLeaves: FrameLeaf[] = [
  { top: "-8%", left: "-4%",   width: 320, rotate: 25,   color: "#1a3d1c", opacity: 0.7,  sway: 1, swayDuration: 8,  swayDelay: 0,   variant: 1 },
  { top: "-3%", left: "4%",    width: 240, rotate: 45,   color: "#2a5a2d", opacity: 0.5,  sway: 2, swayDuration: 10, swayDelay: 1.2, variant: 2, blur: 1 },
  { top: "5%",  left: "-6%",   width: 200, rotate: 10,   color: "#1e4d1f", opacity: 0.6,  sway: 3, swayDuration: 9,  swayDelay: 0.5, variant: 3 },
  { top: "-6%", right: "-3%",  width: 300, rotate: -30,  color: "#1a3d1c", opacity: 0.65, sway: 2, swayDuration: 9,  swayDelay: 0.8, variant: 2, flipX: true },
  { top: "0%",  right: "5%",   width: 220, rotate: -50,  color: "#2a5a2d", opacity: 0.45, sway: 1, swayDuration: 11, swayDelay: 2,   variant: 1, blur: 1.5, flipX: true },
  { top: "8%",  right: "-5%",  width: 180, rotate: -15,  color: "#1e4d1f", opacity: 0.55, sway: 3, swayDuration: 8,  swayDelay: 1.5, variant: 3, flipX: true },
  { top: "35%", left: "-8%",   width: 260, rotate: 5,    color: "#143d18", opacity: 0.5,  sway: 1, swayDuration: 10, swayDelay: 0.3, variant: 3 },
  { top: "55%", left: "-5%",   width: 200, rotate: 20,   color: "#1e4d1f", opacity: 0.4,  sway: 2, swayDuration: 9,  swayDelay: 1.8, variant: 1, blur: 1 },
  { top: "40%", right: "-7%",  width: 240, rotate: -10,  color: "#143d18", opacity: 0.5,  sway: 3, swayDuration: 11, swayDelay: 0.6, variant: 2, flipX: true },
  { top: "60%", right: "-4%",  width: 190, rotate: -25,  color: "#1e4d1f", opacity: 0.4,  sway: 1, swayDuration: 8,  swayDelay: 2.2, variant: 3, flipX: true, blur: 1 },
  { bottom: "-5%", left: "-3%",  width: 280, rotate: 160,  color: "#0d2e10", opacity: 0.6,  sway: 2, swayDuration: 10, swayDelay: 0.4, variant: 1 },
  { bottom: "-8%", right: "-2%", width: 250, rotate: -155, color: "#0d2e10", opacity: 0.55, sway: 3, swayDuration: 9,  swayDelay: 1,   variant: 2, flipX: true },
];

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

/* ── Main component ──────────────────────────────────────────────── */

interface ForestSceneProps {
  scrollPos: MotionValue<number>;
}

export default function ForestScene({ scrollPos }: ForestSceneProps) {
  /* ── Continuous zoom (camera pushes into forest) ──────── */
  const scaleFg = useTransform(scrollPos, [0, 2], [1, 3.5]);
  const opacityFg = useTransform(scrollPos, [0, 0.8, 1.5], [1, 0.4, 0]);
  const scaleMg = useTransform(scrollPos, [0, 4], [1, 2.2]);
  const opacityMg = useTransform(scrollPos, [0, 2, 3.5], [1, 0.6, 0]);
  const scaleMt = useTransform(scrollPos, [0, 4], [1, 1.5]);
  const leafScale = useTransform(scrollPos, [0, 1.5], [1, 4]);
  const leafZoomOp = useTransform(scrollPos, [0, 0.8], [1, 0]);

  /* ── Smooth color interpolation from scrollPos ────────── */
  const skyTop = useTransform(scrollPos, P, SKY_TOP);
  const skyMid = useTransform(scrollPos, P, SKY_MID);
  const skyBottom = useTransform(scrollPos, P, SKY_BOTTOM);
  const atmoGlow = useTransform(scrollPos, P, ATMO_GLOW);
  const celestialColor = useTransform(scrollPos, P, CELESTIAL);
  const celestialGlow = useTransform(scrollPos, P, CELESTIAL_GLOW);
  const cLight = useTransform(scrollPos, P, CANOPY_LIGHT);
  const cMid = useTransform(scrollPos, P, CANOPY_MID);
  const cDark = useTransform(scrollPos, P, CANOPY_DARK);
  const mountainColor = useTransform(scrollPos, P, MOUNTAIN);
  const groundMg = useTransform(scrollPos, P, GROUND_MG);
  const groundFg = useTransform(scrollPos, P, GROUND_FG);
  const trunkColor = useTransform(scrollPos, P, TRUNK);

  const celestialSize = useTransform(scrollPos, P, CELESTIAL_SIZE);
  const celestialBottomNum = useTransform(scrollPos, P, CELESTIAL_BOTTOM);
  const celestialBottom = useMotionTemplate`${celestialBottomNum}%`;
  const fireflyOp = useTransform(scrollPos, P, FIREFLY_OPACITY);

  // Leaves fade away as camera pushes past them
  const combinedLeafOp = leafZoomOp;

  /* ── Gradient templates ───────────────────────────────── */
  const skyGrad = useMotionTemplate`linear-gradient(to bottom, ${skyTop}, ${skyMid}, ${skyBottom})`;
  const atmoGrad = useMotionTemplate`radial-gradient(ellipse 120% 40% at 50% 75%, ${atmoGlow} 0%, transparent 70%)`;
  const celestialGlowBg = useMotionTemplate`radial-gradient(circle, ${celestialGlow} 0%, transparent 70%)`;
  const celestialShadow = useMotionTemplate`0 0 80px ${celestialGlow}, 0 0 160px ${celestialGlow}`;
  const fogGrad = useMotionTemplate`linear-gradient(to top, ${groundFg}, transparent)`;

  /* ── Canopy color picker ──────────────────────────────── */
  function fillFor(shade: "light" | "mid" | "dark") {
    return shade === "light" ? cLight : shade === "mid" ? cMid : cDark;
  }
  function innerFillFor(shade: "light" | "mid" | "dark") {
    return shade === "dark" ? cMid : cLight;
  }

  /* ── Render tree set ──────────────────────────────────── */
  function renderTrees(trees: ComputedTree[], prefix: string) {
    return trees.map((t, i) => (
      <React.Fragment key={`${prefix}-${i}`}>
        <motion.path d={t.trunk} style={{ fill: trunkColor }} />
        <motion.path d={t.outer} style={{ fill: fillFor(t.shade) }} />
        <motion.path d={t.inner} style={{ fill: innerFillFor(t.shade) }} opacity={0.45} />
      </React.Fragment>
    ));
  }

  return (
    <div className="fixed inset-0 overflow-hidden" aria-hidden="true">
      {/* ── Sky gradient ─────────────────────────────────── */}
      <motion.div className="absolute inset-0" style={{ background: skyGrad }} />

      {/* ── Atmosphere glow ──────────────────────────────── */}
      <motion.div className="absolute inset-0" style={{ background: atmoGrad }} />

      {/* ── Celestial body (sun/moon) ────────────────────── */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2"
        style={{ bottom: celestialBottom }}
      >
        <div className="relative">
          <motion.div
            className="absolute -inset-32 rounded-full"
            style={{ background: celestialGlowBg }}
          />
          <motion.div
            className="rounded-full"
            style={{
              width: celestialSize,
              height: celestialSize,
              backgroundColor: celestialColor,
              boxShadow: celestialShadow,
            }}
          />
        </div>
      </motion.div>

      {/* ── Mountains ────────────────────────────────────── */}
      <motion.div style={{ scale: scaleMt }} className="absolute inset-0 origin-bottom">
        <svg
          viewBox="0 0 1440 400"
          className="absolute bottom-0 w-full h-[60%] min-h-[250px]"
          preserveAspectRatio="xMidYMax slice"
          fill="none"
        >
          <motion.path
            d="M0 400 L0 280 Q120 200 240 260 Q360 180 480 240 Q600 160 720 220 Q840 140 960 200 Q1080 160 1200 230 Q1320 190 1440 250 L1440 400 Z"
            style={{ fill: mountainColor }}
          />
        </svg>
      </motion.div>

      {/* ── Mid-ground trees ─────────────────────────────── */}
      <motion.div style={{ scale: scaleMg, opacity: opacityMg }} className="absolute inset-0 origin-bottom">
        <svg
          viewBox="0 0 1440 500"
          className="absolute bottom-0 w-full h-[70%] min-h-[300px]"
          preserveAspectRatio="xMidYMax slice"
          fill="none"
        >
          {renderTrees(mgTrees, "mg")}
          <motion.rect x="0" y="420" width="1440" height="80" style={{ fill: groundMg }} />
        </svg>
      </motion.div>

      {/* ── Fireflies ────────────────────────────────────── */}
      <motion.div className="absolute inset-0 pointer-events-none" style={{ opacity: fireflyOp }}>
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

      {/* ── Foreground trees ─────────────────────────────── */}
      <motion.div style={{ scale: scaleFg, opacity: opacityFg }} className="absolute inset-0 origin-bottom">
        <svg
          viewBox="0 0 1440 600"
          className="absolute bottom-0 w-full h-[65%] min-h-[280px]"
          preserveAspectRatio="xMidYMax slice"
          fill="none"
        >
          {renderTrees(fgTrees, "fg")}
          <motion.rect x="0" y="520" width="1440" height="80" style={{ fill: groundFg }} />
        </svg>
      </motion.div>

      {/* ── Underbrush leaves (Dawn, fades with scroll) ──── */}
      <motion.div
        style={{ scale: leafScale, opacity: combinedLeafOp }}
        className="absolute inset-0 pointer-events-none origin-bottom"
      >
        {frameLeaves.map((leaf, i) => {
          const shape = leafPaths[leaf.variant];
          return (
            <div
              key={i}
              className="absolute"
              style={{
                top: leaf.top, bottom: leaf.bottom,
                left: leaf.left, right: leaf.right,
                width: leaf.width, height: leaf.width,
                opacity: leaf.opacity,
              }}
            >
              <div
                style={{
                  width: "100%", height: "100%",
                  animation: `leaf-sway-${leaf.sway} ${leaf.swayDuration}s ease-in-out ${leaf.swayDelay}s infinite`,
                  transformOrigin: "top center",
                }}
              >
                <div
                  style={{
                    width: "100%", height: "100%",
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
            </div>
          );
        })}
      </motion.div>

      {/* ── Ground fog ───────────────────────────────────── */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-40"
        style={{ background: fogGrad }}
      />
    </div>
  );
}
