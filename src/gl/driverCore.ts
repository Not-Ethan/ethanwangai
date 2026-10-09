// The frame driver's pure core (spec §6 Driver, §8 clocks, §12 no allocation in the frame loop). Driver.tsx calls
// applyFrame once per frame from the one useFrame; this module touches no React, no DOM and no renderer, so it runs
// in Node with plain uniform holders. Stage 2 writes the timeline, the environment, the latched reveals and every
// light at rest. Stage 3 layers the ignition, the ridge trickle, the pulse and the hut flicker over writeRestLights.
import * as THREE from 'three';
import type { EmitterId, Environment, SectionRange, Timeline, View } from '@/valley/types';
import { SECTIONS, sectionRanges } from '@/valley/sections';
import { timelineAt } from '@/valley/timeline';
import { environmentAt } from '@/valley/environment';
import { EMITTERS } from '@/valley/lights';
import { BUILD_SECONDS, buildStateAt } from '@/valley/build';
import { EMITTER_COUNT, EMITTER_INDEX, PROJECTED } from './projection';
import { cutView } from './motion';
import { applyLights, createLightUniforms, type LightUniforms } from './lightsFrame';

export interface Uniform<T> { value: T }

/** Every value the driver writes. Shader materials share these holders by reference. */
export interface ValleyUniforms extends LightUniforms {
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

/**
 * Number holders get their own class so V8 keeps `value` as an unboxed double field. The `{ value }` literal shape is
 * shared with the Color and Vector3 holders, which generalises the field to tagged and makes every per-frame number
 * store allocate a heap number (measured: 60 to 110 bytes per applyFrame call).
 */
class NumberUniform implements Uniform<number> {
  value: number;
  constructor(v: number) { this.value = v + 0.5 - 0.5; this.value = v; }
}
class ObjectUniform<T> implements Uniform<T> {
  value: T;
  constructor(v: T) { this.value = v; }
}
const num = (v: number): Uniform<number> => new NumberUniform(v);

export function createUniforms(): ValleyUniforms {
  return {
    ...createLightUniforms(),
    uTime: num(0),
    uTod: num(0),
    uZenith: new ObjectUniform(new THREE.Color()),
    uHorizon: new ObjectUniform(new THREE.Color()),
    uEast: new ObjectUniform(new THREE.Color()),
    uFogColor: new ObjectUniform(new THREE.Color()),
    uFogNear: num(40),
    uFogFar: num(240),
    uSunDir: new ObjectUniform(new THREE.Vector3(0, 1, 0)),
    uSunColor: new ObjectUniform(new THREE.Color()),
    uSunIntensity: num(0),
    uHemiSky: new ObjectUniform(new THREE.Color()),
    uHemiGround: new ObjectUniform(new THREE.Color()),
    uStarAlpha: num(0),
    uMoonPos: new ObjectUniform(new THREE.Vector3(0, 1, 0)),
    uMoonAlpha: num(0),
    uYaw: num(0),
    uPitch: num(0),
    uFovScale: num(1),
    uRidgeReveal: num(0),
    uHedgeReveal: num(0),
    uDarchT: num(0),
    uRain: num(0),
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

// ---- The visitor build clock (spec 5.5). buildT = wall seconds since the current build's t = 0. ----
export const LIGHT_OUT_SECONDS = 0.2;
export const WINDOW_LIT_AT = 4.25;
const WINDOW_RAMP = BUILD_SECONDS - WINDOW_LIT_AT;   // the window is full when the clock reads 4.40
const SCAFFOLD_COUNT = 18;
const DONE_CLOCK = buildStateAt(BUILD_SECONDS).clock;
const VISITOR_INDEX = EMITTERS.findIndex((e) => e.id === 'visitor');

export const BUILD_PHASE = { none: 0, lightOut: 1, building: 2, done: 3 } as const;
export type BuildPhase = (typeof BUILD_PHASE)[keyof typeof BUILD_PHASE];

export interface BuildClock { start: number | null }
export interface BuildTargets { phase: BuildPhase; cut: number; grow: Float32Array; clock: string }

export function createBuildTargets(): BuildTargets {
  return { phase: BUILD_PHASE.none, cut: 0, grow: new Float32Array(SCAFFOLD_COUNT), clock: '0.00' };
}

/**
 * A new sentence at wall time t. An existing house goes dark first. Reduced motion (spec 11) cuts straight to the
 * built house: start = -Infinity, like a restored house, so no light-out and no scaffold.
 */
export function startBuild(clock: BuildClock, t: number, hadHouse: boolean, reducedMotion: boolean): void {
  clock.start = reducedMotion ? -Infinity : t + (hadHouse ? LIGHT_OUT_SECONDS : 0);
}

/** A house restored from localStorage: built since forever (spec 4.7 "rebuilt silently at load"). */
export function restoreBuild(clock: BuildClock): void {
  clock.start = -Infinity;
}

export function buildTAt(clock: BuildClock, t: number): number | null {
  return clock.start === null ? null : t - clock.start;
}

export function buildPhaseAt(buildT: number | null): BuildPhase {
  if (buildT === null) return BUILD_PHASE.none;
  if (buildT < 0) return BUILD_PHASE.lightOut;
  if (buildT < BUILD_SECONDS) return BUILD_PHASE.building;
  return BUILD_PHASE.done;
}

/** Multiplier on the visitor emitter's brightness. Pure arithmetic: safe inside applyFrame. */
export function visitorFactor(buildT: number | null): number {
  if (buildT === null) return 0;
  if (buildT < 0) return Math.min(1, -buildT / LIGHT_OUT_SECONDS);
  if (buildT < WINDOW_LIT_AT) return 0;
  return Math.min(1, (buildT - WINDOW_LIT_AT) / WINDOW_RAMP);
}

/** The house's clip, scaffold and clock for this frame. Called by the visitor bridge after applyFrame, not inside it. */
export function applyBuild(buildT: number | null, out: BuildTargets): void {
  const phase = buildPhaseAt(buildT);
  out.phase = phase;
  if (phase === BUILD_PHASE.building) {
    const s = buildStateAt(buildT as number);
    out.cut = s.cut;
    out.grow.fill(0);
    for (const b of s.scaffold) out.grow[b.idx] = b.grow;
    out.clock = s.clock;
    return;
  }
  out.grow.fill(0);
  out.cut = phase === BUILD_PHASE.none ? 0 : 1;
  out.clock = phase === BUILD_PHASE.done ? DONE_CLOCK : '0.00';
}

/** Stage 2's light at rest: every registered emitter lit, except the visitor, whose lot is empty until a build. */
export const REST_LIT: Float32Array = Float32Array.from(EMITTERS, (e) => (e.id === 'visitor' || e.id === 'mill' ? 0 : 1));

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
const CUT: View = { yaw: 0, pitch: 0, fovScale: 1 };
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
  // Reduced motion cuts view offsets at section boundaries instead of easing (spec 11).
  const view = inputs.reducedMotion ? cutView(g, ranges, inputs.portrait === true, CUT) : tl.view;
  u.uYaw.value = view.yaw;
  u.uPitch.value = view.pitch;
  u.uFovScale.value = view.fovScale;

  if (!inputs.reducedMotion) u.uTime.value = inputs.t;

  applyLights(inputs, tl, u, targets.lit, targets.latched);
  targets.lit[VISITOR_INDEX] *= visitorFactor(inputs.buildT);
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
/** `source.count` is read every frame, so a WindowSet that grows (hillside and visitor windows, Stage 4) lights its new slots. */
export interface LitSink { lit: Float32Array; map: Uint8Array; source: { readonly count: number }; attr: THREE.BufferAttribute | null }

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
  { id: 'mill', place: 'mill', lift: 1.2, forward: 7, base: 8, distance: 22 },
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
  if (scatterLit(lit, sink.map, sink.source.count, sink.lit) && sink.attr) sink.attr.needsUpdate = true;
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
