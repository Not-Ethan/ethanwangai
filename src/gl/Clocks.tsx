'use client';
// The per-frame driver (design §8): useFrame at priority −1, before CameraRig. Each frame it reads the scroll refs,
// evaluates sceneState(g), steps the pure clocks (clocksLogic.ts), and writes every uniform, the pose CameraRig
// applies, the shadow-camera fit, the 300 ms palette lerp and the hud. It also owns the intro (§3.1): the hero
// compile is a 2.2 s tween Scene starts at T0, the end of the cross-fade, and the rebuild control restarts. It owns the
// visitor's switch-on too (§3.1 · 09): Yours dispatches dbso:visitor:build / :clear / :key, the next frame tears a
// built sentence down over 0.6 s, uploads the new one into the reserve (visitor.ts) and compiles it over 1.4 s, and
// keystrokes reseed the slot's scan period, which the frame integrates into the bar's phase. Under reduced motion (§11)
// the scrubbed compiles become 300 ms fades keyed on their build windows, the visitor compiles over 300 ms, the fill,
// velocity and lean kick are off, and the pose it hands CameraRig is the pose table's nearest station, not the scrubbed
// curve. No React state is set on this path; every write lands in an object allocated once. stepFrame is the whole
// frame as a function of (driver, dt, elapsed), so the tests drive it without a renderer.
import { useEffect, useMemo, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MACHINE, MACHINE_COUNT, type LayoutResult, type MachineSummary, type Tier } from '@/bench/types';
import { createSceneState, sceneState, type SceneState } from '@/bench/sceneState';
import { CAMERA_KEYS } from '@/bench/camera';
import { TIMING } from '@/bench/timing';
import { PALETTES, type Palette, type ThemeName } from '@/theme/palettes';
import { useScroll, type ScrollState } from '@/scroll/ScrollProvider';
import { createClockState, motionScale, stepClocks, type ClockInputs, type ClockState } from './clocksLogic';
import { applyPalette, type BenchUniforms } from './material/uniforms';
import { createTween, type Tween } from './tween';
import { KEY_LIGHT } from './Lights';
import { lightRef } from './registry';
import { hud, type HudPose } from './hud';
import { dbso, exposeDebug } from './debug';
import { planVisitor, uploadVisitor, clearVisitor, type VisitorPlan } from './visitor';

// ---- palette: the 300 ms theme lerp, in linear space through applyPalette ----------------------------------------

export const PALETTE_LERP_S = 0.3;
export interface PaletteLerp { from: Palette; to: Palette; t: number }

export function readTheme(): ThemeName {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

/** Snaps the uniforms to `theme` and returns a finished lerp sitting on it. */
export function createPaletteLerp(u: BenchUniforms, theme: ThemeName): PaletteLerp {
  const p = PALETTES[theme];
  applyPalette(u, p, p, 1);
  return { from: p, to: p, t: 1 };
}

/** Retargets toward `theme`. A toggle mid-lerp reverses from the colours on screen: lerp(A, B, t) == lerp(B, A, 1 − t). */
export function retargetPalette(l: PaletteLerp, theme: ThemeName): void {
  const to = PALETTES[theme];
  if (l.to === to) return;
  l.from = l.to;
  l.to = to;
  l.t = 1 - l.t;
}

export function stepPalette(l: PaletteLerp, u: BenchUniforms, dt: number): void {
  if (l.t >= 1) return;
  l.t = Math.min(1, l.t + dt / PALETTE_LERP_S);
  applyPalette(u, l.from, l.to, l.t);
}

// ---- travel axis: the unit direction the camera moved this frame, for the velocity stretch --------------------------

const STILL = 1e-6;

/** Writes the normalized camera travel prev → next into `out`, or the bed axis (1, 0, 0) when the camera is still. */
export function travelAxis(prev: THREE.Vector3, next: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
  out.subVectors(next, prev);
  const len = out.length();
  return len > STILL ? out.multiplyScalar(1 / len) : out.set(1, 0, 0);
}

// ---- shadow fit: the key light's orthographic camera over the active machine ± 3, damped ---------------------------

export const SHADOW_MARGIN = 3;
export const SHADOW_FIT_TAU = 0.3;
/** The light stands this far from the fit box's centre along the key direction; near/far bracket the box around it. */
export const SHADOW_DISTANCE = 30;
const KEY_DIR = new THREE.Vector3(...KEY_LIGHT.position).normalize();
const UP = new THREE.Vector3(0, 1, 0);
// Matrix4.lookAt's frame for a camera at +KEY_DIR looking at the target: local z = KEY_DIR, x = up × z, y = z × x.
const SHADOW_X = new THREE.Vector3().crossVectors(UP, KEY_DIR).normalize();
const SHADOW_Y = new THREE.Vector3().crossVectors(KEY_DIR, SHADOW_X);

export interface ShadowFit { min: THREE.Vector3; max: THREE.Vector3; primed: boolean }
export function createShadowFit(): ShadowFit {
  return { min: new THREE.Vector3(), max: new THREE.Vector3(), primed: false };
}

const _tmin = new THREE.Vector3(), _tmax = new THREE.Vector3(), _center = new THREE.Vector3(), _half = new THREE.Vector3();
/** Half-extent of an axis-aligned box with half-size `h` projected onto the unit axis `a`. */
const extentAlong = (h: THREE.Vector3, a: THREE.Vector3) => h.x * Math.abs(a.x) + h.y * Math.abs(a.y) + h.z * Math.abs(a.z);

/**
 * Damps the fit box toward the machine's bounds ± SHADOW_MARGIN (snapping on the first call) and fits the light's
 * orthographic shadow camera to it: target at the box centre, light SHADOW_DISTANCE up the key direction, extents
 * the box's projection onto the shadow camera's axes. The light's direction never changes, so the lighting does not.
 */
export function fitShadowCamera(light: THREE.DirectionalLight, m: MachineSummary, fit: ShadowFit, dt: number): void {
  _tmin.fromArray(m.min).subScalar(SHADOW_MARGIN);
  _tmax.fromArray(m.max).addScalar(SHADOW_MARGIN);
  if (fit.primed) {
    const k = 1 - Math.exp(-dt / SHADOW_FIT_TAU);
    fit.min.lerp(_tmin, k);
    fit.max.lerp(_tmax, k);
  } else {
    fit.min.copy(_tmin);
    fit.max.copy(_tmax);
    fit.primed = true;
  }
  _center.addVectors(fit.min, fit.max).multiplyScalar(0.5);
  _half.subVectors(fit.max, fit.min).multiplyScalar(0.5);
  light.target.position.copy(_center);
  light.target.updateMatrixWorld();   // the target is not in the scene graph; three reads its matrixWorld
  light.position.copy(_center).addScaledVector(KEY_DIR, SHADOW_DISTANCE);
  const cam = light.shadow.camera;
  const ex = extentAlong(_half, SHADOW_X), ey = extentAlong(_half, SHADOW_Y), ez = extentAlong(_half, KEY_DIR);
  cam.left = -ex; cam.right = ex; cam.top = ey; cam.bottom = -ey;
  cam.near = Math.max(0.1, SHADOW_DISTANCE - ez);
  cam.far = SHADOW_DISTANCE + ez;
  cam.updateProjectionMatrix();
}

// ---- inked count: the ladder's `parts`, from births and compile alone -----------------------------------------------

/** Below this assembly factor the fragment shader draws pencil (fragment.glsl.ts: step(0.6, vA)). */
export const INK_THRESHOLD = 0.6;
/** smoothstep(INK_T) == INK_THRESHOLD: how far into its lock window a part turns to ink. */
export const INK_T = (() => {
  let lo = 0, hi = 1;
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (mid * mid * (3 - 2 * mid) < INK_THRESHOLD) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
})();

/** Each machine's births sorted ascending, so a frame's inked count is one binary search. */
export function sortedBirths(result: LayoutResult): Float64Array[] {
  const lists: number[][] = Array.from({ length: MACHINE_COUNT }, () => []);
  for (const p of result.parts) lists[p.machine].push(p.birth);
  return lists.map((l) => Float64Array.from(l).sort());
}

/** Parts drawn as ink at `compile`: those whose lock window (lock0 + birth · lockSpan, + lockW) is INK_T past. */
export function inkedCount(births: Float64Array, compile: number): number {
  const birthMax = (compile - TIMING.lock0 - INK_T * TIMING.lockW) / TIMING.lockSpan;
  let lo = 0, hi = births.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (births[mid] <= birthMax) lo = mid + 1; else hi = mid; }
  return lo;
}

// ---- the intro: T0 and the hero compile tween (design §3.1, §8 clock 2) ---------------------------------------------

/** `?built=<0|1>`: 1 pins every compile to 1, 0 pins the hero to 0 so the intro never runs; null when absent or anything else. */
export function builtOverride(search: string): 0 | 1 | null {
  const v = new URLSearchParams(search).get('built');
  return v === '1' ? 1 : v === '0' ? 0 : null;
}
/** `?built=1`: every machine built and running from the first frame, so gate stills can be taken at any section. */
export function isBuilt(search: string): boolean {
  return builtOverride(search) === 1;
}
/** `?freeze=<s>`: seconds after T0 to hold the intro at, for the gate stills; null when absent or not a number ≥ 0. */
export function freezeOverride(search: string): number | null {
  const v = new URLSearchParams(search).get('freeze');
  if (v === null || v.trim() === '') return null;
  const s = Number(v);
  return Number.isFinite(s) && s >= 0 ? s : null;
}
/**
 * The hero compile the query or the visitor's motion setting pins, or null when the tween runs: `?built=1` → 1,
 * `?built=0` → 0, `?freeze=<s>` → min(1, s / heroCompileS), reduced motion → 1 (§11: intro skipped, the quoter built).
 */
export function pinnedCompile(search: string, reducedMotion: boolean): number | null {
  const built = builtOverride(search);
  if (built !== null) return built;
  const freeze = freezeOverride(search);
  if (freeze !== null) return Math.min(1, freeze / TIMING.heroCompileS);
  return reducedMotion ? 1 : null;
}

export interface Intro { tween: Tween; pending: boolean }
export function createIntro(): Intro {
  return { tween: createTween(TIMING.heroCompileS), pending: false };
}
/** The page's one intro. It outlives a driver rebuild (a tier change), so a resize mid-visit never sends the quoter back to pencil. */
export const intro: Intro = createIntro();
/**
 * T0: Scene calls this at the end of the cross-fade, and the `dbso:rebuild` listener on every rebuild. The next frame
 * starts the hero tween from 0 on the renderer's clock and records T0, so the tween's origin is a frame the scene drew.
 */
export function startIntro(): void {
  intro.pending = true;
}

// ---- reduced motion (design §11): the scrubbed compiles as fades, the camera on the pose table's stations -----------

/** Reduced motion's compile fade, s: a scrubbed compile, and the visitor's build and teardown, each run this long. */
export const REDUCED_COMPILE_S = 0.3;

export interface CompileFades { to: Int8Array; tweens: Tween[]; out: (number | null)[] }
export function createCompileFades(): CompileFades {
  return {
    to: new Int8Array(MACHINE_COUNT).fill(-1),   // −1 until the first frame, which snaps
    tweens: Array.from({ length: MACHINE_COUNT }, () => createTween(REDUCED_COMPILE_S)),
    out: new Array<number | null>(MACHINE_COUNT).fill(null),
  };
}

/**
 * The compile targets reduced motion hands stepClocks in place of the scrubbed ones: a 300 ms fade to 1 when a
 * machine's build window is entered (its scrubbed target leaves 0) and to 0 when it is left above, from wherever
 * `compile` stands; a machine whose section is behind holds 1. The first frame snaps, so a load mid-page shows the
 * bench as the scroll left it. Null targets (the quoter, the visitor) pass through: they have clocks of their own.
 */
export function stepCompileFades(f: CompileFades, target: readonly (number | null)[], compile: Float32Array, nowS: number): (number | null)[] {
  for (let m = 0; m < MACHINE_COUNT; m++) {
    const t = target[m];
    if (t === null) { f.out[m] = null; continue; }
    const to = t > 0 ? 1 : 0;
    if (f.to[m] !== to) {
      f.tweens[m].start(nowS, f.to[m] < 0 ? to : compile[m], to);
      f.to[m] = to;
    }
    f.out[m] = f.tweens[m].value(nowS);
  }
  return f.out;
}

/**
 * Reduced motion's camera target (§11: camera moves become 400 ms crossfades between poses): of the two keys around
 * `section + u`, the nearer one, so the camera holds at the table's stations and each move lands at its midpoint in
 * one step, which CameraRig damps. Writes into `out`; allocates nothing.
 */
export function stationPose(section: number, u: number, tier: Tier, out: HudPose): void {
  const keys = CAMERA_KEYS[tier];
  const t = section + u;
  let i = 0;
  while (i < keys.length - 1 && keys[i + 1].section + keys[i + 1].u <= t) i++;
  const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)];
  const k = t - (a.section + a.u) < b.section + b.u - t ? a : b;
  for (let j = 0; j < 3; j++) { out.position[j] = k.pose.position[j]; out.lookAt[j] = k.pose.lookAt[j]; }
  out.fov = k.pose.fov;
}

// ---- the visitor (design §3.1 · 09, §8 clock 2): Enter builds, Enter again rebuilds, Escape clears --------------------

/** The slot's resting scan period, s: the one configs/slot.ts bakes and the registry starts on. */
export const SLOT_PERIOD_REST_S = 3.0;
/** The scan period relaxes back to rest with this time constant once the typing stops, s. */
export const SLOT_PERIOD_TAU_S = 10;

/** The scan period a keystroke sets: 3 s before any, falling toward 0.4 s as the typing goes on. */
export function slotPeriodFor(keystrokes: number): number {
  return 0.4 + 2.6 * Math.exp(-0.3 * keystrokes);
}

export interface VisitorClock {
  build: Tween; teardown: Tween;
  built: boolean;                                // a sentence sits in the reserve
  tearing: boolean;                              // the teardown is running; what is queued lands when it ends
  queued: { plan: VisitorPlan | null } | null;   // the next request: a plan builds, null clears; the latest wins
  compile: number;                               // the visitor's compile this frame, 0..1
  keystrokes: number;                            // since the last build or clear
  parts: number;                                 // the built sentence's parts, its layout's count; 0 on the empty slot
  slotPeriod: number;                            // uSlotPeriod, s
  slotPhase: number;                             // uSlotPhase: the scan bar's phase in cycles, wrapped to [0, 1)
}

/** Under reduced motion the build and the teardown are both 300 ms fades (§11: the visitor's compile is a 300 ms fade). */
export function createVisitorClock(reducedMotion = false): VisitorClock {
  return {
    build: createTween(reducedMotion ? REDUCED_COMPILE_S : TIMING.visitorCompileS),
    teardown: createTween(reducedMotion ? REDUCED_COMPILE_S : TIMING.visitorTeardownS),
    built: false, tearing: false, queued: null, compile: 0, keystrokes: 0, parts: 0, slotPeriod: SLOT_PERIOD_REST_S, slotPhase: 0,
  };
}

/** Enter (a plan) or a clear (null). It lands on the next frame, after a teardown when a sentence is built. */
export function requestVisitor(v: VisitorClock, plan: VisitorPlan | null): void {
  v.queued = { plan };
}

/** A keystroke in the input: reseeds the slot's scan cadence. */
export function keyVisitor(v: VisitorClock): void {
  v.keystrokes++;
  v.slotPeriod = slotPeriodFor(v.keystrokes);
}

/** Lands the queued request: uploads a plan into the reserve and starts its compile from 0, or zero-scales the reserve. */
function landVisitor(v: VisitorClock, nowS: number): void {
  const plan = v.queued?.plan ?? null;
  v.queued = null;
  v.keystrokes = 0;
  if (plan) {
    uploadVisitor(plan);
    v.build.start(nowS, 0, 1);
    v.built = true;
    v.parts = plan.result.counts.total;
  } else {
    clearVisitor();
    v.built = false;
    v.parts = 0;
  }
}

/**
 * One frame of the visitor on the renderer's clock: a request tears a built sentence down from where its compile
 * stands to 0 over 0.6 s (reverse birth order, in the shader) and lands when that ends, or lands at once on an empty
 * slot; then the scan period relaxes toward rest and the bar's phase advances by `slotRate` · dt / period. `slotRate`
 * is the slot's machine seconds per second (its run times the motion pace), so an untouched bar sits at mt / 3 s as it
 * always has, and a keystroke changes how fast the bar moves, never where it is. Returns the visitor's compile for
 * stepClocks.
 */
export function stepVisitor(v: VisitorClock, nowS: number, dt: number, slotRate: number): number {
  if (v.queued && !v.tearing) {
    if (v.built) { v.teardown.start(nowS, v.compile, 0); v.tearing = true; }
    else landVisitor(v, nowS);
  }
  if (v.tearing && v.teardown.done(nowS)) { v.tearing = false; landVisitor(v, nowS); }
  v.compile = v.tearing ? v.teardown.value(nowS) : v.built ? v.build.value(nowS) : 0;
  v.slotPeriod += (SLOT_PERIOD_REST_S - v.slotPeriod) * (1 - Math.exp(-dt / SLOT_PERIOD_TAU_S));
  v.slotPhase += (dt * slotRate) / v.slotPeriod;
  v.slotPhase -= Math.floor(v.slotPhase);
  return v.compile;
}

// ---- the frame ------------------------------------------------------------------------------------------------------

const BUILT: (number | null)[] = new Array<number>(MACHINE_COUNT).fill(1);

export interface ClocksDriver {
  result: LayoutResult; uniforms: BenchUniforms; tier: Tier;
  scroll: RefObject<ScrollState | null>; reducedMotion: boolean; built: boolean; pinned: number | null; intro: Intro;
  visitor: VisitorClock;   // per driver: a tier change rebuilds the kits with an empty reserve, and this with them
  fades: CompileFades;     // reduced motion's compile targets
  clocks: ClockState; scene: SceneState; inputs: ClockInputs; births: Float64Array[];
  fit: ShadowFit; palette: PaletteLerp;
  pos: THREE.Vector3; prevPos: THREE.Vector3; hasPrev: boolean;
  wasQuoterLocked: boolean;   // edge-detects the quoter's lock for hud.runningSince
}

export function createClocksDriver(o: {
  result: LayoutResult; uniforms: BenchUniforms; tier: Tier; scroll: RefObject<ScrollState | null>;
  reducedMotion: boolean; built: boolean; pinned: number | null; theme: ThemeName; intro?: Intro;
}): ClocksDriver {
  return {
    result: o.result, uniforms: o.uniforms, tier: o.tier, scroll: o.scroll, reducedMotion: o.reducedMotion, built: o.built,
    pinned: o.pinned, intro: o.intro ?? intro, visitor: createVisitorClock(o.reducedMotion), fades: createCompileFades(),
    clocks: createClockState(), scene: createSceneState(),
    inputs: { dt: 0, compileTarget: BUILT, heroCompile: 0, visitorCompile: 0, velocity: 0, reducedMotion: o.reducedMotion },
    births: sortedBirths(o.result), fit: createShadowFit(), palette: createPaletteLerp(o.uniforms, o.theme),
    pos: new THREE.Vector3(), prevPos: new THREE.Vector3(), hasPrev: false,
    wasQuoterLocked: false,
  };
}

/** One frame. `delta` is the renderer's frame time in seconds, `elapsed` its wall clock. */
export function stepFrame(d: ClocksDriver, delta: number, elapsed: number): void {
  const sc = d.scroll.current;
  if (!sc || sc.ranges.length === 0) return;   // ScrollProvider measures in its mount effect; no ranges, no section to place
  const dt = Math.min(0.05, Math.max(0, delta));
  const s = sceneState(sc.g, sc.ranges, d.tier, d.scene);

  const it = d.intro;
  if (it.pending) {
    it.pending = false;
    it.tween.start(elapsed, 0, 1);
    dbso.t0 = performance.now();
  }

  const i = d.inputs;
  i.dt = dt;
  i.compileTarget = d.built ? BUILT : d.reducedMotion ? stepCompileFades(d.fades, s.compileTarget, d.clocks.compile, elapsed) : s.compileTarget;
  i.heroCompile = d.pinned ?? it.tween.value(elapsed);
  // The slot has no lever: its run is 1 from load, so last frame's run is this frame's (clocksLogic.ts, NO_LEVER).
  i.visitorCompile = stepVisitor(d.visitor, elapsed, dt, d.clocks.run[MACHINE.slot] * motionScale(d.reducedMotion, MACHINE.slot));
  i.velocity = sc.velocity;
  i.reducedMotion = d.reducedMotion;
  stepClocks(d.clocks, i);

  const c = d.clocks, u = d.uniforms;
  u.uCompile.value.set(c.compile);
  u.uMachineTime.value.set(c.mt);
  u.uRun.value.set(c.run);
  // Reduced motion: no fill rate (the caps never flip), no velocity, no lean kick; the merge clicks still follow scroll.
  if (d.reducedMotion) u.uFillRate.value.fill(0);
  else u.uFillRate.value.set(c.fillRate);
  u.uTilt.value = c.tilt;
  u.uTime.value = elapsed;
  u.uVel.value = d.reducedMotion ? 0 : c.vel + c.impulse;
  u.uMerge.value = s.merge;
  u.uLean.value = d.reducedMotion ? 0 : s.lean;
  u.uSlotPeriod.value = d.visitor.slotPeriod;
  u.uSlotPhase.value = d.visitor.slotPhase;

  d.pos.fromArray(s.pose.position);
  if (d.hasPrev) travelAxis(d.prevPos, d.pos, u.uTravelAxis.value);
  d.prevPos.copy(d.pos);
  d.hasPrev = true;

  const pose = hud.pose;
  if (d.reducedMotion) stationPose(s.section, s.u, d.tier, pose);
  else {
    for (let k = 0; k < 3; k++) { pose.position[k] = s.pose.position[k]; pose.lookAt[k] = s.pose.lookAt[k]; }
    pose.fov = s.pose.fov;
  }

  const light = lightRef.current;
  if (light && light.castShadow) fitShadowCamera(light, d.result.machines[s.active], d.fit, dt);

  stepPalette(d.palette, u, dt);

  hud.gl = true;
  hud.section = s.section;
  hud.u = s.u;
  hud.rung = s.rung;
  hud.click = s.click;
  hud.compile = c.compile[MACHINE.quoter];
  hud.compilePerMachine.set(c.compile);
  hud.parts = inkedCount(d.births[MACHINE.quoter], c.compile[MACHINE.quoter]) + inkedCount(d.births[MACHINE.intake], c.compile[MACHINE.intake]);
  hud.visitorParts = d.visitor.parts;
  hud.uptime = c.uptime;
  const quoterLocked = c.locked[MACHINE.quoter] === 1;
  if (quoterLocked && !d.wasQuoterLocked) hud.runningSince = c.uptime;
  d.wasQuoterLocked = quoterLocked;
  hud.running = quoterLocked;
}

export function Clocks({ result, uniforms, tier }: { result: LayoutResult; uniforms: BenchUniforms; tier: Tier }) {
  const { state: scroll, reducedMotion } = useScroll();
  const driver = useMemo(() => {
    const search = window.location.search;
    return createClocksDriver({
      result, uniforms, tier, scroll, reducedMotion, built: isBuilt(search), pinned: pinnedCompile(search, reducedMotion), theme: readTheme(),
    });
  }, [result, uniforms, tier, scroll, reducedMotion]);

  // ThemeProvider sets data-theme, then dispatches `themechange`; the attribute is the one source both layers read.
  useEffect(() => {
    const onTheme = () => retargetPalette(driver.palette, readTheme());
    window.addEventListener('themechange', onTheme);
    return () => window.removeEventListener('themechange', onTheme);
  }, [driver]);

  // The debug record (debug.ts) and the rebuild control: Sentence dispatches `dbso:rebuild` from the h1 and #rebuild,
  // and the next frame restarts the hero tween from 0; the quoter's run drops as its compile falls below the lock and
  // re-locks when the lever lands again.
  useEffect(() => {
    const search = window.location.search;
    dbso.built = isBuilt(search);
    dbso.freeze = freezeOverride(search);
    exposeDebug();
    const onRebuild = () => startIntro();
    window.addEventListener('dbso:rebuild', onRebuild);
    return () => window.removeEventListener('dbso:rebuild', onRebuild);
  }, []);

  // Section 09: Yours dispatches the sentence on Enter, a clear on Escape or an empty Enter, and every keystroke. The
  // plan is laid out here, on the event; the next frame tears down, uploads and compiles it on the renderer's clock.
  useEffect(() => {
    const v = driver.visitor;
    const onBuild = (e: Event) => {
      const text = (e as CustomEvent<{ text?: unknown } | null>).detail?.text;
      requestVisitor(v, typeof text === 'string' ? planVisitor(text, driver.tier) : null);
    };
    const onClear = () => requestVisitor(v, null);
    const onKey = () => keyVisitor(v);
    window.addEventListener('dbso:visitor:build', onBuild);
    window.addEventListener('dbso:visitor:clear', onClear);
    window.addEventListener('dbso:visitor:key', onKey);
    return () => {
      window.removeEventListener('dbso:visitor:build', onBuild);
      window.removeEventListener('dbso:visitor:clear', onClear);
      window.removeEventListener('dbso:visitor:key', onKey);
    };
  }, [driver]);

  // No frame writes hud.click after this unmounts (GLErrorBoundary caught the renderer failing), so the scene is no
  // longer live: hudSync takes <html data-gl> off and section 02's copy shows whole. The visitor's machine goes with
  // the scene, so the footer stops counting its parts.
  useEffect(() => () => { hud.gl = false; hud.visitorParts = 0; }, []);

  useFrame((state, delta) => stepFrame(driver, delta, state.clock.elapsedTime), -1);
  return null;
}
