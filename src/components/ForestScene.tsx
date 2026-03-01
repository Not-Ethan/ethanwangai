"use client";

import { motion, useTransform, type MotionValue } from "framer-motion";

/* ── TimeTheme interface ──────────────────────────────────────── */

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

/* ── 5 theme definitions ──────────────────────────────────────── */

const themes: TimeTheme[] = [
  // Dawn (0)
  {
    skyTop: "#1a0a2e", skyMid: "#3d1f5c", skyBottom: "#e8734a",
    atmosphereGlow: "rgba(232,115,74,0.3)",
    celestialColor: "#f5c542", celestialGlow: "rgba(245,197,66,0.5)",
    celestialSize: 96, celestialBottom: "35%", isMoon: false,
    canopyLight: "#1a4a20", canopyMid: "#143d1a", canopyDark: "#0f2a12",
    mountainColor: "#0f2a12", groundColorMg: "#112e14", groundColorFg: "#0b1a0f",
    trunkColor: "#5a3a1e", fireflyOpacity: 0.3, showLeaves: true,
  },
  // Noon (1)
  {
    skyTop: "#0a4a30", skyMid: "#1a6b4a", skyBottom: "#2d8a5e",
    atmosphereGlow: "rgba(74,222,128,0.12)",
    celestialColor: "#f5e870", celestialGlow: "rgba(245,232,112,0.35)",
    celestialSize: 64, celestialBottom: "68%", isMoon: false,
    canopyLight: "#2a6a30", canopyMid: "#1e5a24", canopyDark: "#164218",
    mountainColor: "#1a4a20", groundColorMg: "#163a1a", groundColorFg: "#0e2a12",
    trunkColor: "#6b4f2e", fireflyOpacity: 0.08, showLeaves: false,
  },
  // Dusk (2)
  {
    skyTop: "#2e1a3d", skyMid: "#8b4a6b", skyBottom: "#d4764a",
    atmosphereGlow: "rgba(212,118,74,0.25)",
    celestialColor: "#e8734a", celestialGlow: "rgba(232,115,74,0.4)",
    celestialSize: 88, celestialBottom: "30%", isMoon: false,
    canopyLight: "#1e4420", canopyMid: "#163318", canopyDark: "#0f2510",
    mountainColor: "#12301a", groundColorMg: "#0f2510", groundColorFg: "#0a1a0d",
    trunkColor: "#4a2e14", fireflyOpacity: 0.6, showLeaves: false,
  },
  // Sunset (3)
  {
    skyTop: "#1a0a1e", skyMid: "#6b2a3d", skyBottom: "#e85a3a",
    atmosphereGlow: "rgba(232,90,58,0.35)",
    celestialColor: "#d44a2e", celestialGlow: "rgba(212,74,46,0.5)",
    celestialSize: 104, celestialBottom: "15%", isMoon: false,
    canopyLight: "#142218", canopyMid: "#0f1a10", canopyDark: "#0a120a",
    mountainColor: "#0d1a0f", groundColorMg: "#0a140c", groundColorFg: "#070f08",
    trunkColor: "#3a2010", fireflyOpacity: 0.8, showLeaves: false,
  },
  // Night (4)
  {
    skyTop: "#050a0f", skyMid: "#0a1a12", skyBottom: "#0b1a0f",
    atmosphereGlow: "rgba(200,216,232,0.05)",
    celestialColor: "#c8d8e8", celestialGlow: "rgba(200,216,232,0.15)",
    celestialSize: 48, celestialBottom: "65%", isMoon: true,
    canopyLight: "#0a1a0c", canopyMid: "#060f08", canopyDark: "#040a05",
    mountainColor: "#060f08", groundColorMg: "#050c07", groundColorFg: "#040a06",
    trunkColor: "#1a1208", fireflyOpacity: 1, showLeaves: false,
  },
];

/* ── Tree data ────────────────────────────────────────────────── */

interface TreeData {
  canopy: string;
  trunkX: number;
  trunkY: number;
  trunkW: number;
  trunkH: number;
  shade: "light" | "mid" | "dark";
}

const midGroundTrees: TreeData[] = [
  { canopy: "M60 320 L100 240 L80 240 L110 180 L90 180 L120 120 L150 180 L130 180 L160 240 L140 240 L180 320 Z", trunkX: 100, trunkY: 320, trunkW: 40, trunkH: 180, shade: "mid" },
  { canopy: "M180 350 L220 280 L200 280 L230 220 L210 220 L240 160 L270 220 L250 220 L280 280 L260 280 L300 350 Z", trunkX: 220, trunkY: 350, trunkW: 40, trunkH: 150, shade: "light" },
  { canopy: "M375 300 L420 220 L395 220 L440 150 L415 150 L450 90 L485 150 L460 150 L505 220 L480 220 L525 300 Z", trunkX: 430, trunkY: 300, trunkW: 40, trunkH: 200, shade: "mid" },
  { canopy: "M500 340 L540 270 L520 270 L555 210 L535 210 L565 150 L595 210 L575 210 L610 270 L590 270 L630 340 Z", trunkX: 545, trunkY: 340, trunkW: 40, trunkH: 160, shade: "light" },
  { canopy: "M660 310 L700 240 L680 240 L720 170 L700 170 L730 100 L760 170 L740 170 L780 240 L760 240 L800 310 Z", trunkX: 710, trunkY: 310, trunkW: 40, trunkH: 190, shade: "dark" },
  { canopy: "M860 330 L900 260 L880 260 L920 190 L900 190 L935 120 L970 190 L950 190 L990 260 L970 260 L1010 330 Z", trunkX: 915, trunkY: 330, trunkW: 40, trunkH: 170, shade: "mid" },
  { canopy: "M1000 350 L1040 280 L1020 280 L1060 210 L1040 210 L1075 140 L1110 210 L1090 210 L1130 280 L1110 280 L1150 350 Z", trunkX: 1055, trunkY: 350, trunkW: 40, trunkH: 150, shade: "light" },
  { canopy: "M1230 310 L1270 230 L1250 230 L1290 160 L1270 160 L1305 100 L1340 160 L1320 160 L1360 230 L1340 230 L1380 310 Z", trunkX: 1285, trunkY: 310, trunkW: 40, trunkH: 190, shade: "dark" },
];

const foregroundTrees: TreeData[] = [
  { canopy: "M-50 350 L10 260 L-20 260 L30 180 L0 180 L50 100 L100 180 L70 180 L120 260 L90 260 L150 350 Z", trunkX: 30, trunkY: 350, trunkW: 44, trunkH: 250, shade: "dark" },
  { canopy: "M1290 340 L1340 250 L1310 250 L1360 170 L1330 170 L1380 90 L1430 170 L1400 170 L1450 250 L1420 250 L1470 340 Z", trunkX: 1360, trunkY: 340, trunkW: 44, trunkH: 260, shade: "dark" },
];

/* ── Firefly configs (20) ─────────────────────────────────────── */

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

/* ── Helpers ──────────────────────────────────────────────────── */

const transition = "all 900ms cubic-bezier(0.4, 0, 0.2, 1)";

function canopyColor(theme: TimeTheme, shade: "light" | "mid" | "dark"): string {
  if (shade === "light") return theme.canopyLight;
  if (shade === "mid") return theme.canopyMid;
  return theme.canopyDark;
}

/* ── Props ────────────────────────────────────────────────────── */

interface ForestSceneProps {
  page: number;
  zoomPhase: MotionValue<number>;
}

/* ── Main component ──────────────────────────────────────────── */

export default function ForestScene({ page, zoomPhase }: ForestSceneProps) {
  const theme = themes[Math.max(0, Math.min(themes.length - 1, page))];

  /* ── Zoom phase transforms ─────────────────────────────────── */

  // Foreground trees
  const scaleFg = useTransform(zoomPhase, [0, 1], [1, 2.5]);
  const opacityFg = useTransform(zoomPhase, [0, 0.4, 1], [1, 0.3, 0]);

  // Mid-ground trees
  const scaleMg = useTransform(zoomPhase, [0, 1], [1, 1.6]);
  const opacityMg = useTransform(zoomPhase, [0, 0.5, 1], [1, 0.5, 0]);

  // Mountains
  const scaleMt = useTransform(zoomPhase, [0, 1], [1, 1.15]);

  // Underbrush leaves
  const leafScale = useTransform(zoomPhase, [0, 1], [1, 3.5]);
  const leafOpacity = useTransform(zoomPhase, [0, 0.3], [1, 0]);

  return (
    <div className="fixed inset-0 overflow-hidden" aria-hidden="true">
      {/* ── Sky gradient ─────────────────────────────────────── */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to bottom, ${theme.skyTop}, ${theme.skyMid}, ${theme.skyBottom})`,
          transition,
        }}
      />

      {/* ── Atmosphere glow ──────────────────────────────────── */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 120% 40% at 50% 75%, ${theme.atmosphereGlow} 0%, transparent 70%)`,
          transition,
        }}
      />

      {/* ── Celestial body (sun/moon) ────────────────────────── */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          bottom: theme.celestialBottom,
          transition,
        }}
      >
        <div className="relative">
          <div
            className="absolute -inset-32 rounded-full"
            style={{
              background: `radial-gradient(circle, ${theme.celestialGlow} 0%, transparent 70%)`,
              transition,
            }}
          />
          <div
            className="rounded-full"
            style={{
              width: theme.celestialSize,
              height: theme.celestialSize,
              background: theme.isMoon
                ? `radial-gradient(circle at 60% 40%, ${theme.celestialColor}, ${theme.celestialColor}cc 60%, ${theme.celestialColor}88 100%)`
                : `radial-gradient(circle at 40% 40%, ${theme.celestialColor}ee, ${theme.celestialColor} 50%, ${theme.celestialColor}cc 100%)`,
              boxShadow: `0 0 80px ${theme.celestialGlow}, 0 0 160px ${theme.celestialGlow}`,
              transition,
            }}
          />
        </div>
      </div>

      {/* ── Mountains ────────────────────────────────────────── */}
      <motion.div style={{ scale: scaleMt }} className="absolute inset-0 origin-bottom">
        <svg
          viewBox="0 0 1440 400"
          className="absolute bottom-0 w-full h-[60%] min-h-[250px]"
          preserveAspectRatio="xMidYMax slice"
          fill="none"
        >
          <path
            d="M0 400 L0 280 Q120 200 240 260 Q360 180 480 240 Q600 160 720 220 Q840 140 960 200 Q1080 160 1200 230 Q1320 190 1440 250 L1440 400 Z"
            fill={theme.mountainColor}
            style={{ transition }}
          />
        </svg>
      </motion.div>

      {/* ── Mid-ground trees ─────────────────────────────────── */}
      <motion.div style={{ scale: scaleMg, opacity: opacityMg }} className="absolute inset-0 origin-bottom">
        <svg
          viewBox="0 0 1440 500"
          className="absolute bottom-0 w-full h-[70%] min-h-[300px]"
          preserveAspectRatio="xMidYMax slice"
          fill="none"
        >
          {/* Trunks (behind canopies) */}
          {midGroundTrees.map((tree, i) => (
            <rect
              key={`mg-trunk-${i}`}
              x={tree.trunkX}
              y={tree.trunkY}
              width={tree.trunkW}
              height={tree.trunkH}
              fill={theme.trunkColor}
              style={{ transition }}
            />
          ))}
          {/* Canopies (on top) */}
          {midGroundTrees.map((tree, i) => (
            <path
              key={`mg-canopy-${i}`}
              d={tree.canopy}
              fill={canopyColor(theme, tree.shade)}
              style={{ transition }}
            />
          ))}
          {/* Mid-ground ground */}
          <rect x="0" y="420" width="1440" height="80" fill={theme.groundColorMg} style={{ transition }} />
        </svg>
      </motion.div>

      {/* ── Fireflies ────────────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: theme.fireflyOpacity,
          transition,
        }}
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
      <motion.div style={{ scale: scaleFg, opacity: opacityFg }} className="absolute inset-0 origin-bottom">
        <svg
          viewBox="0 0 1440 600"
          className="absolute bottom-0 w-full h-[65%] min-h-[280px]"
          preserveAspectRatio="xMidYMax slice"
          fill="none"
        >
          {/* Trunks (behind canopies) */}
          {foregroundTrees.map((tree, i) => (
            <rect
              key={`fg-trunk-${i}`}
              x={tree.trunkX}
              y={tree.trunkY}
              width={tree.trunkW}
              height={tree.trunkH}
              fill={theme.trunkColor}
              style={{ transition }}
            />
          ))}
          {/* Canopies (on top) */}
          {foregroundTrees.map((tree, i) => (
            <path
              key={`fg-canopy-${i}`}
              d={tree.canopy}
              fill={canopyColor(theme, tree.shade)}
              style={{ transition }}
            />
          ))}
          {/* Foreground ground */}
          <rect x="0" y="520" width="1440" height="80" fill={theme.groundColorFg} style={{ transition }} />
        </svg>
      </motion.div>

      {/* ── Underbrush leaves (Dawn only) ────────────────────── */}
      {theme.showLeaves && (
        <motion.div
          style={{ scale: leafScale, opacity: leafOpacity }}
          className="absolute inset-0 pointer-events-none origin-bottom"
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
          transition,
        }}
      />
    </div>
  );
}
