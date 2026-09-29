'use client';
// The per-frame driver (design §8): useFrame at priority −1, before CameraRig. Each frame it reads the scroll refs,
// evaluates sceneState(g), steps the pure clocks (clocksLogic.ts), and writes every uniform, the pose CameraRig
// applies, the shadow-camera fit, the 300 ms palette lerp and the hud. It also owns the intro (§3.1): the hero
// compile is a 2.2 s tween Scene starts at T0, the end of the cross-fade, and the rebuild control restarts. No React
// state is set on this path; every write lands in an object allocated once. stepFrame is the whole frame as a
// function of (driver, dt, elapsed), so the tests drive it without a renderer.
import { useEffect, useMemo, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MACHINE, MACHINE_COUNT, type LayoutResult, type MachineSummary, type Tier } from '@/bench/types';
import { createSceneState, sceneState, type SceneState } from '@/bench/sceneState';
import { TIMING } from '@/bench/timing';
import { PALETTES, type Palette, type ThemeName } from '@/theme/palettes';
import { useScroll, type ScrollState } from '@/scroll/ScrollProvider';
import { createClockState, stepClocks, type ClockInputs, type ClockState } from './clocksLogic';
import { applyPalette, type BenchUniforms } from './material/uniforms';
import { createTween, type Tween } from './tween';
import { KEY_LIGHT } from './Lights';
import { lightRef } from './registry';
import { hud } from './hud';
import { dbso, exposeDebug } from './debug';

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

// ---- the frame ------------------------------------------------------------------------------------------------------

const BUILT: (number | null)[] = new Array<number>(MACHINE_COUNT).fill(1);

export interface ClocksDriver {
  result: LayoutResult; uniforms: BenchUniforms; tier: Tier;
  scroll: RefObject<ScrollState | null>; reducedMotion: boolean; built: boolean; pinned: number | null; intro: Intro;
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
    pinned: o.pinned, intro: o.intro ?? intro,
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
  i.compileTarget = d.built ? BUILT : s.compileTarget;
  i.heroCompile = d.pinned ?? it.tween.value(elapsed);
  i.visitorCompile = 0;
  i.velocity = sc.velocity;
  i.reducedMotion = d.reducedMotion;
  stepClocks(d.clocks, i);

  const c = d.clocks, u = d.uniforms;
  u.uCompile.value.set(c.compile);
  u.uMachineTime.value.set(c.mt);
  u.uRun.value.set(c.run);
  u.uFillRate.value.set(c.fillRate);
  u.uTilt.value = c.tilt;
  u.uTime.value = elapsed;
  u.uVel.value = c.vel + c.impulse;
  u.uMerge.value = s.merge;
  u.uLean.value = s.lean;

  d.pos.fromArray(s.pose.position);
  if (d.hasPrev) travelAxis(d.prevPos, d.pos, u.uTravelAxis.value);
  d.prevPos.copy(d.pos);
  d.hasPrev = true;

  const pose = hud.pose;
  for (let k = 0; k < 3; k++) { pose.position[k] = s.pose.position[k]; pose.lookAt[k] = s.pose.lookAt[k]; }
  pose.fov = s.pose.fov;

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

  // No frame writes hud.click after this unmounts (GLErrorBoundary caught the renderer failing), so the scene is no
  // longer live: hudSync takes <html data-gl> off and section 02's copy shows whole.
  useEffect(() => () => { hud.gl = false; }, []);

  useFrame((state, delta) => stepFrame(driver, delta, state.clock.elapsedTime), -1);
  return null;
}
