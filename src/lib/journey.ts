import * as THREE from "three";

// ————————————————————————————————————————————————
// The journey: scroll progress 0→1 is one walk through
// the forest, dawn to midnight. Everything (camera, sky,
// fog, lights, particles) derives from that one scalar.
// ————————————————————————————————————————————————

export const stations = [
  { id: "hero", label: "Dawn", nav: "Home", t: 0.0 },
  { id: "about", label: "Morning", nav: "About", t: 0.25 },
  { id: "experience", label: "Golden Hour", nav: "Experience", t: 0.5 },
  { id: "projects", label: "Dusk", nav: "Projects", t: 0.75 },
  { id: "contact", label: "Midnight", nav: "Contact", t: 1.0 },
] as const;

// The walk crosses five biomes: dense forest (dawn) → wildflower
// meadow (morning) → lakeshore (golden hour) → foothill grove (dusk)
// → alpine summit above the treeline (midnight). The trail climbs
// out of the valley over the last third.

/** Height of the trail itself at a given z — the mountain ascent. */
export function trailElevation(z: number): number {
  const ascent = THREE.MathUtils.smoothstep(-z, 30, 80);
  return Math.pow(ascent, 1.35) * 24 + Math.sin(z * 0.05) * 0.6;
}

function trailPoint(x: number, z: number, lift: number): THREE.Vector3 {
  return new THREE.Vector3(x, trailElevation(z) + lift, z);
}

// Camera walks this path (arc-length parameterized on sample).
export const cameraCurve = new THREE.CatmullRomCurve3(
  [
    trailPoint(0, 46, 3.4),
    trailPoint(2.6, 28, 3.1),
    trailPoint(-3.2, 10, 2.9),
    trailPoint(3.6, -10, 3.3),
    trailPoint(-2.6, -30, 3.0),
    trailPoint(1.8, -52, 3.2),
    trailPoint(-0.6, -68, 3.4),
    trailPoint(0, -80, 3.6),
  ],
  false,
  "catmullrom",
  0.5
);

// Time-of-day keyframes. t matches scroll progress.
export interface SkyKey {
  t: number;
  top: string; // sky zenith
  mid: string; // sky middle band
  horizon: string; // sky at horizon
  fog: string; // fog / atmosphere color
  fogDensity: number;
  sun: string; // directional light color
  sunIntensity: number;
  hemiSky: string; // hemisphere light sky color
  hemiGround: string;
  hemiIntensity: number;
  ambient: number;
}

export const skyKeys: SkyKey[] = [
  {
    // dawn — indigo above, ember horizon, rosy mist
    t: 0.0,
    top: "#20284e",
    mid: "#6e5377",
    horizon: "#f2a65e",
    fog: "#a98087",
    fogDensity: 0.015,
    sun: "#ffc687",
    sunIntensity: 1.5,
    hemiSky: "#8d7d9e",
    hemiGround: "#3c3a34",
    hemiIntensity: 0.55,
    ambient: 0.22,
  },
  {
    // late morning — clear, cool blue, thin haze
    t: 0.25,
    top: "#3f74ad",
    mid: "#8fb7d8",
    horizon: "#e9f0da",
    fog: "#b9cdc9",
    fogDensity: 0.009,
    sun: "#fff3d6",
    sunIntensity: 2.1,
    hemiSky: "#bcd4e4",
    hemiGround: "#4c5a41",
    hemiIntensity: 0.75,
    ambient: 0.3,
  },
  {
    // golden hour — everything amber
    t: 0.5,
    top: "#41598f",
    mid: "#c8875f",
    horizon: "#ffc966",
    fog: "#cf9a68",
    fogDensity: 0.011,
    sun: "#ffb35c",
    sunIntensity: 1.9,
    hemiSky: "#c9a284",
    hemiGround: "#4a4534",
    hemiIntensity: 0.6,
    ambient: 0.26,
  },
  {
    // dusk — violet, last rose light on the horizon
    t: 0.75,
    top: "#191c40",
    mid: "#4c3b66",
    horizon: "#c96f72",
    fog: "#57496a",
    fogDensity: 0.013,
    sun: "#e78d78",
    sunIntensity: 0.9,
    hemiSky: "#5d5378",
    hemiGround: "#2c2b30",
    hemiIntensity: 0.42,
    ambient: 0.2,
  },
  {
    // midnight — near-black blue, moonlight
    t: 1.0,
    top: "#04070f",
    mid: "#0b1424",
    horizon: "#142238",
    fog: "#0d1723",
    fogDensity: 0.015,
    sun: "#9fc0dd",
    sunIntensity: 0.65,
    hemiSky: "#25344a",
    hemiGround: "#101610",
    hemiIntensity: 0.3,
    ambient: 0.16,
  },
];

const c0 = new THREE.Color();
const c1 = new THREE.Color();

/** Sample the sky timeline at progress p (0–1) into `out`. */
export function sampleSky(p: number, out: SampledSky): SampledSky {
  const t = THREE.MathUtils.clamp(p, 0, 1);
  let i = 0;
  while (i < skyKeys.length - 2 && t > skyKeys[i + 1].t) i++;
  const a = skyKeys[i];
  const b = skyKeys[i + 1];
  const f = THREE.MathUtils.smoothstep((t - a.t) / (b.t - a.t), 0, 1);

  const lerpColor = (target: THREE.Color, ca: string, cb: string) => {
    c0.set(ca);
    c1.set(cb);
    target.copy(c0).lerp(c1, f);
  };

  lerpColor(out.top, a.top, b.top);
  lerpColor(out.mid, a.mid, b.mid);
  lerpColor(out.horizon, a.horizon, b.horizon);
  lerpColor(out.fog, a.fog, b.fog);
  lerpColor(out.sun, a.sun, b.sun);
  lerpColor(out.hemiSky, a.hemiSky, b.hemiSky);
  lerpColor(out.hemiGround, a.hemiGround, b.hemiGround);
  out.fogDensity = THREE.MathUtils.lerp(a.fogDensity, b.fogDensity, f);
  out.sunIntensity = THREE.MathUtils.lerp(a.sunIntensity, b.sunIntensity, f);
  out.hemiIntensity = THREE.MathUtils.lerp(a.hemiIntensity, b.hemiIntensity, f);
  out.ambient = THREE.MathUtils.lerp(a.ambient, b.ambient, f);
  return out;
}

export interface SampledSky {
  top: THREE.Color;
  mid: THREE.Color;
  horizon: THREE.Color;
  fog: THREE.Color;
  sun: THREE.Color;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  fogDensity: number;
  sunIntensity: number;
  hemiIntensity: number;
  ambient: number;
}

export function createSampledSky(): SampledSky {
  return {
    top: new THREE.Color(),
    mid: new THREE.Color(),
    horizon: new THREE.Color(),
    fog: new THREE.Color(),
    sun: new THREE.Color(),
    hemiSky: new THREE.Color(),
    hemiGround: new THREE.Color(),
    fogDensity: 0.015,
    sunIntensity: 1,
    hemiIntensity: 0.6,
    ambient: 0.25,
  };
}

/** 0 at day, 1 deep at night — drives fireflies, stars, mushroom glow. */
export function nightFactor(p: number): number {
  return THREE.MathUtils.smoothstep(p, 0.55, 0.85);
}

/** 1 at dawn only — drives god rays and dawn mist. */
export function dawnFactor(p: number): number {
  return 1 - THREE.MathUtils.smoothstep(p, 0.05, 0.3);
}

/** 1 around late morning — drives sunlit dust motes. */
export function dayFactor(p: number): number {
  return (
    THREE.MathUtils.smoothstep(p, 0.08, 0.25) *
    (1 - THREE.MathUtils.smoothstep(p, 0.45, 0.65))
  );
}

// Deterministic RNG so the forest is identical every visit
// (and across server/client — no hydration surprises).
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Cheap value noise for terrain (deterministic, no deps). */
export function makeNoise2D(seed: number) {
  const rand = mulberry32(seed);
  const size = 64;
  const grid: number[] = new Array(size * size);
  for (let i = 0; i < grid.length; i++) grid[i] = rand();
  const at = (x: number, y: number) =>
    grid[((y & (size - 1)) * size + (x & (size - 1))) >>> 0];
  const fade = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = fade(xf);
    const v = fade(yf);
    const a = at(xi, yi);
    const b = at(xi + 1, yi);
    const c = at(xi, yi + 1);
    const d = at(xi + 1, yi + 1);
    return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
  };
}

/** Journey clock: progress → time of day, 05:30 → 00:00. */
export function journeyClock(p: number): string {
  const startMin = 5.5 * 60;
  const endMin = 24 * 60;
  const m = Math.round(startMin + THREE.MathUtils.clamp(p, 0, 1) * (endMin - startMin));
  const hh = Math.floor(m / 60) % 24;
  const mm = m % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
