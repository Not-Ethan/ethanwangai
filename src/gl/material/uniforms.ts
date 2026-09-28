// The one uniform registry every GL material shares: the ink material, its depth
// material, the ink points and the leader lines all read from this object, and
// Clocks.ts writes it once per frame (Ink.tsx writes the ink points' own entries).
// Names are the GLSL names; never rename.
import * as THREE from 'three';
import { PALETTES, type Palette } from '@/theme/palettes';
import { MACHINE_COUNT, MACHINE } from '@/bench/types';
import { OU } from '@/bench/ou';
import { QUOTER_BED } from '@/bench/configs/quoter';
import { TIMING } from '@/bench/timing';
import { PLACEMENT } from '@/bench/bench';
import { BAND_ROWS } from '@/gl/inkGeometry';

export interface BenchUniforms {
  uCompile: { value: Float32Array };        // [8] 0..1 compile progress per machine
  uMachineTime: { value: Float32Array };    // [8] seconds since the lever locked; 0 while parked
  uRun: { value: Float32Array };            // [8] 0..1 run state, damped in JS
  uFillRate: { value: Float32Array };       // [8] ≥ 1, spikes on impulses
  uTilt: { value: number };                 // balance rail tilt, critically damped in JS
  uTime: { value: number };                 // wall clock, for ink and trickle only
  uVel: { value: number };                  // −1..1 plus impulse
  uMerge: { value: number };                // 0..6 merge clicks
  uLean: { value: number };
  uHover: { value: THREE.Vector2 };         // (machine, col), −1 = none
  uOU: { value: THREE.Texture | null };
  uOUInfo: { value: THREE.Vector4 };        // markets, steps, rows, stepsPerSecond
  uCellH: { value: number };                // quoter cell hBase
  uPitch: { value: number };                // quoter bed pitch (desktop; phone doubles it)
  uTravelAxis: { value: THREE.Vector3 };    // unit camera travel axis for velocity stretch
  uBenchCenter: { value: THREE.Vector3 };
  uBalancePivot: { value: THREE.Vector3 };  // bench-space point the balance rail tilts about
  uSlotPeriod: { value: number };           // scanning-bar period, reseeded per keystroke
  uLock: { value: THREE.Vector3 };          // lock0, lockSpan, lockW
  uKeyDir: { value: THREE.Vector3 };        // unit light direction for three-tone key faces
  uPaper: { value: THREE.Color };
  uInkTop: { value: THREE.Color };
  uInkKey: { value: THREE.Color };
  uInkShade: { value: THREE.Color };
  uPencil: { value: THREE.Color };
  uHot: { value: THREE.Color };
  uShadow: { value: THREE.Color };
  uGlyph: { value: number };                // 1 renders glyph atlas points; off by default
  uLines: { value: number };                // leader-line kill switch; 1 = on
  // The ink points (Ink.tsx writes these; the kits never read them)
  uRect: { value: Float32Array };           // [8 × vec4] source rects in NDC: x, top y, w, h; slot 7 is section 03's first line
  uCentroid: { value: Float32Array };       // [8 × vec3] bench-space centroid of each partition's target machine
  uActiveRect: { value: number };           // uRect slot the trickle spawns from
  uTrickle: { value: number };              // 0/1: the trickle is off in 08 and under reduced motion
  uBurst: { value: number };                // 0..1 merge burst-back progress, the merge partition's clock
  uCurl: { value: THREE.Data3DTexture | null };   // the baked 32³ curl volume
  uPixelRatio: { value: number };           // renderer DPR, for gl_PointSize
  uInk: { value: THREE.Color };             // the palette's ink: type and ink dots
  uBandPitch: { value: number };            // the band's row pitch in NDC y (14 CSS px · 2 / vh)
  uBandRows: { value: Float32Array };       // [8] rows in each partition's band
}

/** OU texture playback rate in steps per second. */
const OU_STEPS_PER_SECOND = 8;
/** The slot's baked scan period (src/bench/configs/slot.ts, aParam[1]); keystrokes reseed it at runtime. */
const SLOT_SCAN_PERIOD_S = 3;

type ColorKey = keyof Palette;
type ColorUniformName = 'uPaper' | 'uInk' | 'uInkTop' | 'uInkKey' | 'uInkShade' | 'uPencil' | 'uHot' | 'uShadow';
/** Palette key → uniform. `ink` is the DOM's type color and the ink points' dot color. */
const COLOR_UNIFORMS: ReadonlyArray<readonly [ColorKey, ColorUniformName]> = [
  ['paper', 'uPaper'], ['ink', 'uInk'], ['inkTop', 'uInkTop'], ['inkKey', 'uInkKey'], ['inkShade', 'uInkShade'],
  ['pencil', 'uPencil'], ['hot', 'uHot'], ['shadow', 'uShadow'],
];

/** sRGB hex → linear-space Color. ColorManagement is on by default in r185, so setStyle converts. */
export function hexToColor(hex: string): THREE.Color {
  return new THREE.Color().setStyle(hex);
}

type LinearPalette = Record<ColorKey, THREE.Color>;
const linearCache = new WeakMap<Palette, LinearPalette>();

/** Pre-converted linear colors for a palette, built once per palette object so the per-frame lerp allocates nothing. */
function linearPalette(p: Palette): LinearPalette {
  let out = linearCache.get(p);
  if (!out) {
    out = {
      paper: hexToColor(p.paper), ink: hexToColor(p.ink), inkTop: hexToColor(p.inkTop), inkKey: hexToColor(p.inkKey),
      inkShade: hexToColor(p.inkShade), pencil: hexToColor(p.pencil), hot: hexToColor(p.hot), shadow: hexToColor(p.shadow),
    };
    linearCache.set(p, out);
  }
  return out;
}

/** Lerps every palette color from `from` to `to` by `t` in linear space, in place. Drives the 300 ms theme change. */
export function applyPalette(u: BenchUniforms, from: Palette, to: Palette, t: number): void {
  const a = linearPalette(from), b = linearPalette(to);
  for (const [key, name] of COLOR_UNIFORMS) u[name].value.lerpColors(a[key], b[key], t);
}

/** Rows per ink partition as the shader's float[8]; the eighth slot is no partition. */
function bandRows(): Float32Array {
  const rows = new Float32Array(MACHINE_COUNT);
  rows.set(BAND_ROWS);
  return rows;
}

/** A fresh registry, parked and on the light palette. Clocks.ts, Kits.tsx, Ink.tsx and CameraRig.tsx write the rest. */
export function createUniforms(): BenchUniforms {
  const balance = PLACEMENT[MACHINE.balance].origin;   // the balance post stands at its local origin
  const u: BenchUniforms = {
    uCompile: { value: new Float32Array(MACHINE_COUNT) },
    uMachineTime: { value: new Float32Array(MACHINE_COUNT) },
    uRun: { value: new Float32Array(MACHINE_COUNT) },
    uFillRate: { value: new Float32Array(MACHINE_COUNT).fill(1) },
    uTilt: { value: 0 },
    uTime: { value: 0 },
    uVel: { value: 0 },
    uMerge: { value: 0 },
    uLean: { value: 0 },
    uHover: { value: new THREE.Vector2(-1, -1) },
    uOU: { value: null },
    uOUInfo: { value: new THREE.Vector4(OU.markets, OU.steps, OU.rows, OU_STEPS_PER_SECOND) },
    uCellH: { value: QUOTER_BED.hBase },
    uPitch: { value: QUOTER_BED.pitch },
    uTravelAxis: { value: new THREE.Vector3(1, 0, 0) },   // the bed axis, which the hero impulse stretches along
    uBenchCenter: { value: new THREE.Vector3() },
    uBalancePivot: { value: new THREE.Vector3(balance[0], balance[1], balance[2]) },
    uSlotPeriod: { value: SLOT_SCAN_PERIOD_S },
    uLock: { value: new THREE.Vector3(TIMING.lock0, TIMING.lockSpan, TIMING.lockW) },
    uKeyDir: { value: new THREE.Vector3(-1, 1, 1).normalize() },   // upper-left-front, matching the key light
    uPaper: { value: new THREE.Color() },
    uInkTop: { value: new THREE.Color() },
    uInkKey: { value: new THREE.Color() },
    uInkShade: { value: new THREE.Color() },
    uPencil: { value: new THREE.Color() },
    uHot: { value: new THREE.Color() },
    uShadow: { value: new THREE.Color() },
    uGlyph: { value: 0 },
    uLines: { value: 1 },
    uRect: { value: new Float32Array(MACHINE_COUNT * 4) },
    uCentroid: { value: new Float32Array(MACHINE_COUNT * 3) },
    uActiveRect: { value: 0 },
    uTrickle: { value: 1 },
    uBurst: { value: 0 },
    uCurl: { value: null },
    uPixelRatio: { value: 1 },
    uInk: { value: new THREE.Color() },
    uBandPitch: { value: 0 },   // Ink.tsx writes it from the viewport height each frame
    uBandRows: { value: bandRows() },
  };
  applyPalette(u, PALETTES.light, PALETTES.light, 0);
  return u;
}
