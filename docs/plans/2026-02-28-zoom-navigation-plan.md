# Zoom-Based Forest Navigation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the portfolio from vertical scrolling to a zoom-based navigation experience where scrolling zooms through a continuous forest that shifts through five times of day (Dawn→Night), with mandatory snap between 5 sections.

**Architecture:** A fixed-position `ForestScene` background accepts a `page` number (0-4) and a `zoomPhase` MotionValue to render time-of-day themed forests with zoom transitions. A `ZoomNavigator` component intercepts wheel/touch/keyboard input, manages page state, and orchestrates Framer Motion animations. Section content renders as fixed overlays with `AnimatePresence` crossfade. A shared React Context allows the Navbar to trigger page jumps.

**Tech Stack:** Next.js 16, React 19, Framer Motion 12, Tailwind CSS v4

---

### Task 1: Rewrite ForestScene as a Controlled, Time-of-Day Component

**Files:**
- Rewrite: `src/components/ForestScene.tsx`

**Context:** ForestScene currently uses `useScroll`/`useTransform` internally to drive parallax and zoom. We're converting it to a controlled component that receives `page` (0-4) and `zoomPhase` (MotionValue) as props. All colors/positions are determined by `page` with CSS transitions for smooth shifts. The zoom effect during transitions is driven by `zoomPhase`.

**Step 1: Write the complete new ForestScene.tsx**

Replace the entire file with:

```tsx
"use client";

import { motion, MotionValue, useTransform } from "framer-motion";

/* ── Time-of-day theme definitions ───────────────────────── */

interface TimeTheme {
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  atmosphereGlow: string;
  celestialColor: string;
  celestialGlow: string;
  celestialSize: number;
  celestialBottom: string;
  isMoon: boolean;
  canopyLight: string;
  canopyMid: string;
  canopyDark: string;
  mountainColor: string;
  groundColorMg: string;
  groundColorFg: string;
  trunkColor: string;
  fireflyOpacity: number;
  showLeaves: boolean;
}

const themes: TimeTheme[] = [
  {
    // 0 — Dawn
    skyTop: "#1a0a2e",
    skyMid: "#3d1f5c",
    skyBottom: "#e8734a",
    atmosphereGlow: "rgba(232,115,74,0.3)",
    celestialColor: "#f5c542",
    celestialGlow: "rgba(245,197,66,0.5)",
    celestialSize: 96,
    celestialBottom: "35%",
    isMoon: false,
    canopyLight: "#1a4a20",
    canopyMid: "#143d1a",
    canopyDark: "#0f2a12",
    mountainColor: "#0f2a12",
    groundColorMg: "#112e14",
    groundColorFg: "#0b1a0f",
    trunkColor: "#5a3a1e",
    fireflyOpacity: 0.3,
    showLeaves: true,
  },
  {
    // 1 — Noon
    skyTop: "#0a4a30",
    skyMid: "#1a6b4a",
    skyBottom: "#2d8a5e",
    atmosphereGlow: "rgba(74,222,128,0.12)",
    celestialColor: "#f5e870",
    celestialGlow: "rgba(245,232,112,0.35)",
    celestialSize: 64,
    celestialBottom: "68%",
    isMoon: false,
    canopyLight: "#2a6a30",
    canopyMid: "#1e5a24",
    canopyDark: "#164218",
    mountainColor: "#1a4a20",
    groundColorMg: "#163a1a",
    groundColorFg: "#0e2a12",
    trunkColor: "#6b4f2e",
    fireflyOpacity: 0.08,
    showLeaves: false,
  },
  {
    // 2 — Dusk
    skyTop: "#2e1a3d",
    skyMid: "#8b4a6b",
    skyBottom: "#d4764a",
    atmosphereGlow: "rgba(212,118,74,0.25)",
    celestialColor: "#e8734a",
    celestialGlow: "rgba(232,115,74,0.4)",
    celestialSize: 88,
    celestialBottom: "30%",
    isMoon: false,
    canopyLight: "#1e4420",
    canopyMid: "#163318",
    canopyDark: "#0f2510",
    mountainColor: "#12301a",
    groundColorMg: "#0f2510",
    groundColorFg: "#0a1a0d",
    trunkColor: "#4a2e14",
    fireflyOpacity: 0.6,
    showLeaves: false,
  },
  {
    // 3 — Sunset
    skyTop: "#1a0a1e",
    skyMid: "#6b2a3d",
    skyBottom: "#e85a3a",
    atmosphereGlow: "rgba(232,90,58,0.35)",
    celestialColor: "#d44a2e",
    celestialGlow: "rgba(212,74,46,0.5)",
    celestialSize: 104,
    celestialBottom: "15%",
    isMoon: false,
    canopyLight: "#142218",
    canopyMid: "#0f1a10",
    canopyDark: "#0a120a",
    mountainColor: "#0d1a0f",
    groundColorMg: "#0a140c",
    groundColorFg: "#070f08",
    trunkColor: "#3a2010",
    fireflyOpacity: 0.8,
    showLeaves: false,
  },
  {
    // 4 — Night
    skyTop: "#050a0f",
    skyMid: "#0a1a12",
    skyBottom: "#0b1a0f",
    atmosphereGlow: "rgba(200,216,232,0.05)",
    celestialColor: "#c8d8e8",
    celestialGlow: "rgba(200,216,232,0.15)",
    celestialSize: 48,
    celestialBottom: "65%",
    isMoon: true,
    canopyLight: "#0a1a0c",
    canopyMid: "#060f08",
    canopyDark: "#040a05",
    mountainColor: "#060f08",
    groundColorMg: "#050c07",
    groundColorFg: "#040a06",
    trunkColor: "#1a1208",
    fireflyOpacity: 1,
    showLeaves: false,
  },
];

/* ── Tree data: canopy paths + trunk positions ───────────── */

interface TreeDef {
  canopy: string;
  trunkX: number;
  trunkY: number;
  trunkW: number;
  trunkH: number;
  shade: "light" | "mid" | "dark";
}

const midGroundTrees: TreeDef[] = [
  { canopy: "M60 320 L100 240 L80 240 L110 180 L90 180 L120 120 L150 180 L130 180 L160 240 L140 240 L180 320 Z", trunkX: 100, trunkY: 320, trunkW: 40, trunkH: 180, shade: "mid" },
  { canopy: "M180 350 L220 280 L200 280 L230 220 L210 220 L240 160 L270 220 L250 220 L280 280 L260 280 L300 350 Z", trunkX: 220, trunkY: 350, trunkW: 40, trunkH: 150, shade: "light" },
  { canopy: "M375 300 L420 220 L395 220 L440 150 L415 150 L450 90 L485 150 L460 150 L505 220 L480 220 L525 300 Z", trunkX: 430, trunkY: 300, trunkW: 40, trunkH: 200, shade: "mid" },
  { canopy: "M500 340 L540 270 L520 270 L555 210 L535 210 L565 150 L595 210 L575 210 L610 270 L590 270 L630 340 Z", trunkX: 545, trunkY: 340, trunkW: 40, trunkH: 160, shade: "light" },
  { canopy: "M660 310 L700 240 L680 240 L720 170 L700 170 L730 100 L760 170 L740 170 L780 240 L760 240 L800 310 Z", trunkX: 710, trunkY: 310, trunkW: 40, trunkH: 190, shade: "dark" },
  { canopy: "M860 330 L900 260 L880 260 L920 190 L900 190 L935 120 L970 190 L950 190 L990 260 L970 260 L1010 330 Z", trunkX: 915, trunkY: 330, trunkW: 40, trunkH: 170, shade: "mid" },
  { canopy: "M1000 350 L1040 280 L1020 280 L1060 210 L1040 210 L1075 140 L1110 210 L1090 210 L1130 280 L1110 280 L1150 350 Z", trunkX: 1055, trunkY: 350, trunkW: 40, trunkH: 150, shade: "light" },
  { canopy: "M1230 310 L1270 230 L1250 230 L1290 160 L1270 160 L1305 100 L1340 160 L1320 160 L1360 230 L1340 230 L1380 310 Z", trunkX: 1285, trunkY: 310, trunkW: 40, trunkH: 190, shade: "dark" },
];

const foregroundTrees: TreeDef[] = [
  { canopy: "M-50 350 L10 260 L-20 260 L30 180 L0 180 L50 100 L100 180 L70 180 L120 260 L90 260 L150 350 Z", trunkX: 30, trunkY: 350, trunkW: 44, trunkH: 250, shade: "dark" },
  { canopy: "M1290 340 L1340 250 L1310 250 L1360 170 L1330 170 L1380 90 L1430 170 L1400 170 L1450 250 L1420 250 L1470 340 Z", trunkX: 1360, trunkY: 340, trunkW: 44, trunkH: 260, shade: "dark" },
];

/* ── Firefly config (20 fireflies) ───────────────────────── */

const fireflyConfigs = [
  { x: "12%", y: "42%", size: 3,   drift: 1, dur: 4.2, glow: 3.1, delay: 0,   color: "#d4e860" },
  { x: "22%", y: "55%", size: 2.5, drift: 2, dur: 5.5, glow: 4.2, delay: 0.8, color: "#b8d44f" },
  { x: "32%", y: "48%", size: 3,   drift: 3, dur: 3.8, glow: 3.5, delay: 1.5, color: "#d4e860" },
  { x: "42%", y: "62%", size: 2,   drift: 1, dur: 6.2, glow: 2.8, delay: 2.1, color: "#b8d44f" },
  { x: "52%", y: "50%", size: 3.5, drift: 2, dur: 4.8, glow: 3.8, delay: 0.3, color: "#d4e860" },
  { x: "62%", y: "58%", size: 2.5, drift: 3, dur: 5.1, glow: 4.5, delay: 1.2, color: "#b8d44f" },
  { x: "72%", y: "44%", size: 3,   drift: 1, dur: 3.5, glow: 3.2, delay: 2.5, color: "#d4e860" },
  { x: "18%", y: "68%", size: 2,   drift: 2, dur: 5.8, glow: 2.6, delay: 0.6, color: "#b8d44f" },
  { x: "38%", y: "72%", size: 3,   drift: 3, dur: 4.5, glow: 3.9, delay: 1.8, color: "#d4e860" },
  { x: "58%", y: "65%", size: 2,   drift: 1, dur: 6.5, glow: 4.1, delay: 0.9, color: "#b8d44f" },
  { x: "78%", y: "52%", size: 3,   drift: 2, dur: 3.9, glow: 3.4, delay: 2.3, color: "#d4e860" },
  { x: "28%", y: "75%", size: 2.5, drift: 3, dur: 5.3, glow: 2.9, delay: 1.1, color: "#b8d44f" },
  { x: "8%",  y: "58%", size: 2,   drift: 1, dur: 4.0, glow: 3.0, delay: 0.4, color: "#d4e860" },
  { x: "48%", y: "40%", size: 3,   drift: 2, dur: 5.0, glow: 3.6, delay: 1.6, color: "#b8d44f" },
  { x: "85%", y: "46%", size: 2.5, drift: 3, dur: 4.3, glow: 4.0, delay: 2.0, color: "#d4e860" },
  { x: "15%", y: "78%", size: 3.5, drift: 1, dur: 5.6, glow: 3.3, delay: 0.2, color: "#b8d44f" },
  { x: "68%", y: "70%", size: 2,   drift: 2, dur: 6.0, glow: 2.7, delay: 1.4, color: "#d4e860" },
  { x: "88%", y: "60%", size: 3,   drift: 3, dur: 4.6, glow: 3.7, delay: 2.4, color: "#b8d44f" },
  { x: "5%",  y: "50%", size: 2.5, drift: 1, dur: 5.2, glow: 4.3, delay: 0.7, color: "#d4e860" },
  { x: "92%", y: "55%", size: 2,   drift: 2, dur: 3.7, glow: 3.1, delay: 1.9, color: "#b8d44f" },
];

/* ── Underbrush frame leaf config (kept from before) ─────── */

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

/* ── ForestScene component ───────────────────────────────── */

interface ForestSceneProps {
  page: number;
  zoomPhase: MotionValue<number>;
}

export default function ForestScene({ page, zoomPhase }: ForestSceneProps) {
  const theme = themes[page] ?? themes[0];
  const t = "all 900ms cubic-bezier(0.4, 0, 0.2, 1)";

  // Zoom-phase scales per depth layer
  const fgScale = useTransform(zoomPhase, [0, 1], [1, 2.5]);
  const fgOpacity = useTransform(zoomPhase, [0, 0.4, 1], [1, 0.3, 0]);
  const mgScale = useTransform(zoomPhase, [0, 1], [1, 1.6]);
  const mgOpacity = useTransform(zoomPhase, [0, 0.5, 1], [1, 0.5, 0]);
  const mtScale = useTransform(zoomPhase, [0, 1], [1, 1.15]);
  const leafScale = useTransform(zoomPhase, [0, 1], [1, 3.5]);
  const leafOpacity = useTransform(zoomPhase, [0, 0.3], [1, 0]);

  const shadeColor = (shade: "light" | "mid" | "dark") =>
    shade === "light" ? theme.canopyLight : shade === "mid" ? theme.canopyMid : theme.canopyDark;

  return (
    <div className="fixed inset-0 overflow-hidden" aria-hidden="true">
      {/* ── Sky gradient ─────────────────────────────────────── */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to bottom, ${theme.skyTop}, ${theme.skyMid}, ${theme.skyBottom})`,
          transition: t,
        }}
      />

      {/* ── Atmosphere glow ──────────────────────────────────── */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 120% 40% at 50% 75%, ${theme.atmosphereGlow} 0%, transparent 70%)`,
          transition: t,
        }}
      />

      {/* ── Sun / Moon ───────────────────────────────────────── */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{ bottom: theme.celestialBottom, transition: t }}
      >
        <div className="relative">
          <div
            className="absolute -inset-24 rounded-full"
            style={{
              background: `radial-gradient(circle, ${theme.celestialGlow} 0%, ${theme.celestialGlow}40 30%, transparent 60%)`,
              transition: t,
            }}
          />
          <div
            className="rounded-full"
            style={{
              width: theme.celestialSize,
              height: theme.celestialSize,
              background: theme.isMoon
                ? `radial-gradient(circle at 35% 35%, ${theme.celestialColor}, ${theme.celestialColor}80 70%, transparent)`
                : `radial-gradient(circle at 40% 40%, ${theme.celestialColor}, ${theme.celestialColor}90 50%, ${theme.celestialColor}60)`,
              boxShadow: `0 0 60px ${theme.celestialGlow}, 0 0 120px ${theme.celestialGlow}80`,
              transition: t,
            }}
          />
        </div>
      </div>

      {/* ── Mountains ────────────────────────────────────────── */}
      <motion.div style={{ scale: mtScale }} className="absolute inset-0 origin-bottom">
        <svg viewBox="0 0 1440 400" className="absolute bottom-0 w-full h-[60%] min-h-[250px]" preserveAspectRatio="xMidYMax slice">
          <path
            d="M0 400 L0 280 Q120 200 240 260 Q360 180 480 240 Q600 160 720 220 Q840 140 960 200 Q1080 160 1200 230 Q1320 190 1440 250 L1440 400 Z"
            style={{ fill: theme.mountainColor, transition: t }}
          />
        </svg>
      </motion.div>

      {/* ── Mid-ground trees ─────────────────────────────────── */}
      <motion.div style={{ scale: mgScale, opacity: mgOpacity }} className="absolute inset-0 origin-bottom">
        <svg viewBox="0 0 1440 500" className="absolute bottom-0 w-full h-[70%] min-h-[300px]" preserveAspectRatio="xMidYMax slice">
          {midGroundTrees.map((tree, i) => (
            <g key={i}>
              <rect
                x={tree.trunkX}
                y={tree.trunkY}
                width={tree.trunkW}
                height={tree.trunkH}
                rx={4}
                style={{ fill: theme.trunkColor, transition: t }}
              />
              <path d={tree.canopy} style={{ fill: shadeColor(tree.shade), transition: t }} />
            </g>
          ))}
          <rect x="0" y="420" width="1440" height="80" style={{ fill: theme.groundColorMg, transition: t }} />
        </svg>
      </motion.div>

      {/* ── Fireflies ────────────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: theme.fireflyOpacity, transition: t }}
      >
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
      </div>

      {/* ── Foreground trees ─────────────────────────────────── */}
      <motion.div style={{ scale: fgScale, opacity: fgOpacity }} className="absolute inset-0 origin-bottom">
        <svg viewBox="0 0 1440 600" className="absolute bottom-0 w-full h-[65%] min-h-[280px]" preserveAspectRatio="xMidYMax slice">
          {foregroundTrees.map((tree, i) => (
            <g key={i}>
              <rect
                x={tree.trunkX}
                y={tree.trunkY}
                width={tree.trunkW}
                height={tree.trunkH}
                rx={4}
                style={{ fill: theme.trunkColor, transition: t }}
              />
              <path d={tree.canopy} style={{ fill: shadeColor(tree.shade), transition: t }} />
            </g>
          ))}
          <rect x="0" y="520" width="1440" height="80" style={{ fill: theme.groundColorFg, transition: t }} />
        </svg>
      </motion.div>

      {/* ── Underbrush leaves (Dawn only) ────────────────────── */}
      {theme.showLeaves && (
        <motion.div
          style={{ scale: leafScale, opacity: leafOpacity }}
          className="absolute inset-0 pointer-events-none"
        >
          {frameLeaves.map((leaf, i) => {
            const shape = leafPaths[leaf.variant];
            return (
              <div
                key={i}
                className="absolute"
                style={{
                  top: leaf.top,
                  bottom: leaf.bottom,
                  left: leaf.left,
                  right: leaf.right,
                  width: leaf.width,
                  height: leaf.width,
                  opacity: leaf.opacity,
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    animation: `leaf-sway-${leaf.sway} ${leaf.swayDuration}s ease-in-out ${leaf.swayDelay}s infinite`,
                    transformOrigin: "top center",
                  }}
                >
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
              </div>
            );
          })}
        </motion.div>
      )}

      {/* ── Ground fog ───────────────────────────────────────── */}
      <div
        className="absolute bottom-0 left-0 right-0 h-40"
        style={{
          background: `linear-gradient(to top, ${theme.groundColorFg}, ${theme.groundColorFg}cc 40%, transparent)`,
          transition: t,
        }}
      />
    </div>
  );
}
```

**Step 2: Build to verify**

Run: `npm run build`
Expected: Compiles with no errors. ForestScene now exports a component that accepts `page` and `zoomPhase` props. It is not yet used (Hero still imports it without props), so there will be a TypeScript error.

**Step 3: Temporarily update Hero.tsx for build compatibility**

In `src/components/Hero.tsx`, update the ForestScene usage to pass temporary props so the build passes:

```tsx
// At top of Hero.tsx, add:
import { useMotionValue } from "framer-motion";

// Inside Hero component, before the return:
const dummyZoom = useMotionValue(0);

// Update the ForestScene usage:
<ForestScene page={0} zoomPhase={dummyZoom} />
```

**Step 4: Build and verify**

Run: `npm run build`
Expected: Compiles with no errors.

**Step 5: Commit**

```bash
git add src/components/ForestScene.tsx src/components/Hero.tsx
git commit -m "feat: rewrite ForestScene with time-of-day theming, tree trunks, 20 fireflies"
```

---

### Task 2: Create Zoom Infrastructure (ZoomContext, ZoomNavigator, DotNav)

**Files:**
- Create: `src/components/ZoomContext.tsx`
- Create: `src/components/ZoomNavigator.tsx`
- Create: `src/components/DotNav.tsx`

**Context:** ZoomNavigator is the core scroll controller. It manages `currentPage` state, intercepts wheel/touch/keyboard events, orchestrates zoom transitions via Framer Motion, and renders ForestScene + section content overlays. ZoomContext shares page state with Navbar. DotNav provides right-edge dot navigation.

**Step 1: Create ZoomContext.tsx**

Create `src/components/ZoomContext.tsx`:

```tsx
"use client";

import { createContext, useContext } from "react";

interface ZoomContextValue {
  currentPage: number;
  goToPage: (page: number) => void;
}

export const ZoomContext = createContext<ZoomContextValue>({
  currentPage: 0,
  goToPage: () => {},
});

export function useZoom() {
  return useContext(ZoomContext);
}
```

**Step 2: Create DotNav.tsx**

Create `src/components/DotNav.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import { useZoom } from "./ZoomContext";

const PAGE_LABELS = ["Home", "About", "Experience", "Projects", "Contact"];

export default function DotNav() {
  const { currentPage, goToPage } = useZoom();

  return (
    <nav
      className="fixed right-4 top-1/2 -translate-y-1/2 z-50 flex-col gap-4 hidden md:flex"
      aria-label="Page navigation"
    >
      {PAGE_LABELS.map((label, i) => (
        <button
          key={label}
          onClick={() => goToPage(i)}
          className="group relative flex items-center justify-end"
          aria-label={`Go to ${label}`}
          aria-current={i === currentPage ? "page" : undefined}
        >
          <span className="absolute right-7 px-2 py-1 text-xs font-mono text-light bg-bg-card/90 backdrop-blur-sm rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {label}
          </span>
          <motion.div
            animate={{
              scale: i === currentPage ? 1.4 : 1,
              backgroundColor: i === currentPage ? "#4ade80" : "#6b7f6b",
            }}
            transition={{ duration: 0.3 }}
            className="w-2.5 h-2.5 rounded-full"
          />
        </button>
      ))}
    </nav>
  );
}
```

**Step 3: Create ZoomNavigator.tsx**

Create `src/components/ZoomNavigator.tsx`:

```tsx
"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, useMotionValue, animate, AnimatePresence } from "framer-motion";
import ForestScene from "./ForestScene";
import DotNav from "./DotNav";
import { ZoomContext } from "./ZoomContext";

const TOTAL_PAGES = 5;

interface ZoomNavigatorProps {
  children: React.ReactNode;
}

export default function ZoomNavigator({ children }: ZoomNavigatorProps) {
  const pages = React.Children.toArray(children);
  const [currentPage, setCurrentPage] = useState(0);
  const [visiblePage, setVisiblePage] = useState(0);
  const isAnimating = useRef(false);
  const zoomPhase = useMotionValue(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);

  const goToPage = useCallback(
    async (targetPage: number) => {
      if (isAnimating.current) return;
      if (targetPage < 0 || targetPage >= TOTAL_PAGES) return;
      if (targetPage === currentPage) return;

      isAnimating.current = true;

      // 1. Fade out current content
      setVisiblePage(-1);
      await new Promise((r) => setTimeout(r, 200));

      // 2. Start forest transition (CSS transitions on color) + zoom phase
      setCurrentPage(targetPage);
      await animate(zoomPhase, [0, 1, 0], {
        duration: 0.55,
        ease: "easeInOut",
      });

      // 3. Fade in new content
      setVisiblePage(targetPage);

      // 4. Unlock after enter animation
      setTimeout(() => {
        isAnimating.current = false;
      }, 200);
    },
    [currentPage, zoomPhase]
  );

  // ── Wheel handler ────────────────────────────────────────
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (isAnimating.current) return;

      // Check if section content is internally scrollable
      const el = contentRef.current;
      if (el) {
        const { scrollTop, scrollHeight, clientHeight } = el;
        const atTop = scrollTop <= 1;
        const atBottom = scrollTop + clientHeight >= scrollHeight - 1;
        if (e.deltaY > 0 && !atBottom) return;
        if (e.deltaY < 0 && !atTop) return;
      }

      if (e.deltaY > 0) goToPage(currentPage + 1);
      else if (e.deltaY < 0) goToPage(currentPage - 1);
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [currentPage, goToPage]);

  // ── Keyboard handler ─────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAnimating.current) return;
      switch (e.key) {
        case "ArrowDown":
        case "PageDown":
          e.preventDefault();
          goToPage(currentPage + 1);
          break;
        case " ":
          e.preventDefault();
          goToPage(e.shiftKey ? currentPage - 1 : currentPage + 1);
          break;
        case "ArrowUp":
        case "PageUp":
          e.preventDefault();
          goToPage(currentPage - 1);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, goToPage]);

  // ── Touch handler ────────────────────────────────────────
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isAnimating.current) return;
      const deltaY = touchStartY.current - e.changedTouches[0].clientY;
      if (Math.abs(deltaY) < 50) return;

      // Check scroll boundaries
      const el = contentRef.current;
      if (el) {
        const { scrollTop, scrollHeight, clientHeight } = el;
        const atTop = scrollTop <= 1;
        const atBottom = scrollTop + clientHeight >= scrollHeight - 1;
        if (deltaY > 0 && !atBottom) return;
        if (deltaY < 0 && !atTop) return;
      }

      if (deltaY > 0) goToPage(currentPage + 1);
      else goToPage(currentPage - 1);
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [currentPage, goToPage]);

  return (
    <ZoomContext.Provider value={{ currentPage, goToPage }}>
      <div className="h-screen overflow-hidden">
        <ForestScene page={currentPage} zoomPhase={zoomPhase} />

        {/* Section content overlay */}
        <AnimatePresence mode="wait">
          {visiblePage >= 0 && (
            <motion.div
              key={visiblePage}
              ref={contentRef}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-0 z-10 overflow-y-auto"
            >
              {pages[visiblePage]}
            </motion.div>
          )}
        </AnimatePresence>

        <DotNav />
      </div>
    </ZoomContext.Provider>
  );
}
```

**Step 4: Build to verify**

Run: `npm run build`
Expected: Compiles. ZoomNavigator/DotNav/ZoomContext exist but aren't wired into the app yet.

**Step 5: Commit**

```bash
git add src/components/ZoomContext.tsx src/components/ZoomNavigator.tsx src/components/DotNav.tsx
git commit -m "feat: add ZoomNavigator, DotNav, and ZoomContext for zoom-based navigation"
```

---

### Task 3: Rewrite page.tsx and Remove Section Dividers

**Files:**
- Rewrite: `src/app/page.tsx`
- Modify: `src/app/globals.css`

**Context:** page.tsx wraps all sections in ZoomNavigator (each child = one page). Remove SectionDivider. Remove `scroll-behavior: smooth` from globals.css (no scrolling). The Skills section is folded into About (Task 5) so we don't include it as a separate child.

**Step 1: Rewrite page.tsx**

Replace the entire `src/app/page.tsx` with:

```tsx
import Navbar from "@/components/Navbar";
import ZoomNavigator from "@/components/ZoomNavigator";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Experience from "@/components/Experience";
import Projects from "@/components/Projects";
import Contact from "@/components/Contact";

export default function Home() {
  return (
    <ZoomNavigator>
      <Hero />
      <About />
      <Experience />
      <Projects />
      <Contact />
    </ZoomNavigator>
  );
}
```

Note: Navbar is now rendered *inside* ZoomNavigator (it consumes ZoomContext). Move Navbar into ZoomNavigator's render, or — cleaner — have each section page render Navbar itself. **Actually, simplest approach:** Render Navbar inside ZoomNavigator. Update `src/components/ZoomNavigator.tsx` to include Navbar:

In ZoomNavigator.tsx, add at the top:
```tsx
import Navbar from "./Navbar";
```

And in the return JSX, add Navbar *inside* the ZoomContext.Provider but above the ForestScene:
```tsx
return (
  <ZoomContext.Provider value={{ currentPage, goToPage }}>
    <div className="h-screen overflow-hidden">
      <ForestScene page={currentPage} zoomPhase={zoomPhase} />
      <Navbar />
      {/* ... rest ... */}
    </div>
  </ZoomContext.Provider>
);
```

**Step 2: Update globals.css — remove scroll-behavior**

In `src/app/globals.css`, remove the `scroll-behavior: smooth` rule:

Change:
```css
html {
  scroll-behavior: smooth;
}
```
To:
```css
html {
  overflow: hidden;
}
```

**Step 3: Build to verify**

Run: `npm run build`
Expected: May have TypeScript errors from Hero.tsx still passing dummy props. That's fine — we fix Hero in the next task.

**Step 4: Commit**

```bash
git add src/app/page.tsx src/components/ZoomNavigator.tsx src/app/globals.css
git commit -m "feat: wire ZoomNavigator into page.tsx, remove scroll behavior"
```

---

### Task 4: Update Section Components for Fixed Overlay Mode

**Files:**
- Modify: `src/components/Hero.tsx`
- Modify: `src/components/About.tsx`
- Modify: `src/components/Experience.tsx`
- Modify: `src/components/Projects.tsx`
- Modify: `src/components/Contact.tsx`
- Modify: `src/components/Skills.tsx` (fold into About)

**Context:** Each section now renders as a fixed overlay on top of the forest. Remove `whileInView` animations (irrelevant — content is fixed, not scrolling into view). Replace with simple entrance animations. Add semi-transparent blurred card backdrops for readability on non-Hero sections. Fold Skills into About. Remove standalone Skills component usage.

**Step 1: Rewrite Hero.tsx**

Replace `src/components/Hero.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import { siteConfig } from "@/lib/data";

export default function Hero() {
  return (
    <section className="relative h-screen flex items-center justify-center">
      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-transparent via-transparent to-black/30 pointer-events-none" />

      <div className="relative z-10 text-center px-6">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-6xl md:text-8xl font-heading font-bold text-light"
          style={{ textShadow: "0 0 40px rgba(74, 222, 128, 0.3)" }}
        >
          {siteConfig.name}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-6 text-lg md:text-xl text-muted font-mono"
        >
          {siteConfig.tagline}
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-8 z-10 flex flex-col items-center gap-2"
      >
        <span className="text-xs font-mono text-muted">zoom</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-4 h-7 border-2 border-muted/40 rounded-full flex justify-center pt-1"
        >
          <div className="w-1 h-1.5 bg-accent rounded-full" />
        </motion.div>
      </motion.div>
    </section>
  );
}
```

Key changes: removed ForestScene import (it's now rendered by ZoomNavigator), removed `id="hero"`, changed "scroll" to "zoom", removed `overflow-hidden` (parent handles that).

**Step 2: Update About.tsx — add backdrop + fold in Skills**

Replace `src/components/About.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import ProjectMetricsCarousel from "./ProjectMetricsCarousel";
import { projectMetrics, skills } from "@/lib/data";

export default function About() {
  const categories = Object.entries(skills);

  return (
    <section className="min-h-screen flex items-center justify-center py-24 px-6">
      <div className="max-w-6xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl bg-bg-card/80 backdrop-blur-md border border-white/5 p-8 md:p-12"
        >
          <h2 className="text-sm font-mono text-accent mb-4">01 / About</h2>

          <div className="grid md:grid-cols-2 gap-16 items-start">
            <div>
              <p className="text-xl md:text-2xl font-heading text-light leading-relaxed">
                I&apos;m a computer science and mathematics student at{" "}
                <span className="text-accent">Case Western Reserve University</span>{" "}
                who builds things at the intersection of quantitative systems, AI infrastructure, and startups.
              </p>
              <p className="mt-6 text-muted leading-relaxed">
                Currently co-founding Darch AI, where I architect high-throughput media pipelines
                serving 20M+ monthly impressions. Previously built AI tools at NIST. On the side,
                I run automated trading systems on prediction markets — reaching the top 100 on
                Kalshi&apos;s all-time crypto leaderboard.
              </p>
            </div>

            <ProjectMetricsCarousel projects={projectMetrics} />
          </div>

          {/* Skills (folded in) */}
          <div className="mt-12 pt-8 border-t border-white/5">
            <h3 className="text-sm font-mono text-accent mb-6">Skills</h3>
            <div className="space-y-6">
              {categories.map(([category, items]) => (
                <div key={category}>
                  <h4 className="text-xs font-mono text-muted uppercase tracking-wider mb-3">
                    {category}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {items.map((skill) => (
                      <span
                        key={skill}
                        className="px-3 py-1.5 text-sm font-mono text-light/80 bg-bg/50 rounded-lg border border-white/5 hover:border-accent/40 hover:text-accent transition-all cursor-default"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
```

Key changes: removed `whileInView` (use `animate` instead), wrapped in blurred card, folded Skills in, removed `id="about"`.

**Step 3: Update Experience.tsx**

Replace `src/components/Experience.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import { experience } from "@/lib/data";

export default function Experience() {
  return (
    <section className="min-h-screen flex items-center justify-center py-24 px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto w-full rounded-2xl bg-bg-card/80 backdrop-blur-md border border-white/5 p-8 md:p-12"
      >
        <h2 className="text-sm font-mono text-accent mb-12">02 / Experience</h2>

        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-trunk/60 via-trunk/30 to-transparent" />

          {experience.map((exp, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: i * 0.15 }}
              className="relative pl-12 pb-16 last:pb-0 group"
            >
              <div className="absolute left-[9px] top-1.5 w-3 h-3 rounded-full border-2 border-trunk bg-bg-card group-hover:bg-accent transition-colors duration-300" />

              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                <div>
                  <h3 className="text-xl font-heading font-bold text-light">{exp.company}</h3>
                  <p className="text-muted text-sm italic">{exp.role}</p>
                </div>
                <div className="text-sm font-mono text-muted whitespace-nowrap">{exp.dates}</div>
              </div>

              <p className="text-xs font-mono text-muted/60 mt-1">{exp.location}</p>

              <ul className="mt-4 space-y-2">
                {exp.bullets.map((bullet, j) => (
                  <li key={j} className="text-sm text-muted leading-relaxed flex gap-2">
                    <span className="text-accent mt-1 shrink-0">&#9657;</span>
                    {bullet}
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap gap-2 mt-4">
                {exp.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 text-xs font-mono text-accent/80 bg-accent/10 rounded border border-accent/20"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
```

Key changes: removed `whileInView` → `animate`, wrapped in blurred card, removed `id`, centered vertically.

**Step 4: Update Projects.tsx**

Replace `src/components/Projects.tsx`:

```tsx
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
```

Key changes: same pattern — blurred card wrapper, `animate` instead of `whileInView`, project cards use `bg-bg/50`.

**Step 5: Update Contact.tsx**

Replace `src/components/Contact.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import { FiGithub, FiLinkedin, FiMail } from "react-icons/fi";
import { siteConfig } from "@/lib/data";

const links = [
  { icon: FiMail, href: `mailto:${siteConfig.email}`, label: "Email" },
  { icon: FiLinkedin, href: siteConfig.linkedin, label: "LinkedIn" },
  { icon: FiGithub, href: siteConfig.github, label: "GitHub" },
];

export default function Contact() {
  return (
    <section className="min-h-screen flex items-center justify-center py-24 px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl mx-auto w-full text-center rounded-2xl bg-bg-card/80 backdrop-blur-md border border-white/5 p-8 md:p-12"
      >
        <h2 className="text-sm font-mono text-accent mb-6">04 / Contact</h2>

        <h3 className="text-4xl md:text-5xl font-heading font-bold text-light">
          Let&apos;s build something.
        </h3>

        <p className="mt-4 text-muted">
          Always interested in new opportunities, collaborations, and interesting problems.
        </p>

        <motion.a
          href={`mailto:${siteConfig.email}`}
          whileHover={{ scale: 1.05 }}
          className="inline-block mt-8 px-8 py-3 font-mono text-sm text-accent border border-accent rounded-lg hover:bg-accent/10 transition-colors"
        >
          {siteConfig.email}<span className="animate-blink ml-0.5">▌</span>
        </motion.a>

        <div className="flex justify-center gap-6 mt-10">
          {links.map(({ icon: Icon, href, label }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-accent transition-colors hover:scale-110 transform"
              aria-label={label}
            >
              <Icon size={22} />
            </a>
          ))}
        </div>

        <p className="mt-16 text-xs font-mono text-muted/40">
          Designed &amp; built by Ethan Wang
        </p>
      </motion.div>
    </section>
  );
}
```

Key changes: blurred card, `animate` instead of `whileInView`, section numbers updated (04 instead of 05, since Skills is folded in), removed `id`.

**Step 6: Update ProjectMetricsCarousel.tsx — remove whileInView**

In `src/components/ProjectMetricsCarousel.tsx`, change the outer `motion.div`:

From:
```tsx
<motion.div
  initial={{ opacity: 0, x: 30 }}
  whileInView={{ opacity: 1, x: 0 }}
  viewport={{ once: true }}
  transition={{ duration: 0.6 }}
  className="flex flex-col items-center gap-6"
>
```

To:
```tsx
<motion.div
  initial={{ opacity: 0, x: 30 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ duration: 0.6 }}
  className="flex flex-col items-center gap-6"
>
```

**Step 7: Update AnimatedCounter.tsx — remove whileInView**

In `src/components/AnimatedCounter.tsx`, change the outer `motion.div`:

From:
```tsx
<motion.div
  ref={ref}
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: "-100px" }}
  transition={{ duration: 0.5 }}
  className="text-center"
>
```

To:
```tsx
<motion.div
  ref={ref}
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
  className="text-center"
>
```

Also change the `useInView` to trigger immediately since there's no scrolling:

From:
```tsx
const isInView = useInView(ref, { once: true, margin: "-100px" });
```

To:
```tsx
const isInView = useInView(ref, { once: true });
```

**Step 8: Build to verify**

Run: `npm run build`
Expected: Compiles with no errors. All sections updated.

**Step 9: Commit**

```bash
git add src/components/Hero.tsx src/components/About.tsx src/components/Experience.tsx src/components/Projects.tsx src/components/Contact.tsx src/components/ProjectMetricsCarousel.tsx src/components/AnimatedCounter.tsx
git commit -m "feat: update all sections for fixed overlay mode with blurred card backdrops"
```

---

### Task 5: Update Navbar for Zoom Navigation

**Files:**
- Modify: `src/components/Navbar.tsx`

**Context:** Navbar currently uses `<a href="#section">` for scroll-based navigation and listens to `window.scrollY` for background opacity. Replace with zoom context consumption: `useZoom()` for `goToPage()`, and determine background based on `currentPage`.

**Step 1: Rewrite Navbar.tsx**

Replace `src/components/Navbar.tsx`:

```tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiGithub, FiMenu, FiX } from "react-icons/fi";
import { siteConfig } from "@/lib/data";
import { useZoom } from "./ZoomContext";

const navLinks = [
  { label: "About", page: 1 },
  { label: "Experience", page: 2 },
  { label: "Projects", page: 3 },
  { label: "Contact", page: 4 },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { currentPage, goToPage } = useZoom();
  const showBg = currentPage > 0 || mobileOpen;

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        showBg
          ? "bg-bg/80 backdrop-blur-md border-b border-white/5"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => goToPage(0)}
          className="font-heading font-bold text-lg text-light hover:text-accent transition-colors"
        >
          EW
        </button>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <button
              key={link.page}
              onClick={() => goToPage(link.page)}
              className={`font-mono text-sm transition-colors ${
                currentPage === link.page
                  ? "text-accent"
                  : "text-muted hover:text-accent"
              }`}
            >
              {link.label}
            </button>
          ))}
          <a
            href={siteConfig.github}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted hover:text-accent transition-colors"
          >
            <FiGithub size={18} />
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-muted hover:text-accent transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <FiX size={22} /> : <FiMenu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden overflow-hidden bg-bg/95 backdrop-blur-md border-b border-white/5"
          >
            <div className="flex flex-col items-center gap-6 py-6">
              {navLinks.map((link) => (
                <button
                  key={link.page}
                  onClick={() => {
                    goToPage(link.page);
                    setMobileOpen(false);
                  }}
                  className={`font-mono text-sm transition-colors ${
                    currentPage === link.page
                      ? "text-accent"
                      : "text-muted hover:text-accent"
                  }`}
                >
                  {link.label}
                </button>
              ))}
              <a
                href={siteConfig.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted hover:text-accent transition-colors"
              >
                <FiGithub size={18} />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
```

Key changes: replaced `<a href>` with `<button onClick>`, removed scroll listener, uses `useZoom()` for navigation, active link highlighting via `currentPage`, background shown on non-Hero pages.

**Step 2: Build to verify**

Run: `npm run build`
Expected: Compiles with no errors.

**Step 3: Commit**

```bash
git add src/components/Navbar.tsx
git commit -m "feat: update Navbar to use zoom navigation context"
```

---

### Task 6: Clean Up and Final Verification

**Files:**
- Delete: `src/components/Skills.tsx` (folded into About)
- Verify: all imports, no unused files

**Step 1: Delete Skills.tsx**

Skills is now folded into About.tsx. Delete the standalone file:

```bash
rm src/components/Skills.tsx
```

**Step 2: Verify no remaining imports of Skills**

Search for any remaining `import` of Skills in the codebase. If `page.tsx` previously imported it, that import was already removed in Task 3.

**Step 3: Full build**

Run: `npm run build`
Expected: Clean build, zero errors.

**Step 4: Visual verification**

Run: `npm run dev`

Verify:
- Page loads showing Dawn forest (warm orange/indigo sky, golden sun, green trees with brown trunks, faint fireflies, underbrush leaves framing viewport)
- Hero text visible with "zoom" indicator at bottom
- Scroll down → dramatic zoom transition → Noon forest (green sky, bright sun high up, vivid tree greens, more fireflies dim) with About content on blurred card
- Continue scrolling → Dusk (purple/orange sky, orange sun mid-low) with Experience timeline
- Continue → Sunset (dark purple/red sky, red sun at horizon) with Projects
- Continue → Night (near-black sky, pale moon, bright fireflies) with Contact
- Dot navigation on right edge works (clicking jumps to page, active dot highlighted green)
- Navbar links work (clicking jumps to correct page, active state highlighted)
- Keyboard navigation works (ArrowDown/Up, Space, PageDown/Up)
- Mobile: touch swipe triggers page changes, hamburger menu works
- If section content overflows viewport, internal scroll works, page change only triggers at boundaries

**Step 5: Commit**

```bash
git rm src/components/Skills.tsx
git commit -m "chore: remove standalone Skills component (folded into About)"
```

**Step 6: Push**

```bash
git push
```
