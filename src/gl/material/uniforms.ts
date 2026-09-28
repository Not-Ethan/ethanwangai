// The one uniform registry every GL material shares: the ink material, its depth
// material, the ink points and the leader lines all read from this object, and
// Clocks.ts writes it once per frame. Names are the GLSL names; never rename.
import * as THREE from 'three';
import { PALETTES, type Palette } from '@/theme/palettes';
import { MACHINE_COUNT, MACHINE } from '@/bench/types';
import { OU } from '@/bench/ou';
import { QUOTER_BED } from '@/bench/configs/quoter';
import { TIMING } from '@/bench/timing';
import { PLACEMENT } from '@/bench/bench';

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
}

/** OU texture playback rate in steps per second. */
const OU_STEPS_PER_SECOND = 8;
/** The slot's baked scan period (src/bench/configs/slot.ts, aParam[1]); keystrokes reseed it at runtime. */
const SLOT_SCAN_PERIOD_S = 3;

type ColorKey = Exclude<keyof Palette, 'ink'>;
type ColorUniformName = 'uPaper' | 'uInkTop' | 'uInkKey' | 'uInkShade' | 'uPencil' | 'uHot' | 'uShadow';
/** Palette key → uniform. `ink` is the DOM's type color and has no GL uniform. */
const COLOR_UNIFORMS: ReadonlyArray<readonly [ColorKey, ColorUniformName]> = [
  ['paper', 'uPaper'], ['inkTop', 'uInkTop'], ['inkKey', 'uInkKey'], ['inkShade', 'uInkShade'],
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
      paper: hexToColor(p.paper), inkTop: hexToColor(p.inkTop), inkKey: hexToColor(p.inkKey), inkShade: hexToColor(p.inkShade),
      pencil: hexToColor(p.pencil), hot: hexToColor(p.hot), shadow: hexToColor(p.shadow),
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

/** A fresh registry, parked and on the light palette. Clocks.ts, Kits.tsx and CameraRig.tsx write the rest. */
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
  };
  applyPalette(u, PALETTES.light, PALETTES.light, 0);
  return u;
}
