// The frame driver's pure core (spec §6 Driver, §8 clocks, §12 no allocation in the frame loop). Driver.tsx calls
// applyFrame once per frame from the one useFrame; this module touches no React, no DOM and no renderer, so it runs
// in Node with plain uniform holders. Stage 2 writes the timeline, the environment, the latched reveals and every
// light at rest. Stage 3 layers the ignition, the ridge trickle, the pulse and the hut flicker over writeRestLights.
import * as THREE from 'three';
import type { EmitterId, Environment, SectionRange, Timeline } from '@/valley/types';
import { SECTIONS, sectionRanges } from '@/valley/sections';
import { timelineAt } from '@/valley/timeline';
import { environmentAt } from '@/valley/environment';
import { EMITTERS } from '@/valley/lights';
import { EMITTER_COUNT, EMITTER_INDEX, PROJECTED } from './projection';

export interface Uniform<T> { value: T }

/** Every value the driver writes. Shader materials share these holders by reference. */
export interface ValleyUniforms {
  uTime: Uniform<number>;            // ambient seconds; frozen under reduced motion
  uTod: Uniform<number>;
  uZenith: Uniform<THREE.Color>;
  uHorizon: Uniform<THREE.Color>;
  uEast: Uniform<THREE.Color>;
  uFogColor: Uniform<THREE.Color>;
  uFogNear: Uniform<number>;
  uFogFar: Uniform<number>;
  uSunDir: Uniform<THREE.Vector3>;
  uSunColor: Uniform<THREE.Color>;
  uSunIntensity: Uniform<number>;
  uHemiSky: Uniform<THREE.Color>;
  uHemiGround: Uniform<THREE.Color>;
  uStarAlpha: Uniform<number>;
  uMoonPos: Uniform<THREE.Vector3>;
  uMoonAlpha: Uniform<number>;
  uYaw: Uniform<number>;             // degrees
  uPitch: Uniform<number>;           // degrees
  uFovScale: Uniform<number>;
  uRidgeReveal: Uniform<number>;     // latched
  uHedgeReveal: Uniform<number>;     // latched
  uDarchT: Uniform<number>;
  uRain: Uniform<number>;
}

export function createUniforms(): ValleyUniforms {
  return {
    uTime: { value: 0 },
    uTod: { value: 0 },
    uZenith: { value: new THREE.Color() },
    uHorizon: { value: new THREE.Color() },
    uEast: { value: new THREE.Color() },
    uFogColor: { value: new THREE.Color() },
    uFogNear: { value: 40 },
    uFogFar: { value: 240 },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uSunColor: { value: new THREE.Color() },
    uSunIntensity: { value: 0 },
    uHemiSky: { value: new THREE.Color() },
    uHemiGround: { value: new THREE.Color() },
    uStarAlpha: { value: 0 },
    uMoonPos: { value: new THREE.Vector3(0, 1, 0) },
    uMoonAlpha: { value: 0 },
    uYaw: { value: 0 },
    uPitch: { value: 0 },
    uFovScale: { value: 1 },
    uRidgeReveal: { value: 0 },
    uHedgeReveal: { value: 0 },
    uDarchT: { value: 0 },
    uRain: { value: 0 },
  };
}

// The index contract's FrameInputs plus `portrait`, which timelineAt needs and the contract has no field for.
export interface FrameInputs {
  g: number; ranges: SectionRange[]; t: number; dt: number;
  introT: number | null; buildT: number | null; pulseT: number | null; flickerT: number | null;
  darchOverride?: number; reducedMotion: boolean;
  portrait?: boolean;
}
export interface FrameTargets {
  uniforms: ValleyUniforms;
  lit: Float32Array /* per emitter, EMITTERS order */;
  projected: Float32Array /* x,y,visible per emitter */;
  latched: { ridge: number; hedge: number };
}

export interface Frame { inputs: FrameInputs; targets: FrameTargets }

/** Fresh targets: by default new uniforms and a private projected array (tests, Stage 3 and 5 checks). */
export function createFrameTargets(
  uniforms: ValleyUniforms = createUniforms(), projected: Float32Array = new Float32Array(EMITTER_COUNT * 3),
): FrameTargets {
  return { uniforms, lit: new Float32Array(EMITTER_COUNT), projected, latched: { ridge: 0, hedge: 0 } };
}

/** The driver's frame: preallocated inputs and targets. `projected` defaults to the live PROJECTED the labels read. */
export function createFrame(uniforms: ValleyUniforms, projected: Float32Array = PROJECTED): Frame {
  return {
    inputs: {
      g: 0, ranges: [], t: 0, dt: 0, introT: null, buildT: null, pulseT: null, flickerT: null,
      reducedMotion: false, portrait: false,
    },
    targets: createFrameTargets(uniforms, projected),
  };
}

export const MAX_DT = 0.1;

/** Fills the driver's preallocated inputs in place. dt is clamped to [0, MAX_DT] so a background tab never jumps. */
export function setFrameInputs(
  inputs: FrameInputs, g: number, ranges: SectionRange[], t: number, dt: number,
  introT: number | null, reducedMotion: boolean, portrait: boolean,
): void {
  inputs.g = g;
  inputs.ranges = ranges;
  inputs.t = t;
  inputs.dt = Math.min(MAX_DT, Math.max(0, dt));
  inputs.introT = introT;
  inputs.reducedMotion = reducedMotion;
  inputs.portrait = portrait;
}

/** Stage 2's light at rest: every registered emitter lit, except the visitor, whose lot is empty until a build. */
export const REST_LIT: Float32Array = Float32Array.from(EMITTERS, (e) => (e.id === 'visitor' ? 0 : 1));

export function writeRestLights(lit: Float32Array): void {
  lit.set(REST_LIT);
}

// Ranges for a 900 px viewport from the section heights, used until the provider has measured the DOM.
const FALLBACK_RANGES: SectionRange[] = (() => {
  const vh = 900;
  let top = 0;
  const tops: number[] = [];
  for (const s of SECTIONS) {
    tops.push(top);
    top += (s.heightVh / 100) * vh;
  }
  return sectionRanges(tops, top, vh);
})();

function hexDigit(c: number): number {
  return c <= 57 ? c - 48 : (c | 32) - 87;
}

/** Parses '#rrggbb' (sRGB) into `out` without allocating. Anything else falls back to Color.set. */
export function hexToColor(hex: string, out: THREE.Color): THREE.Color {
  const o = hex.charCodeAt(0) === 35 ? 1 : 0;
  if (hex.length - o !== 6) return out.set(hex);
  let n = 0;
  for (let k = 0; k < 6; k++) n = n * 16 + hexDigit(hex.charCodeAt(o + k));
  return out.setHex(n, THREE.SRGBColorSpace);
}

function writeEnvironment(env: Environment, u: ValleyUniforms): void {
  hexToColor(env.zenith, u.uZenith.value);
  hexToColor(env.horizon, u.uHorizon.value);
  hexToColor(env.east, u.uEast.value);
  hexToColor(env.fogColor, u.uFogColor.value);
  u.uFogNear.value = env.fogNear;
  u.uFogFar.value = env.fogFar;
  u.uSunDir.value.set(env.sunDir[0], env.sunDir[1], env.sunDir[2]);
  hexToColor(env.sunColor, u.uSunColor.value);
  u.uSunIntensity.value = env.sunIntensity;
  hexToColor(env.hemiSky, u.uHemiSky.value);
  hexToColor(env.hemiGround, u.uHemiGround.value);
  u.uStarAlpha.value = env.starAlpha;
  u.uMoonPos.value.set(env.moonPos[0], env.moonPos[1], env.moonPos[2]);
  u.uMoonAlpha.value = env.moonAlpha;
}

// environmentAt returns frozen table entries: rewrite the colours only when the entry (or the uniforms) changes.
const written = { env: null as Environment | null, u: null as ValleyUniforms | null };

/** One frame of scene state. Allocation-free (timelineAt and environmentAt do not allocate either). */
export function applyFrame(inputs: FrameInputs, targets: FrameTargets): void {
  const u = targets.uniforms;
  const g = Number.isFinite(inputs.g) ? Math.min(1, Math.max(0, inputs.g)) : 0;
  const ranges = inputs.ranges.length > 0 ? inputs.ranges : FALLBACK_RANGES;
  const tl: Timeline = timelineAt(g, ranges, inputs.portrait === true);   // shared object: read it now, never keep it
  const env = environmentAt(tl.tod);
  if (env !== written.env || u !== written.u) {
    writeEnvironment(env, u);
    written.env = env;
    written.u = u;
  }

  u.uTod.value = tl.tod;
  u.uYaw.value = tl.view.yaw;
  u.uPitch.value = tl.view.pitch;
  u.uFovScale.value = tl.view.fovScale;

  const latched = targets.latched;
  if (tl.ridgeReveal > latched.ridge) latched.ridge = tl.ridgeReveal;
  if (tl.hedgeReveal > latched.hedge) latched.hedge = tl.hedgeReveal;
  u.uRidgeReveal.value = latched.ridge;
  u.uHedgeReveal.value = latched.hedge;
  u.uDarchT.value = inputs.darchOverride ?? tl.darchT;
  u.uRain.value = inputs.reducedMotion ? 0 : tl.rain;
  if (!inputs.reducedMotion) u.uTime.value = inputs.t;

  writeRestLights(targets.lit);
}

/** out[i] = lit[map[i]] for i < count. Returns true when any slot changed, so the caller uploads only then. */
export function scatterLit(lit: Float32Array, map: Uint8Array, count: number, out: Float32Array): boolean {
  let changed = false;
  const n = Math.min(count, map.length, out.length);
  for (let i = 0; i < n; i++) {
    const v = lit[map[i]];
    if (out[i] !== v) {
      out[i] = v;
      changed = true;
    }
  }
  return changed;
}

/** A per-instance level buffer fed from the per-emitter levels: windows (Task 2.5) and glow (Task 2.6). */
export interface LitSink { lit: Float32Array; map: Uint8Array; count: number; attr: THREE.BufferAttribute | null }

export interface PointLightSpec {
  id: EmitterId;
  place: 'hut' | 'mill' | 'kalshiLamp' | 'lot';
  lift: number;      // metres above PLACES[place]
  forward: number;   // metres toward +z (the lit face)
  base: number;      // intensity at level 1, candela
  distance: number;
}

/** Spec §6: four point lights at the hut, the mill, the kalshi lamp and the visitor house. */
export const POINT_LIGHTS: readonly PointLightSpec[] = [
  { id: 'hut', place: 'hut', lift: 1.4, forward: 2.2, base: 6, distance: 14 },
  { id: 'mill', place: 'mill', lift: 4.5, forward: 5, base: 20, distance: 30 },
  { id: 'kalshiLamp', place: 'kalshiLamp', lift: 1.3, forward: 0.4, base: 4, distance: 10 },
  { id: 'visitor', place: 'lot', lift: 1.6, forward: 2, base: 6, distance: 14 },
];

export interface PointLightRef { emitter: number; base: number; light: { intensity: number } | null }

export interface SceneRefs {
  fog: { near: number; far: number } | null;
  sun: { position: THREE.Vector3; intensity: number } | null;
  points: PointLightRef[];
  windows: LitSink | null;
  glow: LitSink | null;
}

export function createSceneRefs(): SceneRefs {
  return {
    fog: null,
    sun: null,
    points: POINT_LIGHTS.map((p) => ({ emitter: EMITTER_INDEX[p.id], base: p.base, light: null })),
    windows: null,
    glow: null,
  };
}

// Setters, so components register objects through a call instead of assigning into a prop (react-hooks lint).
export function attachFog(refs: SceneRefs, fog: { near: number; far: number } | null): void { refs.fog = fog; }
export function attachSun(refs: SceneRefs, sun: { position: THREE.Vector3; intensity: number } | null): void { refs.sun = sun; }
export function attachPointLight(refs: SceneRefs, k: number, light: { intensity: number } | null): void {
  if (refs.points[k]) refs.points[k].light = light;
}
export function attachSink(refs: SceneRefs, which: 'windows' | 'glow', sink: LitSink | null): void {
  refs[which] = sink;
}

export const SUN_DISTANCE = 80;

function sinkLit(sink: LitSink | null, lit: Float32Array): void {
  if (!sink) return;
  if (scatterLit(lit, sink.map, sink.count, sink.lit) && sink.attr) sink.attr.needsUpdate = true;
}

/** Copies this frame's uniforms and levels onto the scene objects that are not shader uniforms. Allocation-free. */
export function syncScene(refs: SceneRefs, u: ValleyUniforms, lit: Float32Array): void {
  const fog = refs.fog;
  if (fog) {
    fog.near = u.uFogNear.value;
    fog.far = u.uFogFar.value;
  }
  const sun = refs.sun;
  if (sun) {
    sun.position.copy(u.uSunDir.value).normalize().multiplyScalar(SUN_DISTANCE);
    sun.intensity = u.uSunIntensity.value;
  }
  for (let k = 0; k < refs.points.length; k++) {
    const p = refs.points[k];
    if (p.light) p.light.intensity = p.base * lit[p.emitter];
  }
  sinkLit(refs.windows, lit);
  sinkLit(refs.glow, lit);
}
