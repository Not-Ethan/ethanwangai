"use client";

import React from "react";
import { motion, useTransform, useMotionTemplate, type MotionValue } from "framer-motion";

/* ── Theme color arrays (one value per page, interpolated smoothly) ── */

const P = [0, 1, 2, 3, 4];

const SKY_TOP =        ["#130718", "#0a1720", "#120a1d", "#09080f", "#030407"];
const SKY_MID =        ["#281531", "#10202b", "#2b1734", "#16131d", "#07090d"];
const SKY_BOTTOM =     ["#4b2a38", "#152831", "#45253a", "#1a1620", "#090b10"];
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
const CELESTIAL_BOTTOM = [35, 68, 30, 15, 82];
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
  { x: "6%", y: "50%", size: 2.5, drift: 3 as const, dur: 4.7, glow: 3.1, delay: 0.2, color: "#d4e860" },
  { x: "18%", y: "38%", size: 2, drift: 1 as const, dur: 5.4, glow: 2.9, delay: 1.7, color: "#b8d44f" },
  { x: "48%", y: "60%", size: 2.5, drift: 2 as const, dur: 4.4, glow: 3.6, delay: 1.1, color: "#d4e860" },
  { x: "67%", y: "40%", size: 2.2, drift: 3 as const, dur: 5.9, glow: 3.2, delay: 0.6, color: "#b8d44f" },
  { x: "78%", y: "76%", size: 2.4, drift: 1 as const, dur: 4.9, glow: 3.4, delay: 2.2, color: "#d4e860" },
  { x: "93%", y: "54%", size: 2, drift: 2 as const, dur: 5.3, glow: 3.8, delay: 0.9, color: "#b8d44f" },
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

const journeyLeaves: FrameLeaf[] = [
  { top: "8%", left: "-10%", width: 360, rotate: 16, color: "#153e1b", opacity: 0.58, sway: 1, swayDuration: 9, swayDelay: 0.5, variant: 2 },
  { top: "22%", left: "-8%", width: 280, rotate: 24, color: "#1d4f24", opacity: 0.46, sway: 3, swayDuration: 11, swayDelay: 1.1, variant: 1, blur: 0.8 },
  { top: "42%", left: "-6%", width: 220, rotate: 8, color: "#1a4620", opacity: 0.4, sway: 2, swayDuration: 10, swayDelay: 0.7, variant: 3 },
  { top: "10%", right: "-10%", width: 360, rotate: -22, color: "#153e1b", opacity: 0.6, sway: 2, swayDuration: 10, swayDelay: 0.6, variant: 2, flipX: true },
  { top: "30%", right: "-8%", width: 280, rotate: -14, color: "#1d4f24", opacity: 0.44, sway: 1, swayDuration: 12, swayDelay: 1.8, variant: 3, flipX: true },
  { top: "50%", right: "-5%", width: 220, rotate: -8, color: "#1a4620", opacity: 0.36, sway: 3, swayDuration: 11, swayDelay: 1.2, variant: 1, flipX: true },
  { bottom: "-14%", left: "2%", width: 390, rotate: 168, color: "#0d2811", opacity: 0.62, sway: 2, swayDuration: 10, swayDelay: 0.3, variant: 1 },
  { bottom: "-16%", left: "24%", width: 280, rotate: 176, color: "#103014", opacity: 0.45, sway: 1, swayDuration: 9, swayDelay: 0.9, variant: 2 },
  { bottom: "-16%", right: "2%", width: 390, rotate: -165, color: "#0d2811", opacity: 0.6, sway: 3, swayDuration: 9, swayDelay: 1.2, variant: 1, flipX: true },
  { bottom: "-15%", right: "22%", width: 280, rotate: -173, color: "#103014", opacity: 0.44, sway: 2, swayDuration: 10, swayDelay: 1.5, variant: 2, flipX: true },
];

const journeyMotes = [
  { x: "12%", y: "40%", size: 3.5, drift: 1 as const, dur: 12, glow: 5.5, delay: 0.3, color: "#75d8cf" },
  { x: "28%", y: "64%", size: 2.8, drift: 2 as const, dur: 14, glow: 4.8, delay: 1.2, color: "#a6d481" },
  { x: "42%", y: "36%", size: 2.5, drift: 3 as const, dur: 10, glow: 5.1, delay: 0.8, color: "#8de9b6" },
  { x: "58%", y: "58%", size: 3.2, drift: 1 as const, dur: 13, glow: 5.7, delay: 1.7, color: "#75d8cf" },
  { x: "74%", y: "46%", size: 2.6, drift: 2 as const, dur: 11, glow: 4.3, delay: 0.5, color: "#a6d481" },
  { x: "86%", y: "67%", size: 3.1, drift: 3 as const, dur: 15, glow: 6, delay: 1.9, color: "#8de9b6" },
];

const nightStars = [
  { x: "6%", y: "10%", size: 1.5, delay: 0.1, duration: 2.8 },
  { x: "12%", y: "22%", size: 1.8, delay: 1.2, duration: 3.3 },
  { x: "18%", y: "14%", size: 1.3, delay: 0.8, duration: 2.6 },
  { x: "26%", y: "8%", size: 1.7, delay: 1.7, duration: 3.1 },
  { x: "34%", y: "20%", size: 1.6, delay: 0.4, duration: 2.9 },
  { x: "41%", y: "12%", size: 2, delay: 1.5, duration: 3.5 },
  { x: "48%", y: "18%", size: 1.4, delay: 1, duration: 2.7 },
  { x: "56%", y: "9%", size: 1.8, delay: 0.3, duration: 3.2 },
  { x: "63%", y: "16%", size: 1.5, delay: 1.9, duration: 2.8 },
  { x: "70%", y: "11%", size: 1.9, delay: 0.7, duration: 3.4 },
  { x: "78%", y: "22%", size: 1.6, delay: 1.4, duration: 2.6 },
  { x: "84%", y: "8%", size: 1.7, delay: 0.6, duration: 3.1 },
  { x: "90%", y: "17%", size: 1.4, delay: 1.8, duration: 2.9 },
  { x: "95%", y: "12%", size: 1.6, delay: 0.9, duration: 3.2 },
];

const shootingStars = [
  { x: "74%", y: "14%", width: 70, travelX: -280, travelY: 180, duration: 2.2, delay: 0.2 },
  { x: "88%", y: "18%", width: 62, travelX: -250, travelY: 160, duration: 2.5, delay: 0.9 },
  { x: "80%", y: "10%", width: 54, travelX: -220, travelY: 150, duration: 2.1, delay: 1.5 },
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
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const activeFrameLeaves = React.useMemo(
    () =>
      isMobile
        ? frameLeaves
            .filter((leaf) => leaf.bottom)
            .map((leaf) => ({
              ...leaf,
              width: Math.round(leaf.width * 0.88),
              opacity: Math.min(leaf.opacity * 0.82, 0.48),
            }))
        : frameLeaves,
    [isMobile]
  );

  const activeJourneyLeaves = React.useMemo(
    () =>
      isMobile
        ? journeyLeaves
            .filter((leaf) => leaf.bottom)
            .map((leaf) => ({
              ...leaf,
              width: Math.round(leaf.width * 0.84),
              opacity: Math.min(leaf.opacity * 0.8, 0.5),
            }))
        : journeyLeaves,
    [isMobile]
  );

  /* ── Flipbook-like chapter transitions ────────────────── */
  const scaleFg = useTransform(scrollPos, [0, 4], [1, 1.4]);
  const yFg = useTransform(scrollPos, [0, 1, 2, 3, 4], [0, 70, 155, 235, 320]);
  const opacityFg = useTransform(scrollPos, [0, 0.6, 1, 1.2, 4], [1, 0.38, 0.05, 0, 0]);
  const scaleMg = useTransform(scrollPos, [0, 4], [1, 1.22]);
  const yMg = useTransform(scrollPos, [0, 1, 2, 3, 4], [0, 50, 100, 150, 210]);
  const opacityMg = useTransform(scrollPos, [0, 1.8, 3.8], [1, 0.55, 0.08]);
  const scaleMt = useTransform(scrollPos, [0, 4], [1, 1.1]);
  const leafScale = useTransform(scrollPos, [0, 1.1], [1, isMobile ? 1.65 : 2.4]);
  const leafZoomOp = useTransform(
    scrollPos,
    isMobile ? [0, 0.4, 0.7] : [0, 0.65, 0.95],
    isMobile ? [0.9, 0.22, 0] : [1, 0.35, 0]
  );
  const journeyLeafScale = useTransform(scrollPos, [1, 4], [1, isMobile ? 1.08 : 1.22]);
  const journeyLeafOp = useTransform(
    scrollPos,
    isMobile ? [0.7, 1, 2.1, 3, 4] : [0.65, 1, 4],
    isMobile ? [0, 0.48, 0.2, 0.08, 0] : [0, 0.78, 0.9]
  );
  const journeyLeafY = useTransform(scrollPos, (value) => (isMobile ? 125 + value * 22 : 0));
  const journeyMoteOp = useTransform(scrollPos, [0.9, 1.4, 4], [0, 0.5, 0.82]);
  const vignetteOp = useTransform(scrollPos, [0, 4], [0.15, 0.48]);
  const chapter1Op = useTransform(scrollPos, [0.45, 1, 1.55], [0, 0.95, 0]);
  const chapter2Op = useTransform(scrollPos, [1.45, 2, 2.55], [0, 0.95, 0]);
  const chapter3Op = useTransform(scrollPos, [2.45, 3, 3.55], [0, 0.95, 0]);
  const chapter4Op = useTransform(scrollPos, [3.45, 4, 4.4], [0, 0.95, 0]);
  const chapter1Y = useTransform(scrollPos, [0.45, 1, 1.55], [120, 0, 110]);
  const chapter2Y = useTransform(scrollPos, [1.45, 2, 2.55], [120, 0, 110]);
  const chapter3Y = useTransform(scrollPos, [2.45, 3, 3.55], [120, 0, 110]);
  const chapter4Y = useTransform(scrollPos, [3.45, 4, 4.4], [120, 0, 100]);
  const owlFlip = useTransform(scrollPos, [2.65, 3, 3.35], [90, 0, 90]);
  const hareFlip = useTransform(scrollPos, [3.65, 4, 4.3], [90, 0, 90]);
  const nightSkyOp = useTransform(scrollPos, [3.15, 3.75, 4.4], [0, 0.72, 1]);
  const shootingOp = useTransform(scrollPos, [3.45, 3.95, 4.4], [0, 0.9, 1]);

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

      {/* ── Final-page star field and shooting stars ────── */}
      <motion.div className="absolute inset-0 pointer-events-none" style={{ opacity: nightSkyOp }}>
        {nightStars.map((star, i) => (
          <div
            key={`star-${i}`}
            className="absolute rounded-full"
            style={{
              left: star.x,
              top: star.y,
              width: star.size,
              height: star.size,
              backgroundColor: "#f2f7ff",
              boxShadow: "0 0 10px rgba(208, 226, 255, 0.85)",
              animation: `twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
            }}
          />
        ))}
      </motion.div>
      <motion.div className="absolute inset-0 pointer-events-none" style={{ opacity: shootingOp }}>
        {shootingStars.map((star, i) => (
          <motion.div
            key={`shooting-star-${i}`}
            className="absolute h-[1.5px] rounded-full"
            initial={{ x: 0, y: 0, opacity: 0 }}
            animate={{
              x: [0, star.travelX],
              y: [0, star.travelY],
              opacity: [0, 0.95, 0],
            }}
            transition={{
              duration: star.duration,
              ease: "easeInOut",
              repeat: Infinity,
              repeatDelay: 1.8,
              delay: star.delay,
            }}
            style={{
              left: star.x,
              top: star.y,
              width: star.width,
              background: "linear-gradient(90deg, rgba(240,248,255,0), rgba(240,248,255,0.95), rgba(240,248,255,0))",
              filter: "drop-shadow(0 0 8px rgba(210, 230, 255, 0.95))",
              rotate: "-22deg",
            }}
          />
        ))}
      </motion.div>

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
      <motion.div style={{ scale: scaleMg, y: yMg, opacity: opacityMg }} className="absolute inset-0 origin-bottom">
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
      <motion.div style={{ scale: scaleFg, y: yFg, opacity: opacityFg }} className="absolute inset-0 origin-bottom">
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
        {activeFrameLeaves.map((leaf, i) => {
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

      {/* ── Journey leaves (fade in after hero) ───────────── */}
      <motion.div
        style={{ scale: journeyLeafScale, y: journeyLeafY, opacity: journeyLeafOp }}
        className="absolute inset-0 pointer-events-none origin-bottom"
      >
        {activeJourneyLeaves.map((leaf, i) => {
          const shape = leafPaths[leaf.variant];
          return (
            <div
              key={`journey-${i}`}
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
                    <path d={shape.vein} stroke={leaf.color} strokeWidth="1" opacity="0.22" />
                    {shape.sideVeins.map((d, j) => (
                      <path key={j} d={d} stroke={leaf.color} strokeWidth="0.5" opacity="0.12" />
                    ))}
                  </svg>
                </div>
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* ── Journey motes ─────────────────────────────────── */}
      <motion.div className="absolute inset-0 pointer-events-none" style={{ opacity: journeyMoteOp }}>
        {journeyMotes.map((mote, i) => (
          <div
            key={`mote-${i}`}
            className="absolute rounded-full"
            style={{
              left: mote.x,
              top: mote.y,
              width: mote.size,
              height: mote.size,
              backgroundColor: mote.color,
              boxShadow: `0 0 ${mote.size * 4}px ${mote.color}90, 0 0 ${mote.size * 8}px ${mote.color}40`,
              animation: `firefly-drift-${mote.drift} ${mote.dur}s ease-in-out ${mote.delay}s infinite, firefly-glow ${mote.glow}s ease-in-out ${mote.delay}s infinite`,
            }}
          />
        ))}
      </motion.div>

      {/* ── Chapter tree cutouts (flipbook pages) ────────── */}
      <motion.div className="absolute inset-0 pointer-events-none origin-bottom" style={{ opacity: chapter1Op, y: chapter1Y }}>
        <svg viewBox="0 0 1440 420" className="absolute bottom-0 w-full h-[54%] min-h-[220px]" preserveAspectRatio="xMidYMax slice" fill="none">
          <path d="M0 420 L0 300 Q90 220 180 300 Q260 180 340 290 Q430 170 520 300 Q620 190 710 320 Q790 210 870 300 Q980 180 1080 320 Q1190 200 1280 310 Q1360 230 1440 300 L1440 420 Z" fill="#11381a" />
        </svg>
      </motion.div>
      <motion.div className="absolute inset-0 pointer-events-none origin-bottom" style={{ opacity: chapter2Op, y: chapter2Y }}>
        <svg viewBox="0 0 1440 420" className="absolute bottom-0 w-full h-[56%] min-h-[220px]" preserveAspectRatio="xMidYMax slice" fill="none">
          <path d="M0 420 L0 320 Q110 210 220 320 Q300 150 380 300 Q460 190 540 320 Q640 170 720 300 Q820 200 900 330 Q1000 170 1100 300 Q1220 180 1320 320 Q1380 250 1440 310 L1440 420 Z" fill="#0e3116" />
        </svg>
      </motion.div>
      <motion.div className="absolute inset-0 pointer-events-none origin-bottom" style={{ opacity: chapter3Op, y: chapter3Y }}>
        <svg viewBox="0 0 1440 420" className="absolute bottom-0 w-full h-[58%] min-h-[220px]" preserveAspectRatio="xMidYMax slice" fill="none">
          <path d="M0 420 L0 315 Q120 240 240 315 Q350 170 460 320 Q560 180 660 300 Q760 160 860 315 Q960 180 1060 300 Q1170 160 1280 320 Q1360 240 1440 310 L1440 420 Z" fill="#0b2712" />
        </svg>
      </motion.div>
      <motion.div className="absolute inset-0 pointer-events-none origin-bottom" style={{ opacity: chapter4Op, y: chapter4Y }}>
        <svg viewBox="0 0 1440 420" className="absolute bottom-0 w-full h-[60%] min-h-[220px]" preserveAspectRatio="xMidYMax slice" fill="none">
          <path d="M0 420 L0 325 Q100 250 200 330 Q320 180 440 330 Q560 200 680 320 Q820 150 960 330 Q1060 210 1160 320 Q1280 190 1400 330 Q1420 320 1440 322 L1440 420 Z" fill="#07170c" />
        </svg>
      </motion.div>

      {/* ── Animals flipping up/down between pages ───────── */}
      <div className="absolute inset-0 pointer-events-none" style={{ perspective: 1200 }}>
        <motion.div className="absolute bottom-[31%] right-[24%] w-10 h-10 origin-bottom" style={{ rotateX: owlFlip, opacity: chapter3Op }}>
          <svg viewBox="0 0 80 80" className="w-full h-full" fill="none">
            <circle cx="40" cy="42" r="20" fill="#151010" />
            <circle cx="34" cy="38" r="3" fill="#c8d8e8" />
            <circle cx="46" cy="38" r="3" fill="#c8d8e8" />
            <path d="M36 46 L44 46 L40 52 Z" fill="#d4a574" />
          </svg>
        </motion.div>
        <motion.div className="absolute bottom-[12%] right-[34%] w-10 h-7 origin-bottom" style={{ rotateX: hareFlip, opacity: chapter4Op }}>
          <svg viewBox="0 0 100 60" className="w-full h-full" fill="none">
            <path d="M14 44 L30 34 L48 34 L60 24 L74 22 L86 30 L80 42 L64 46 L48 48 L34 48 L24 52 Z" fill="#18120d" />
            <path d="M60 24 L56 6 L64 4 L68 24 M70 22 L70 6 L78 6 L78 22" stroke="#18120d" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </motion.div>
      </div>

      {/* ── Ground fog ───────────────────────────────────── */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-40"
        style={{ background: fogGrad }}
      />

      {/* ── Vignette for depth at later pages ────────────── */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: vignetteOp,
          background: "radial-gradient(ellipse 85% 75% at 50% 35%, transparent 55%, rgba(0, 0, 0, 0.68) 100%)",
        }}
      />
    </div>
  );
}
