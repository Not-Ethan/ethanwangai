import * as THREE from "three";
import { segment, lerp } from "@/lib/scroll";

// Each "mood" is a snapshot of the forest's atmosphere at a point in the scroll.
// As you scroll, the scene continuously blends between these — turning the
// descent through the forest into a single day, from first light to nightfall.

export type Mood = {
  fog: string; // fog + sky colour (the scene background blends into this)
  fogDensity: number;
  sun: string; // colour of the key light / sun-moon orb
  sunIntensity: number;
  sunPos: [number, number, number]; // offset from the camera
  ambient: string;
  ambientIntensity: number;
  ground: string;
  foliage: string; // base tint applied to the trees
  fireflies: number; // 0..1 opacity of the fireflies
  motes: number; // 0..1 opacity of the drifting pollen/dust
  sunSize: number;
};

export const MOODS: Mood[] = [
  // 0 — First light. Cold mist, a low warm sun bleeding through the trunks.
  {
    fog: "#1b2a2b",
    fogDensity: 0.03,
    sun: "#ffca7a",
    sunIntensity: 2.1,
    sunPos: [-10, 7, -34],
    ambient: "#2a3d44",
    ambientIntensity: 0.5,
    ground: "#0d1512",
    foliage: "#24463a",
    fireflies: 0,
    motes: 0.55,
    sunSize: 2.6,
  },
  // 1 — Morning. Mist lifts, greens warm up.
  {
    fog: "#2a4438",
    fogDensity: 0.027,
    sun: "#ffe0a8",
    sunIntensity: 2.6,
    sunPos: [-6, 10, -36],
    ambient: "#37564a",
    ambientIntensity: 0.65,
    ground: "#10201a",
    foliage: "#2c5142",
    fireflies: 0,
    motes: 0.8,
    sunSize: 2.4,
  },
  // 2 — Midday. Open, luminous canopy.
  {
    fog: "#395a48",
    fogDensity: 0.023,
    sun: "#fff4d8",
    sunIntensity: 3.0,
    sunPos: [4, 14, -38],
    ambient: "#4a6b59",
    ambientIntensity: 0.8,
    ground: "#142a20",
    foliage: "#356050",
    fireflies: 0,
    motes: 0.7,
    sunSize: 2.2,
  },
  // 3 — Golden afternoon. Long warm light through the leaves.
  {
    fog: "#52553a",
    fogDensity: 0.025,
    sun: "#ffc777",
    sunIntensity: 3.1,
    sunPos: [10, 8, -36],
    ambient: "#56583f",
    ambientIntensity: 0.72,
    ground: "#1c2114",
    foliage: "#46553a",
    fireflies: 0.15,
    motes: 0.6,
    sunSize: 2.8,
  },
  // 4 — Dusk. Violet shadow pooling, first fireflies wake.
  {
    fog: "#332e4a",
    fogDensity: 0.03,
    sun: "#ff8f5a",
    sunIntensity: 2.2,
    sunPos: [13, 3, -34],
    ambient: "#3a3556",
    ambientIntensity: 0.6,
    ground: "#15131f",
    foliage: "#2f3146",
    fireflies: 0.55,
    motes: 0.35,
    sunSize: 3.2,
  },
  // 5 — Nightfall. A cool moon, a forest full of fireflies and stars.
  {
    fog: "#0b1322",
    fogDensity: 0.036,
    sun: "#aec6ff",
    sunIntensity: 1.5,
    sunPos: [7, 13, -40],
    ambient: "#162236",
    ambientIntensity: 0.55,
    ground: "#080c14",
    foliage: "#1b2740",
    fireflies: 1,
    motes: 0.12,
    sunSize: 2.0,
  },
];

// Scratch colour objects reused every frame (no per-frame allocations).
const _ca = new THREE.Color();
const _cb = new THREE.Color();

function blendColorInto(target: THREE.Color, a: string, b: string, t: number) {
  _ca.set(a);
  _cb.set(b);
  target.copy(_ca).lerp(_cb, t);
}

export type ResolvedMood = {
  fog: THREE.Color;
  fogDensity: number;
  sun: THREE.Color;
  sunIntensity: number;
  sunPos: THREE.Vector3;
  ambient: THREE.Color;
  ambientIntensity: number;
  ground: THREE.Color;
  foliage: THREE.Color;
  fireflies: number;
  motes: number;
  sunSize: number;
};

export function makeResolvedMood(): ResolvedMood {
  return {
    fog: new THREE.Color(),
    fogDensity: 0,
    sun: new THREE.Color(),
    sunIntensity: 0,
    sunPos: new THREE.Vector3(),
    ambient: new THREE.Color(),
    ambientIntensity: 0,
    ground: new THREE.Color(),
    foliage: new THREE.Color(),
    fireflies: 0,
    motes: 0,
    sunSize: 0,
  };
}

/** Resolve the blended mood for the given progress into a reusable object. */
export function resolveMood(progress: number, out: ResolvedMood) {
  const { a, b, t } = segment(progress, MOODS.length);
  const ma = MOODS[a];
  const mb = MOODS[b];

  blendColorInto(out.fog, ma.fog, mb.fog, t);
  blendColorInto(out.sun, ma.sun, mb.sun, t);
  blendColorInto(out.ambient, ma.ambient, mb.ambient, t);
  blendColorInto(out.ground, ma.ground, mb.ground, t);
  blendColorInto(out.foliage, ma.foliage, mb.foliage, t);

  out.fogDensity = lerp(ma.fogDensity, mb.fogDensity, t);
  out.sunIntensity = lerp(ma.sunIntensity, mb.sunIntensity, t);
  out.ambientIntensity = lerp(ma.ambientIntensity, mb.ambientIntensity, t);
  out.fireflies = lerp(ma.fireflies, mb.fireflies, t);
  out.motes = lerp(ma.motes, mb.motes, t);
  out.sunSize = lerp(ma.sunSize, mb.sunSize, t);

  out.sunPos.set(
    lerp(ma.sunPos[0], mb.sunPos[0], t),
    lerp(ma.sunPos[1], mb.sunPos[1], t),
    lerp(ma.sunPos[2], mb.sunPos[2], t)
  );

  return out;
}
