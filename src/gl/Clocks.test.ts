import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, createElement } from 'react';
import * as THREE from 'three';
import { createRoot, extend } from '@react-three/fiber';
import type { RefObject } from 'react';
import { MACHINE, MACHINE_COUNT, type Tier } from '@/bench/types';
import { buildBench } from '@/bench/counts';
import { SECTIONS, SECTION_INDEX, sectionRanges, type SectionRange } from '@/bench/sections';
import { CAMERA_KEYS, evaluatePose } from '@/bench/camera';
import { createSceneState, mergeBurst, sceneState } from '@/bench/sceneState';
import { TIMING, lockStart } from '@/bench/timing';
import { smoothstep } from '@/bench/math';
import { PALETTES, type ThemeName } from '@/theme/palettes';
import type { ScrollState } from '@/scroll/ScrollProvider';
import { createUniforms, hexToColor, type BenchUniforms } from './material/uniforms';
import { KEY_LIGHT, configureKeyLight } from './Lights';
import { lightRef, setLightRef, cameraRef } from './registry';
import { hud } from './hud';
import { dbso, type DbsoDebug } from './debug';
import { CameraRig } from './CameraRig';
import {
  Clocks, createClocksDriver, stepFrame, isBuilt, builtOverride, freezeOverride, pinnedCompile,
  createIntro, intro, startIntro,
  createPaletteLerp, retargetPalette, stepPalette, PALETTE_LERP_S,
  travelAxis, fitShadowCamera, createShadowFit, SHADOW_MARGIN, SHADOW_FIT_TAU, SHADOW_DISTANCE,
  sortedBirths, inkedCount, INK_T, INK_THRESHOLD,
  createVisitorClock, requestVisitor, keyVisitor, stepVisitor, slotPeriodFor, SLOT_PERIOD_REST_S, SLOT_PERIOD_TAU_S,
  REDUCED_COMPILE_S, stationPose,
} from './Clocks';
import { planVisitor, uploadVisitor, clearVisitor } from './visitor';

// The kits' reserve and the ink partition are visitor.test.ts's; here only when the clock uploads and clears.
vi.mock('./visitor', async (importOriginal) => ({ ...(await importOriginal<typeof import('./visitor')>()), uploadVisitor: vi.fn(), clearVisitor: vi.fn() }));
const upload = vi.mocked(uploadVisitor), clear = vi.mocked(clearVisitor);

// ---- the scroll layer, stubbed: Clocks reads useScroll().state.current and reducedMotion --------------------------

const VH = 900;
function pageRanges(tier: Tier): { ranges: SectionRange[]; tops: number[]; maxScroll: number } {
  const tops: number[] = [];
  let y = 0;
  for (const s of SECTIONS) { tops.push(y); y += (s.vh[tier] * VH) / 100; }
  return { ranges: sectionRanges(tops, y, VH), tops, maxScroll: y - VH };
}
/** g at local `u` of `section`, the inverse of locate(). */
function gAt(ranges: SectionRange[], section: number, u: number): number {
  const r = ranges[section];
  return r.start + u * (r.end - r.start);
}
function scrollRef(tier: Tier, g = 0, velocity = 0): RefObject<ScrollState> {
  const { ranges, tops, maxScroll } = pageRanges(tier);
  return { current: { g, scrollY: g * maxScroll, velocity, maxScroll, vh: VH, vw: 1440, ranges, tops } };
}

const mockScroll: { state: RefObject<ScrollState>; reducedMotion: boolean; tier: Tier; scrollTo: () => void } = {
  state: scrollRef('desktop'), reducedMotion: false, tier: 'desktop', scrollTo() {},
};
vi.mock('@/scroll/ScrollProvider', () => ({ useScroll: () => mockScroll }));

// ---- the DOM, stubbed: data-theme on <html>, `themechange` on window, location.search --------------------------------

let theme: ThemeName = 'light';
let search = '';
const win = new EventTarget();
function stubDom(initial: ThemeName, query = ''): void {
  theme = initial;
  search = query;
  // <html> is an EventTarget too: CameraRig listens for pointerleave on it
  const html = Object.assign(new EventTarget(), { getAttribute: (name: string) => (name === 'data-theme' ? theme : null) });
  vi.stubGlobal('document', { documentElement: html });
  vi.stubGlobal('window', Object.assign(win, { location: { search } }));
}
function switchTheme(next: ThemeName): void {
  theme = next;
  win.dispatchEvent(new CustomEvent('themechange', { detail: next }));
}

const DT = 1 / 60;
const hexOf = (c: THREE.Color) => `#${c.getHexString().toUpperCase()}`;
function expectColorClose(actual: THREE.Color, expected: THREE.Color, tol: number, label: string): void {
  for (const ch of ['r', 'g', 'b'] as const) expect(Math.abs(actual[ch] - expected[ch]), `${label}.${ch}`).toBeLessThanOrEqual(tol);
}

const desktop = buildBench('desktop');

function driver(opts: { tier?: Tier; g?: number; velocity?: number; built?: boolean; pinned?: number | null; reducedMotion?: boolean; theme?: ThemeName } = {}) {
  const tier = opts.tier ?? 'desktop';
  const result = tier === 'desktop' ? desktop : buildBench(tier);
  const uniforms = createUniforms();
  const scroll = scrollRef(tier, opts.g ?? 0, opts.velocity ?? 0);
  // its own intro, so a test's T0 never leaks into the next; the component shares the module's
  const d = createClocksDriver({
    result, uniforms, tier, scroll, reducedMotion: opts.reducedMotion ?? false, built: opts.built ?? false, pinned: opts.pinned ?? null,
    theme: opts.theme ?? 'light', intro: createIntro(),
  });
  return { d, result, uniforms, scroll };
}
function frames(d: ReturnType<typeof createClocksDriver>, n: number, dt = DT, t0 = 0): number {
  let t = t0;
  for (let i = 0; i < n; i++) { t += dt; stepFrame(d, dt, t); }
  return t;
}

afterEach(() => { vi.unstubAllGlobals(); setLightRef(null); });

describe('hud', () => {
  it('starts on the desktop hero key so the first frame is framed before Clocks runs', () => {
    const hero = CAMERA_KEYS.desktop[0].pose;
    expect(hud.pose.position).toEqual([...hero.position]);
    expect(hud.pose.lookAt).toEqual([...hero.lookAt]);
    expect(hud.pose.fov).toBe(hero.fov);
    expect(hud.pose.position).not.toBe(hero.position);   // its own array: Clocks writes into it
    expect(hud.hover).toEqual({ machine: -1, col: -1, x: 0, y: 0, mid: 0, bid: 0, ask: 0, fills: 0 });
  });
});

describe('isBuilt', () => {
  it('reads the ?built=1 debug switch and nothing looser', () => {
    expect(isBuilt('?built=1')).toBe(true);
    expect(isBuilt('?nogl=1&built=1')).toBe(true);
    expect(isBuilt('')).toBe(false);
    expect(isBuilt('?built=0')).toBe(false);
    expect(isBuilt('?rebuilt=1')).toBe(false);
  });
});

describe('query pins', () => {
  it('builtOverride: ?built=1 and ?built=0 are the two pins; anything else is none', () => {
    expect(builtOverride('?built=1')).toBe(1);
    expect(builtOverride('?built=0')).toBe(0);
    expect(builtOverride('')).toBeNull();
    expect(builtOverride('?built=2')).toBeNull();
    expect(builtOverride('?built=')).toBeNull();
  });

  it('freezeOverride: ?freeze=<s> is seconds after T0, or null when absent, empty, negative or not a number', () => {
    expect(freezeOverride('?freeze=0.6')).toBe(0.6);
    expect(freezeOverride('?freeze=0')).toBe(0);
    expect(freezeOverride('?freeze=3')).toBe(3);
    expect(freezeOverride('?tier=phone&freeze=1.2')).toBe(1.2);
    expect(freezeOverride('')).toBeNull();
    expect(freezeOverride('?freeze=')).toBeNull();
    expect(freezeOverride('?freeze=-1')).toBeNull();
    expect(freezeOverride('?freeze=soon')).toBeNull();
  });

  it('pinnedCompile: built pins first, then the freeze at s / 2.2 clamped to 1, then reduced motion at 1; otherwise the tween runs', () => {
    expect(pinnedCompile('', false)).toBeNull();
    expect(pinnedCompile('?built=1', false)).toBe(1);
    expect(pinnedCompile('?built=0', false)).toBe(0);
    expect(pinnedCompile('?freeze=0.6', false)).toBeCloseTo(0.6 / TIMING.heroCompileS, 12);
    expect(pinnedCompile('?freeze=2.2', false)).toBe(1);
    expect(pinnedCompile('?freeze=3', false)).toBe(1);
    expect(pinnedCompile('?freeze=0', false)).toBe(0);
    expect(pinnedCompile('', true)).toBe(1);
    expect(pinnedCompile('?built=0', true)).toBe(0);         // the query outranks the motion setting
    expect(pinnedCompile('?freeze=1.1', true)).toBeCloseTo(0.5, 12);
    expect(pinnedCompile('?built=1&freeze=0.3', false)).toBe(1);
  });
});

describe('palette lerp', () => {
  it('createPaletteLerp snaps the uniforms to the theme and returns a finished lerp', () => {
    const u = createUniforms();
    const l = createPaletteLerp(u, 'dark');
    expect(hexOf(u.uPaper.value)).toBe(PALETTES.dark.paper);
    expect(hexOf(u.uPencil.value)).toBe(PALETTES.dark.pencil);
    expect(l).toEqual({ from: PALETTES.dark, to: PALETTES.dark, t: 1 });
  });

  it('retargeting to the theme already shown is a no-op; to the other theme starts a 300 ms lerp', () => {
    const u = createUniforms();
    const l = createPaletteLerp(u, 'light');
    retargetPalette(l, 'light');
    expect(l.t).toBe(1);
    retargetPalette(l, 'dark');
    expect(l).toEqual({ from: PALETTES.light, to: PALETTES.dark, t: 0 });
    expect(PALETTE_LERP_S).toBe(0.3);
  });

  it('stepPalette lands on the target after 0.3 s, halfway at 0.15 s, and stops writing once done', () => {
    const u = createUniforms();
    const l = createPaletteLerp(u, 'light');
    retargetPalette(l, 'dark');
    stepPalette(l, u, 0.15);
    expect(l.t).toBeCloseTo(0.5, 10);
    const a = hexToColor(PALETTES.light.paper), b = hexToColor(PALETTES.dark.paper);
    expectColorClose(u.uPaper.value, new THREE.Color().lerpColors(a, b, 0.5), 1 / 255, 'uPaper at t 0.5');
    stepPalette(l, u, 0.15);
    expect(l.t).toBe(1);
    expect(hexOf(u.uPaper.value)).toBe(PALETTES.dark.paper);
    expect(hexOf(u.uShadow.value)).toBe(PALETTES.dark.shadow);
    u.uPaper.value.setRGB(0.5, 0.5, 0.5);
    stepPalette(l, u, 1);
    expect(u.uPaper.value.r).toBe(0.5);   // finished: no further writes
  });

  it('a toggle mid-lerp reverses from the colours on screen without a jump', () => {
    const u = createUniforms();
    const l = createPaletteLerp(u, 'light');
    retargetPalette(l, 'dark');
    stepPalette(l, u, 0.1);   // t = 1/3 toward dark
    const onScreen = u.uInkTop.value.clone();
    retargetPalette(l, 'light');
    expect(l.from).toBe(PALETTES.dark);
    expect(l.to).toBe(PALETTES.light);
    expect(l.t).toBeCloseTo(2 / 3, 10);
    stepPalette(l, u, 0);   // apply at the same t: identical colour
    expectColorClose(u.uInkTop.value, onScreen, 1e-6, 'uInkTop continuity');
    stepPalette(l, u, 0.1);
    expect(l.t).toBe(1);
    expect(hexOf(u.uInkTop.value)).toBe(PALETTES.light.inkTop);
  });
});

describe('travelAxis', () => {
  it('normalizes the camera travel and falls back to the bed axis when still', () => {
    const out = new THREE.Vector3();
    travelAxis(new THREE.Vector3(1, 2, 3), new THREE.Vector3(1, 2, 3), out);
    expect(out.toArray()).toEqual([1, 0, 0]);
    travelAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 3, 4), out);
    expect(out.x).toBeCloseTo(0, 12);
    expect(out.y).toBeCloseTo(0.6, 12);
    expect(out.z).toBeCloseTo(0.8, 12);
    expect(out.length()).toBeCloseTo(1, 12);
    travelAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(-1e-9, 0, 0), out);
    expect(out.toArray()).toEqual([1, 0, 0]);   // sub-threshold jitter reads as still
  });
});

describe('fitShadowCamera', () => {
  function keyLight(): THREE.DirectionalLight {
    const light = new THREE.DirectionalLight();
    configureKeyLight(light, 'desktop');
    return light;
  }
  /** Projects a world point through the shadow camera exactly as three's DirectionalLightShadow.updateMatrices frames it. */
  function shadowNdc(light: THREE.DirectionalLight, p: THREE.Vector3): THREE.Vector3 {
    light.updateMatrixWorld();
    light.shadow.updateMatrices(light);
    return p.clone().project(light.shadow.camera);
  }
  function corners(min: THREE.Vector3, max: THREE.Vector3): THREE.Vector3[] {
    const out: THREE.Vector3[] = [];
    for (const x of [min.x, max.x]) for (const y of [min.y, max.y]) for (const z of [min.z, max.z]) out.push(new THREE.Vector3(x, y, z));
    return out;
  }

  it('snaps on the first call to the machine bounds ± 3 and frames every corner of that box, tightly', () => {
    const light = keyLight();
    const fit = createShadowFit();
    const m = desktop.machines[MACHINE.quoter];
    fitShadowCamera(light, m, fit, DT);
    expect(fit.primed).toBe(true);
    expect(fit.min.toArray()).toEqual(m.min.map((v) => v - SHADOW_MARGIN));
    expect(fit.max.toArray()).toEqual(m.max.map((v) => v + SHADOW_MARGIN));
    expect(SHADOW_MARGIN).toBe(3);
    let maxX = 0, maxY = 0, maxZ = 0;
    for (const c of corners(fit.min, fit.max)) {
      const n = shadowNdc(light, c);
      for (const ch of ['x', 'y', 'z'] as const) expect(Math.abs(n[ch]), `corner ${c.toArray()} ndc.${ch}`).toBeLessThanOrEqual(1 + 1e-6);
      maxX = Math.max(maxX, Math.abs(n.x)); maxY = Math.max(maxY, Math.abs(n.y)); maxZ = Math.max(maxZ, Math.abs(n.z));
    }
    // tight: the box touches every face of the frustum, so the 2048 map is spent on the machine, not on empty paper
    expect(maxX).toBeCloseTo(1, 6);
    expect(maxY).toBeCloseTo(1, 6);
    expect(maxZ).toBeCloseTo(1, 6);
    expect(light.shadow.camera.near).toBeGreaterThan(0);
  });

  it('keeps the key direction: only the light\'s position and target move', () => {
    const light = keyLight();
    fitShadowCamera(light, desktop.machines[MACHINE.watch], createShadowFit(), DT);
    const dir = light.position.clone().sub(light.target.position).normalize();
    const key = new THREE.Vector3(...KEY_LIGHT.position).normalize();
    expect(dir.distanceTo(key)).toBeLessThan(1e-9);
    expect(light.position.distanceTo(light.target.position)).toBeCloseTo(SHADOW_DISTANCE, 9);
    const m = desktop.machines[MACHINE.watch];
    for (let k = 0; k < 3; k++) expect(light.target.position.getComponent(k)).toBeCloseTo((m.min[k] + m.max[k]) / 2, 9);
  });

  it('damps toward a new active machine with τ 0.3 s instead of cutting', () => {
    const light = keyLight();
    const fit = createShadowFit();
    fitShadowCamera(light, desktop.machines[MACHINE.quoter], fit, DT);
    const from = fit.min.clone();
    const target = new THREE.Vector3().fromArray(desktop.machines[MACHINE.balance].min).subScalar(SHADOW_MARGIN);
    fitShadowCamera(light, desktop.machines[MACHINE.balance], fit, SHADOW_FIT_TAU);
    const expected = from.clone().lerp(target, 1 - Math.exp(-1));
    expect(fit.min.distanceTo(expected)).toBeLessThan(1e-9);
    for (let i = 0; i < 300; i++) fitShadowCamera(light, desktop.machines[MACHINE.balance], fit, DT);
    expect(fit.min.distanceTo(target)).toBeLessThan(1e-3);
  });
});

describe('inkedCount', () => {
  const births = sortedBirths(desktop);

  it('INK_T is where smoothstep reaches the fragment shader\'s ink threshold', () => {
    expect(INK_THRESHOLD).toBe(0.6);
    expect(smoothstep(0, 1, INK_T)).toBeCloseTo(0.6, 9);
  });

  it('sorts one birth list per machine with the layout\'s counts', () => {
    expect(births).toHaveLength(MACHINE_COUNT);
    for (let m = 0; m < MACHINE_COUNT; m++) {
      expect(births[m].length, `machine ${m}`).toBe(desktop.counts.byMachine[m]);
      for (let i = 1; i < births[m].length; i++) expect(births[m][i]).toBeGreaterThanOrEqual(births[m][i - 1]);
    }
  });

  it('counts nothing at compile 0, everything at compile 1, and never decreases in between', () => {
    const q = births[MACHINE.quoter];
    expect(inkedCount(q, 0)).toBe(0);
    expect(inkedCount(q, 1)).toBe(desktop.counts.byMachine[MACHINE.quoter]);
    let last = 0;
    for (let c = 0; c <= 1; c += 0.01) { const n = inkedCount(q, c); expect(n).toBeGreaterThanOrEqual(last); last = n; }
  });

  it('agrees with the shader\'s assembleFactor ≥ 0.6 part by part across the compile', () => {
    const parts = desktop.parts.filter((p) => p.machine === MACHINE.intake);
    const b = births[MACHINE.intake];
    for (let c = 0.3; c <= 1; c += 0.025) {
      const brute = parts.filter((p) => smoothstep(lockStart(p.birth), lockStart(p.birth) + TIMING.lockW, c) >= INK_THRESHOLD).length;
      expect(inkedCount(b, c), `compile ${c.toFixed(3)}`).toBe(brute);
    }
  });
});

describe('stepFrame', () => {
  it('does nothing until ScrollProvider has measured the section ranges', () => {
    const { d, uniforms, scroll } = driver({ built: true });
    scroll.current.ranges = [];
    const before = { ...hud, pose: undefined };
    stepFrame(d, DT, DT);
    expect(Array.from(uniforms.uCompile.value)).toEqual(new Array(MACHINE_COUNT).fill(0));
    expect(d.hasPrev).toBe(false);
    expect({ ...hud, pose: undefined }).toEqual(before);
  });

  it('marks the hud live (hud.gl) on its first frame on measured ranges, the frame it first writes hud.click', () => {
    const { d, scroll } = driver();
    const ranges = scroll.current.ranges;
    hud.gl = false;
    scroll.current.ranges = [];
    stepFrame(d, DT, DT);
    expect(hud.gl).toBe(false);                                      // nothing drives the clicks yet: section 02's copy stays whole
    scroll.current.ranges = ranges;
    stepFrame(d, DT, 2 * DT);
    expect(hud.gl).toBe(true);
  });

  it('at the top with no intro: the quoter stays pencil and parked while the bot and slot run from load', () => {
    const { d, uniforms } = driver();
    frames(d, 60);
    expect(uniforms.uCompile.value[MACHINE.quoter]).toBe(0);
    expect(uniforms.uMachineTime.value[MACHINE.quoter]).toBe(0);
    expect(uniforms.uRun.value[MACHINE.quoter]).toBe(0);
    expect(uniforms.uMachineTime.value[MACHINE.bot]).toBeCloseTo(1, 6);
    expect(uniforms.uMachineTime.value[MACHINE.slot]).toBeCloseTo(1, 6);
    expect(uniforms.uRun.value[MACHINE.bot]).toBe(1);
    expect(uniforms.uCompile.value[MACHINE.bot]).toBe(1);
    expect(uniforms.uTime.value).toBeCloseTo(1, 6);
    expect(uniforms.uVel.value).toBe(0);
    expect(Array.from(uniforms.uFillRate.value)).toEqual(new Array(MACHINE_COUNT).fill(1));
    expect(uniforms.uTravelAxis.value.toArray()).toEqual([1, 0, 0]);   // still: the bed axis
    expect(hud.section).toBe(0);
    expect(hud.u).toBe(0);
    expect(hud.compile).toBe(0);
    expect(hud.parts).toBe(0);
    expect(hud.running).toBe(false);
    expect(hud.uptime).toBeCloseTo(1, 6);
    const hero = CAMERA_KEYS.desktop[0].pose;
    expect(hud.pose.position).toEqual([...hero.position]);
    expect(hud.pose.lookAt).toEqual([...hero.lookAt]);
    expect(hud.pose.fov).toBe(30);
  });

  it('?built=1: every machine built on the first frame; the quoter locks, fires the impulse and the rate spike, and the ladder reads its full count', () => {
    const { d, uniforms, result } = driver({ built: true });
    stepFrame(d, DT, DT);
    expect(Array.from(uniforms.uCompile.value)).toEqual(new Array(MACHINE_COUNT).fill(1));
    expect(uniforms.uVel.value).toBeCloseTo(TIMING.impulse, 9);                          // 0.6 impulse on the lock crossing, no scroll velocity
    expect(Array.from(uniforms.uFillRate.value)).toEqual(new Array(MACHINE_COUNT).fill(3));   // 1 + 2 · rateSpike, clamped
    expect(hud.running).toBe(true);
    expect(hud.compile).toBe(1);
    expect(hud.parts).toBe(result.counts.byMachine[MACHINE.quoter] + result.counts.byMachine[MACHINE.intake]);
    frames(d, 120, DT, DT);
    expect(uniforms.uVel.value).toBeLessThan(0.01);                 // the impulse has decayed
    expect(uniforms.uFillRate.value[0]).toBeLessThan(1.05);          // and the spike
    expect(uniforms.uMachineTime.value[MACHINE.quoter]).toBeGreaterThan(1.5);   // running: carriages sweep, rotors turn
    expect(uniforms.uRun.value[MACHINE.quoter]).toBeCloseTo(1, 3);
  });

  it('scrubbing heron: the balance compiles under the finger, the shadow fit frames it, merge and lean are off', () => {
    const heron = SECTIONS.findIndex((s) => s.id === 'heron');
    const build = SECTIONS[heron].build!;
    const uMid = (build.from + build.to) / 2;
    const { d, uniforms, scroll, result } = driver();
    scroll.current.g = gAt(scroll.current.ranges, heron, uMid);
    const light = new THREE.DirectionalLight();
    configureKeyLight(light, 'desktop');
    setLightRef(light);
    stepFrame(d, DT, DT);
    expect(hud.section).toBe(heron);
    expect(hud.u).toBeCloseTo(uMid, 6);
    expect(uniforms.uCompile.value[MACHINE.balance]).toBeCloseTo(0.5, 6);
    expect(uniforms.uCompile.value[MACHINE.intake]).toBe(1);      // kalshi is behind us
    expect(uniforms.uCompile.value[MACHINE.splitter]).toBe(0);    // darch is ahead
    expect(uniforms.uMerge.value).toBe(0);
    expect(uniforms.uLean.value).toBe(0);
    const m = result.machines[MACHINE.balance];
    for (let k = 0; k < 3; k++) expect(light.target.position.getComponent(k)).toBeCloseTo((m.min[k] + m.max[k]) / 2, 9);
    const expectedPose = { position: [0, 0, 0], lookAt: [0, 0, 0], fov: 0 };
    evaluatePose(heron, uMid, 'desktop', expectedPose);
    expect(hud.pose.position).toEqual(expectedPose.position);
    expect(hud.pose.lookAt).toEqual(expectedPose.lookAt);
  });

  it('writes the balance tilt from the clock spring every frame: level while parked, tipping left once it runs', () => {
    const parked = driver();
    frames(parked.d, 120);
    expect(parked.uniforms.uTilt.value).toBe(0);
    const { d, uniforms } = driver({ built: true });
    let t = 0;
    for (let i = 0; i < 180; i++) {
      stepFrame(d, DT, (t += DT));
      expect(uniforms.uTilt.value).toBe(d.clocks.tilt);
    }
    expect(uniforms.uTilt.value).toBeGreaterThan(0);   // 3 s into the game clock: liability tiles on the left, rail tipped left
  });

  it('leaves the shadow camera alone when the light casts none (phone)', () => {
    const { d, scroll } = driver({ tier: 'phone' });
    scroll.current.g = gAt(scroll.current.ranges, 4, 0.5);
    const light = new THREE.DirectionalLight();
    configureKeyLight(light, 'phone');
    setLightRef(light);
    const before = light.position.toArray();
    stepFrame(d, DT, DT);
    expect(light.position.toArray()).toEqual(before);
    expect(lightRef.current).toBe(light);
  });

  it('writes the unit travel axis from the pose delta while the camera travels to the bot, and the merge while section 02 scrubs', () => {
    const { d, uniforms, scroll } = driver();
    const r = scroll.current.ranges;
    const first = SECTIONS.findIndex((s) => s.id === 'first');
    scroll.current.g = gAt(r, first, 0.1);
    stepFrame(d, DT, DT);
    scroll.current.g = gAt(r, first, 0.2);
    stepFrame(d, DT, 2 * DT);
    const a = { position: [0, 0, 0], lookAt: [0, 0, 0], fov: 0 }, b = { position: [0, 0, 0], lookAt: [0, 0, 0], fov: 0 };
    evaluatePose(first, 0.1, 'desktop', a);
    evaluatePose(first, 0.2, 'desktop', b);
    const expected = new THREE.Vector3().fromArray(b.position).sub(new THREE.Vector3().fromArray(a.position)).normalize();
    expect(uniforms.uTravelAxis.value.distanceTo(expected)).toBeLessThan(1e-9);
    expect(uniforms.uTravelAxis.value.length()).toBeCloseTo(1, 12);
    const more = SECTIONS.findIndex((s) => s.id === 'more');
    scroll.current.g = gAt(r, more, 0.66);   // level 6 hold
    stepFrame(d, DT, 3 * DT);
    expect(uniforms.uMerge.value).toBe(6);
    expect(hud.section).toBe(more);
  });

  it('mirrors section 02\'s lit rung and revealed line, and every machine\'s compile, into the hud for the DOM chrome', () => {
    const { d, uniforms, scroll } = driver();
    const r = scroll.current.ranges;
    const more = SECTIONS.findIndex((s) => s.id === 'more');
    const at = (u: number) => sceneState(gAt(r, more, u), r, 'desktop', createSceneState());
    let t = 0;
    for (const u of [0.05, 0.2, 0.4, 0.66, 0.85, 0.95]) {
      scroll.current.g = gAt(r, more, u);
      stepFrame(d, DT, (t += DT));
      expect(hud.rung, `u ${u}`).toBe(at(u).rung);
      expect(hud.click, `u ${u}`).toBe(at(u).click);
      expect(Array.from(hud.compilePerMachine), `u ${u}`).toEqual(Array.from(uniforms.uCompile.value));
    }
    scroll.current.g = gAt(r, more, 0.66);                           // the level-6 hold: the top rung
    stepFrame(d, DT, (t += DT));
    expect(hud.rung).toBe(5);
    scroll.current.g = 0;                                            // back at the hero: nothing lit, nothing revealed
    stepFrame(d, DT, (t += DT));
    expect(hud.rung).toBe(-1);
    expect(hud.click).toBe(-1);
  });

  it("writes section 02's merge and lean from sceneState every frame, and hands Ink its burst through hud.section and hud.u", () => {
    const { d, uniforms, scroll } = driver({ built: true });
    const r = scroll.current.ranges;
    const more = SECTIONS.findIndex((s) => s.id === 'more');
    const at = (u: number) => sceneState(gAt(r, more, u), r, 'desktop', createSceneState());
    let t = 0;
    // the clicks, the hold, the burst, then back up through them: every value is the table's, so it reverses exactly
    for (const u of [0.05, 0.2, 0.375, 0.66, 0.8, 0.86, 0.9, 0.95, 0.86, 0.375, 0.05]) {
      scroll.current.g = gAt(r, more, u);
      stepFrame(d, DT, (t += DT));
      const s = at(u);
      expect(uniforms.uMerge.value, `u ${u}`).toBe(s.merge);
      expect(uniforms.uLean.value, `u ${u}`).toBe(s.lean);
      expect(mergeBurst(hud.section, hud.u), `u ${u}`).toBe(s.burst);   // Ink.writeInkFrame's uBurst, after Clocks
    }
    expect(at(0.9).burst).toBeGreaterThan(0.5);
    expect(at(0.9).lean).toBeGreaterThan(0.5);
    expect(at(0.375).merge).toBeGreaterThan(2);
    expect(at(0.375).merge).toBeLessThan(4);
  });

  it('passes the scroll velocity through, damped, so fills and sweeps speed up under a fast scroll', () => {
    const { d, uniforms } = driver({ velocity: 1 });
    frames(d, 120);
    expect(uniforms.uVel.value).toBeCloseTo(1, 3);
    expect(uniforms.uFillRate.value[MACHINE.quoter]).toBeCloseTo(3, 2);   // 1 + 2|vel|, at the clamp
  });

  it('under reduced motion the machine clocks run at 0.3×, the small machines at 0.25×', () => {
    const { d, uniforms } = driver({ reducedMotion: true });
    frames(d, 60);
    expect(uniforms.uMachineTime.value[MACHINE.slot]).toBeCloseTo(0.3, 6);
    expect(uniforms.uMachineTime.value[MACHINE.bot]).toBeCloseTo(0.25, 6);
  });

  it('drives the palette lerp: created on the DOM theme, retargeted on themechange, done after 0.3 s', () => {
    const { d, uniforms } = driver({ theme: 'dark' });
    expect(hexOf(uniforms.uPaper.value)).toBe(PALETTES.dark.paper);
    retargetPalette(d.palette, 'light');
    frames(d, 9, 1 / 60);   // 0.15 s
    expect(d.palette.t).toBeCloseTo(0.5, 6);
    frames(d, 9, 1 / 60, 0.15);
    expect(d.palette.t).toBe(1);
    expect(hexOf(uniforms.uPaper.value)).toBe(PALETTES.light.paper);
  });

  it('clamps a long frame to 50 ms so a tab switch never leaps the clocks', () => {
    const { d, uniforms } = driver();
    stepFrame(d, 5, 5);
    expect(uniforms.uMachineTime.value[MACHINE.bot]).toBeCloseTo(0.05, 6);
    expect(uniforms.uTime.value).toBe(5);   // the wall clock is the renderer's, unclamped
  });
});

// The intro (design §3.1): T0 is the frame after startIntro; the quoter's compile is the 2.2 s tween from there, the lever
// (birth 1) starts dropping at lockStart(1) · 2.2 ≈ 2.05 s and locks at ≈ 2.18 s, which switches the machine on.
describe('the intro', () => {
  const LEVER_DROP_S = lockStart(1) * TIMING.heroCompileS;
  const LOCK_S = (lockStart(1) + TIMING.lockW) * TIMING.heroCompileS;

  beforeEach(() => { dbso.t0 = null; });

  it('starts the hero tween on the frame after startIntro, from 0 on the renderer clock, and records T0 on the wall clock', () => {
    const { d, uniforms } = driver();
    frames(d, 30);                                                   // 0.5 s behind the fade: bot pinging, quoter pencil
    expect(uniforms.uCompile.value[MACHINE.quoter]).toBe(0);
    d.intro.pending = true;
    const before = performance.now();
    stepFrame(d, DT, 1);                                             // T0 = 1 on the renderer clock
    expect(d.intro.pending).toBe(false);
    expect(dbso.t0).not.toBeNull();
    expect(dbso.t0 as number).toBeGreaterThanOrEqual(before);
    expect(dbso.t0 as number).toBeLessThanOrEqual(performance.now());
    expect(uniforms.uCompile.value[MACHINE.quoter]).toBe(0);
    stepFrame(d, DT, 2.1);                                           // T0 + 1.1
    expect(uniforms.uCompile.value[MACHINE.quoter]).toBeCloseTo(0.5, 6);
    expect(hud.compile).toBeCloseTo(0.5, 6);
    expect(hud.running).toBe(false);
    expect(uniforms.uMachineTime.value[MACHINE.quoter]).toBe(0);     // assembling still
    expect(hud.parts).toBeGreaterThan(0);                            // and the ladder ticking
    expect(hud.parts).toBeLessThan(desktop.counts.byMachine[MACHINE.quoter]);
  });

  it('the lever drops at ≈ 2.05 s and its lock at ≈ 2.18 s switches the quoter on: impulse, rate spike, run', () => {
    const { d, uniforms, result } = driver();
    d.intro.pending = true;
    stepFrame(d, DT, 0);                                             // T0 = 0
    const full = result.counts.byMachine[MACHINE.quoter];
    stepFrame(d, DT, LEVER_DROP_S - 0.01);
    expect(hud.running).toBe(false);
    expect(hud.parts).toBeGreaterThan(0.99 * full);                  // the tail of birth order is still turning to ink
    expect(hud.parts).toBeLessThan(full);
    stepFrame(d, DT, LOCK_S - 0.01);
    expect(hud.running).toBe(false);                                 // dropping, already ink, not yet locked
    expect(hud.parts).toBe(full);
    stepFrame(d, DT, LOCK_S);
    expect(hud.running).toBe(true);
    expect(uniforms.uVel.value).toBeCloseTo(TIMING.impulse, 6);      // the 0.6 impulse on the crossing
    expect(uniforms.uFillRate.value[MACHINE.quoter]).toBe(3);
    stepFrame(d, DT, TIMING.heroCompileS);
    expect(uniforms.uCompile.value[MACHINE.quoter]).toBe(1);
    expect(hud.parts).toBe(result.counts.byMachine[MACHINE.quoter]);
    frames(d, 60, DT, TIMING.heroCompileS);
    expect(uniforms.uMachineTime.value[MACHINE.quoter]).toBeGreaterThan(0.5);   // carriages leave the rail end
    expect(uniforms.uRun.value[MACHINE.quoter]).toBeGreaterThan(0.9);
  });

  it('stamps runningSince with the uptime on the lock frame, holds it while running, and re-stamps it when a rebuild re-locks', () => {
    const { d } = driver();
    d.intro.pending = true;
    stepFrame(d, DT, 0);                                             // T0 = 0
    stepFrame(d, DT, LOCK_S - 0.01);
    expect(hud.running).toBe(false);
    stepFrame(d, DT, LOCK_S);
    expect(hud.running).toBe(true);
    const lockedAt = hud.uptime;
    expect(hud.runningSince).toBe(lockedAt);
    const t = frames(d, 120, DT, LOCK_S);                            // 2 s of running
    expect(hud.runningSince).toBe(lockedAt);
    expect(hud.uptime - hud.runningSince).toBeCloseTo(2, 6);
    d.intro.pending = true;                                          // rebuild: back to pencil, the clock stops
    stepFrame(d, DT, t + DT);
    expect(hud.running).toBe(false);
    frames(d, Math.ceil(TIMING.heroCompileS / DT) + 2, DT, t + DT);
    expect(hud.running).toBe(true);                                  // re-locked, and the running clock starts over
    expect(hud.runningSince).toBeGreaterThan(lockedAt + 2);
    expect(hud.uptime - hud.runningSince).toBeLessThan(0.1);
  });

  it('a rebuild sends the quoter back to pencil from wherever it is: run drops as the compile falls below the lock, and it re-locks when the lever lands again', () => {
    const { d, uniforms } = driver();
    d.intro.pending = true;
    const t = frames(d, 240);                                        // 4 s: built and running
    expect(hud.running).toBe(true);
    expect(uniforms.uRun.value[MACHINE.quoter]).toBeCloseTo(1, 2);
    const mtBefore = uniforms.uMachineTime.value[MACHINE.quoter];
    d.intro.pending = true;                                          // what the dbso:rebuild listener does
    stepFrame(d, DT, t + DT);
    expect(uniforms.uCompile.value[MACHINE.quoter]).toBe(0);
    expect(hud.running).toBe(false);
    expect(hud.parts).toBe(0);
    const t2 = frames(d, 15, DT, t + DT);                            // 0.25 s = one run τ
    expect(uniforms.uRun.value[MACHINE.quoter]).toBeGreaterThan(0.3);
    expect(uniforms.uRun.value[MACHINE.quoter]).toBeLessThan(0.4);
    expect(uniforms.uMachineTime.value[MACHINE.quoter]).toBeGreaterThan(mtBefore);   // decelerates; never rewinds
    frames(d, Math.ceil((TIMING.heroCompileS - 0.25) / DT) + 2, DT, t2);
    expect(uniforms.uCompile.value[MACHINE.quoter]).toBe(1);
    expect(hud.running).toBe(true);                                  // re-locked
    expect(uniforms.uVel.value).toBeGreaterThan(0.3);                // and the impulse fired again
  });

  it('?freeze=<s>: the compile holds at s / 2.2 through T0 and every frame after, so a still can be taken there', () => {
    const { d, uniforms } = driver({ pinned: pinnedCompile('?freeze=0.6', false) });
    d.intro.pending = true;
    frames(d, 200);
    expect(d.intro.pending).toBe(false);
    expect(dbso.t0).not.toBeNull();
    expect(uniforms.uCompile.value[MACHINE.quoter]).toBeCloseTo(0.6 / TIMING.heroCompileS, 6);
    expect(hud.running).toBe(false);
  });

  it('?built=0 pins the hero at 0 whatever startIntro says; reduced motion pins it at 1, built and running from the first frame', () => {
    const zero = driver({ pinned: 0 });
    zero.d.intro.pending = true;
    frames(zero.d, 200);
    expect(zero.uniforms.uCompile.value[MACHINE.quoter]).toBe(0);
    const rm = driver({ pinned: 1, reducedMotion: true });
    stepFrame(rm.d, DT, DT);
    expect(rm.uniforms.uCompile.value[MACHINE.quoter]).toBe(1);
    expect(rm.uniforms.uRun.value[MACHINE.quoter]).toBe(1);        // run = 1 from the first frame: no run-up, no impulse
    expect(rm.uniforms.uVel.value).toBe(0);
    expect(hud.running).toBe(true);
    expect(rm.uniforms.uCompile.value[MACHINE.intake]).toBe(0);     // only the hero is pinned; the intake still scrubs
  });

  it('the shared intro is what the component drives, and startIntro only marks it for the next frame', () => {
    const before = intro.pending;
    startIntro();
    expect(intro.pending).toBe(true);
    intro.pending = before;
    const { d } = driver();
    expect(d.intro).not.toBe(intro);
    expect(createClocksDriver({ result: desktop, uniforms: createUniforms(), tier: 'desktop', scroll: scrollRef('desktop'), reducedMotion: false, built: false, pinned: null, theme: 'light' }).intro).toBe(intro);
  });
});

describe('the visitor', () => {
  const V = MACHINE.visitor;
  const LOCK_S = (lockStart(1) + TIMING.lockW) * TIMING.visitorCompileS;   // the visitor's lever lands at ≈ 1.39 s
  const first = planVisitor('build a thing that runs. then another.', 'desktop')!;
  const second = planVisitor('a second thing.', 'desktop')!;
  beforeEach(() => { upload.mockClear(); clear.mockClear(); });

  it('the scan period a keystroke sets: 3 s before any, 0.4 + 2.6·e^(−0.3·k) after k, toward 0.4 s', () => {
    expect(slotPeriodFor(0)).toBe(3);
    expect(slotPeriodFor(1)).toBeCloseTo(0.4 + 2.6 * Math.exp(-0.3), 12);
    expect(slotPeriodFor(40)).toBeCloseTo(0.4, 4);
    expect(SLOT_PERIOD_REST_S).toBe(3);
  });

  it('Enter on the empty slot uploads the plan on the next frame and compiles it over 1.4 s; the lever lock switches it on', () => {
    const { d, uniforms } = driver();
    const t = frames(d, 10);
    expect(uniforms.uCompile.value[V]).toBe(0);
    requestVisitor(d.visitor, first);
    expect(upload).not.toHaveBeenCalled();                          // lands on the frame, not the event
    stepFrame(d, DT, t + DT);                                        // the build starts here
    expect(upload).toHaveBeenCalledTimes(1);
    expect(upload).toHaveBeenCalledWith(first);
    expect(uniforms.uCompile.value[V]).toBe(0);
    stepFrame(d, DT, t + DT + 0.7);
    expect(uniforms.uCompile.value[V]).toBeCloseTo(0.5, 6);
    stepFrame(d, DT, t + DT + LOCK_S - 0.01);
    expect(uniforms.uRun.value[V]).toBe(0);                          // the lever is still dropping
    stepFrame(d, DT, t + DT + LOCK_S);
    expect(uniforms.uVel.value).toBeCloseTo(TIMING.impulse, 6);      // it locks: impulse and rate spike
    expect(uniforms.uFillRate.value[V]).toBe(3);
    frames(d, 30, DT, t + DT + LOCK_S);
    expect(uniforms.uCompile.value[V]).toBe(1);
    expect(uniforms.uRun.value[V]).toBeGreaterThan(0.8);
    expect(uniforms.uMachineTime.value[V]).toBeGreaterThan(0);      // and the words ping on its clock
    expect(upload).toHaveBeenCalledTimes(1);                         // one upload, not one per frame
    expect(uniforms.uCompile.value[MACHINE.quoter]).toBe(0);        // the hero is not touched
  });

  it('Enter again tears the sentence down over 0.6 s, then uploads the next and builds it from 0; the latest Enter wins', () => {
    const { d, uniforms } = driver();
    requestVisitor(d.visitor, first);
    let t = frames(d, 150);                                          // 2.5 s: built and running
    expect(uniforms.uCompile.value[V]).toBe(1);
    requestVisitor(d.visitor, second);
    stepFrame(d, DT, (t += DT));                                     // the teardown starts from 1
    expect(uniforms.uCompile.value[V]).toBe(1);
    stepFrame(d, DT, t + 0.3);
    expect(uniforms.uCompile.value[V]).toBeCloseTo(0.5, 6);
    expect(d.clocks.locked[V]).toBe(0);                              // below the lock: it winds down
    const third = planVisitor('a third.', 'desktop')!;
    requestVisitor(d.visitor, third);                                // typed over mid-teardown
    stepFrame(d, DT, t + 0.59);
    expect(upload).toHaveBeenCalledTimes(1);                         // nothing lands until the teardown ends
    stepFrame(d, DT, t + 0.6);
    expect(upload).toHaveBeenCalledTimes(2);
    expect(upload).toHaveBeenLastCalledWith(third);
    expect(uniforms.uCompile.value[V]).toBe(0);
    stepFrame(d, DT, t + 0.6 + 0.7);
    expect(uniforms.uCompile.value[V]).toBeCloseTo(0.5, 6);
    expect(clear).not.toHaveBeenCalled();
  });

  it('a request mid-compile tears down from where the compile stands, not from 1', () => {
    const { d, uniforms } = driver();
    requestVisitor(d.visitor, first);
    stepFrame(d, DT, 1);
    stepFrame(d, DT, 1.7);
    expect(uniforms.uCompile.value[V]).toBeCloseTo(0.5, 6);
    requestVisitor(d.visitor, second);
    stepFrame(d, DT, 1.75);
    expect(uniforms.uCompile.value[V]).toBeCloseTo(0.5, 6);
    stepFrame(d, DT, 2.05);
    expect(uniforms.uCompile.value[V]).toBeCloseTo(0.25, 6);
  });

  it('a clear tears the sentence down and then zero-scales the reserve; a clear on the empty slot lands at once', () => {
    const { d, uniforms } = driver();
    requestVisitor(d.visitor, first);
    let t = frames(d, 150);
    requestVisitor(d.visitor, null);
    stepFrame(d, DT, (t += DT));
    stepFrame(d, DT, t + 0.59);
    expect(clear).not.toHaveBeenCalled();
    expect(uniforms.uCompile.value[V]).toBeGreaterThan(0);
    stepFrame(d, DT, (t += 0.6));
    expect(clear).toHaveBeenCalledTimes(1);
    expect(uniforms.uCompile.value[V]).toBe(0);
    expect(d.visitor.built).toBe(false);
    requestVisitor(d.visitor, null);                                 // Escape again on the empty slot
    stepFrame(d, DT, t + DT);
    expect(clear).toHaveBeenCalledTimes(2);
    expect(uniforms.uCompile.value[V]).toBe(0);
    requestVisitor(d.visitor, first);                                // and the next Enter builds at once
    stepFrame(d, DT, t + 2 * DT);
    expect(upload).toHaveBeenCalledTimes(2);
  });

  it("writes hud.visitorParts, the footer's share: the built sentence's layout count from the frame it lands, through its teardown, and 0 once cleared", () => {
    const { d } = driver();
    hud.visitorParts = -1;
    let t = frames(d, 2);
    expect(hud.visitorParts).toBe(0);                                // the empty slot
    requestVisitor(d.visitor, first);
    stepFrame(d, DT, (t += DT));
    expect(hud.visitorParts).toBe(first.result.counts.total);
    expect(hud.visitorParts).toBe(12);
    t = frames(d, 150, DT, t);
    requestVisitor(d.visitor, second);
    stepFrame(d, DT, (t += DT));                                     // the teardown starts: the sentence still stands
    stepFrame(d, DT, t + 0.59);
    expect(hud.visitorParts).toBe(first.result.counts.total);
    stepFrame(d, DT, (t += 0.6));                                    // the next one lands
    expect(hud.visitorParts).toBe(second.result.counts.total);
    requestVisitor(d.visitor, null);
    frames(d, 60, DT, t);                                            // a clear: 0.6 s down, then the reserve is zero-scaled
    expect(hud.visitorParts).toBe(0);
  });

  it('keystrokes reseed uSlotPeriod, which relaxes back to 3 s with τ 10 s; a build starts the count over', () => {
    const { d, uniforms } = driver();
    frames(d, 2);
    expect(uniforms.uSlotPeriod.value).toBe(3);
    for (let k = 0; k < 5; k++) keyVisitor(d.visitor);
    expect(d.visitor.slotPeriod).toBeCloseTo(slotPeriodFor(5), 12);
    const p0 = d.visitor.slotPeriod;
    frames(d, 200, 0.05);                                            // 10 s = one τ
    expect(uniforms.uSlotPeriod.value).toBeCloseTo(3 - (3 - p0) * Math.exp(-10 / SLOT_PERIOD_TAU_S), 4);
    requestVisitor(d.visitor, first);
    stepFrame(d, DT, 20);
    keyVisitor(d.visitor);
    expect(d.visitor.slotPeriod).toBeCloseTo(slotPeriodFor(1), 12);
  });

  // The slot's scan bar is a triangle wave of uSlotPhase (scan.glsl.ts). The slot has no lever, so its mt has run since
  // load: fract(mt / period) with a period that changes per keystroke would jump the bar and alias it backward.
  describe('the slot bar\'s scan phase', () => {
    const S = MACHINE.slot;
    const wrapHalf = (x: number) => x - Math.round(x);   // a phase step, in cycles, taken in (−0.5, 0.5]
    const fract = (x: number) => x - Math.floor(x);

    it('90 s in, twenty keystrokes speed the bar up with no jump and no reversal, and it eases back to 3 s', () => {
      const { d, uniforms } = driver();
      let t = frames(d, 1800, 0.05);                                  // 90 s: the slot's clock is far from 0
      expect(uniforms.uMachineTime.value[S]).toBeGreaterThan(89);
      // untouched, the bar is where it always was: mt / 3 s
      expect(uniforms.uSlotPhase.value).toBeCloseTo(fract(uniforms.uMachineTime.value[S] / SLOT_PERIOD_REST_S), 2);
      const step = () => {
        const before = uniforms.uSlotPhase.value;
        stepFrame(d, DT, (t += DT));
        return wrapHalf(uniforms.uSlotPhase.value - before);
      };
      let last = step();
      expect(last).toBeCloseTo(DT / SLOT_PERIOD_REST_S, 9);
      for (let k = 1; k <= 20; k++) {
        keyVisitor(d.visitor);
        const dp = step();
        expect(dp, `key ${k}`).toBeCloseTo(DT / uniforms.uSlotPeriod.value, 9);   // forward, one frame at this period
        expect(dp, `key ${k}`).toBeGreaterThan(last);                             // faster with every key
        last = dp;
      }
      expect(last).toBeGreaterThan(DT / 0.45);                        // near the 0.4 s floor
      for (let f = 0; f < 600; f++) {                                 // 10 s with no typing: it slows, still forward
        const dp = step();
        expect(dp, `frame ${f}`).toBeGreaterThan(0);
        expect(dp, `frame ${f}`).toBeLessThanOrEqual(last);
        last = dp;
      }
      expect(uniforms.uSlotPeriod.value).toBeGreaterThan(2);
      expect(uniforms.uSlotPhase.value).toBeGreaterThanOrEqual(0);    // wrapped, so the float uniform keeps its precision
      expect(uniforms.uSlotPhase.value).toBeLessThan(1);
    });

    it('under reduced motion the bar scans at the machines\' reduced pace, in step with the slot\'s mt', () => {
      const { d, uniforms } = driver({ reducedMotion: true });
      frames(d, 60);
      expect(uniforms.uSlotPhase.value).toBeCloseTo((60 * DT * 0.3) / SLOT_PERIOD_REST_S, 9);
      expect(uniforms.uSlotPhase.value).toBeCloseTo(uniforms.uMachineTime.value[S] / SLOT_PERIOD_REST_S, 6);
    });

    it('stepVisitor advances the phase by rate · dt / period, at the period this frame relaxed to', () => {
      const v = createVisitorClock();
      expect(v.slotPhase).toBe(0);
      stepVisitor(v, 1, DT, 1);
      expect(v.slotPhase).toBeCloseTo(DT / v.slotPeriod, 12);
      keyVisitor(v);
      const before = v.slotPhase;
      stepVisitor(v, 1 + DT, DT, 0.5);
      expect(v.slotPhase - before).toBeCloseTo((0.5 * DT) / v.slotPeriod, 12);
    });
  });

  it('?built=1 pins the visitor at 1: Enter still uploads, and the sentence shows built at once', () => {
    const { d, uniforms } = driver({ built: true });
    requestVisitor(d.visitor, first);
    stepFrame(d, DT, 1);
    expect(upload).toHaveBeenCalledWith(first);
    expect(uniforms.uCompile.value[V]).toBe(1);
  });

  it('a fresh clock is empty and parked', () => {
    const v = createVisitorClock();
    expect(stepVisitor(v, 5, DT, 1)).toBe(0);
    expect(v).toMatchObject({ built: false, tearing: false, queued: null, keystrokes: 0 });
    expect(upload).not.toHaveBeenCalled();
    expect(clear).not.toHaveBeenCalled();
  });
});

// Reduced motion (design §11): the scrubbed compiles become 300 ms fades keyed on the build window, the fill, the
// velocity and the lean kick are off, the bed steps slowly, the camera's target is the pose table's nearest station.
describe('reduced motion', () => {
  const HERON = SECTION_INDEX.heron, B = MACHINE.balance;
  const { ranges } = pageRanges('desktop');
  const at = (section: number, u: number) => gAt(ranges, section, u);
  const heronBuild = SECTIONS[HERON].build!;

  it('fades a scrubbed compile to 1 over 300 ms when its build window is entered, whatever u does inside it', () => {
    expect(REDUCED_COMPILE_S).toBe(0.3);
    const { d, uniforms } = driver({ reducedMotion: true, g: at(HERON, heronBuild.from - 0.05) });
    let t = frames(d, 10);
    expect(uniforms.uCompile.value[B]).toBe(0);
    d.scroll.current!.g = at(HERON, heronBuild.from + 0.02);        // scrubbed, this would be 0.06
    stepFrame(d, DT, (t += DT));                                     // the fade starts here, from 0
    expect(uniforms.uCompile.value[B]).toBe(0);
    d.scroll.current!.g = at(HERON, heronBuild.from + 0.1);         // deeper into the window: no restart
    stepFrame(d, DT, t + 0.15);
    expect(uniforms.uCompile.value[B]).toBeCloseTo(0.5, 6);
    expect(uniforms.uRun.value[B]).toBe(0);                          // not yet locked
    stepFrame(d, DT, t + REDUCED_COMPILE_S);
    expect(uniforms.uCompile.value[B]).toBe(1);
    expect(uniforms.uRun.value[B]).toBe(1);                          // locked: it runs at once, with no impulse
    expect(uniforms.uVel.value).toBe(0);
    d.scroll.current!.g = at(HERON, 0.9);                            // past the window: still 1, nothing restarts
    stepFrame(d, DT, t + 1);
    expect(uniforms.uCompile.value[B]).toBe(1);
  });

  it('fades it back to 0 over 300 ms, from where it stands, when the window is left above', () => {
    const { d, uniforms } = driver({ reducedMotion: true, g: at(HERON, heronBuild.from - 0.05) });
    let t = frames(d, 2);
    d.scroll.current!.g = at(HERON, 0.3);
    stepFrame(d, DT, (t += DT));
    stepFrame(d, DT, t + 0.15);                                      // half way in
    d.scroll.current!.g = at(HERON, heronBuild.from - 0.05);         // and back out above the window
    stepFrame(d, DT, (t += 0.15));
    expect(uniforms.uCompile.value[B]).toBeCloseTo(0.5, 6);
    stepFrame(d, DT, t + 0.15);
    expect(uniforms.uCompile.value[B]).toBeCloseTo(0.25, 6);
    stepFrame(d, DT, t + REDUCED_COMPILE_S);
    expect(uniforms.uCompile.value[B]).toBe(0);
  });

  it('snaps on the first frame: a load deep in the page shows what is behind it built and what is ahead of it pencil', () => {
    const { d, uniforms } = driver({ reducedMotion: true, g: at(HERON, 0.3) });
    stepFrame(d, DT, DT);
    expect(uniforms.uCompile.value[MACHINE.intake]).toBe(1);        // 03 is behind
    expect(uniforms.uCompile.value[B]).toBe(1);                      // inside heron's window
    expect(uniforms.uCompile.value[MACHINE.splitter]).toBe(0);      // 05 is ahead
    expect(uniforms.uCompile.value[MACHINE.quoter]).toBe(0);        // the hero is not a scrubbed compile: its pin is null here
  });

  it('writes no fill rate, no velocity and no lean kick; the merge clicks still follow the scroll', () => {
    const more = SECTION_INDEX.more;
    const { d, uniforms } = driver({ reducedMotion: true, velocity: 1, g: at(more, 0.9) });
    frames(d, 60);
    expect(Array.from(uniforms.uFillRate.value)).toEqual(new Array(MACHINE_COUNT).fill(0));
    expect(uniforms.uVel.value).toBe(0);
    expect(uniforms.uLean.value).toBe(0);
    const s = sceneState(at(more, 0.9), ranges, 'desktop', createSceneState());
    expect(s.lean).toBeGreaterThan(0.5);                             // what the full-motion page kicks with
    expect(uniforms.uMerge.value).toBe(s.merge);
    d.scroll.current!.g = at(more, 0.375);
    frames(d, 1);
    expect(uniforms.uMerge.value).toBeGreaterThan(2);
  });

  it('hands CameraRig the pose table\'s nearest station, not the scrubbed curve', () => {
    const { d } = driver({ reducedMotion: true, g: at(0, 0.5) });   // mid-rise: the scrubbed pose is between the keys
    frames(d, 1);
    const [hero, , risen] = CAMERA_KEYS.desktop;
    expect(hud.pose.position).toEqual(hero.pose.position);
    expect(hud.pose.lookAt).toEqual(hero.pose.lookAt);
    d.scroll.current!.g = at(0, 0.6);                                // past the rise's midpoint (0.575)
    frames(d, 1);
    expect(hud.pose.position).toEqual(risen.pose.position);
    expect(hud.pose.lookAt).toEqual(risen.pose.lookAt);
    const full = driver({ g: at(0, 0.5) });
    frames(full.d, 1);
    const scrubbed = { position: [0, 0, 0], lookAt: [0, 0, 0], fov: 0 };
    evaluatePose(0, 0.5, 'desktop', scrubbed);
    hud.pose.position.forEach((x, k) => expect(x).toBeCloseTo(scrubbed.position[k], 9));   // full motion keeps the curve
    expect(hud.pose.position[1]).not.toBeCloseTo(hero.pose.position[1], 3);
  });

  it('stationPose: each key is its own station; between two keys the nearer one in section + u', () => {
    const out = { position: [0, 0, 0], lookAt: [0, 0, 0], fov: 0 };
    for (const tier of ['desktop', 'phone'] as const) {
      const keys = CAMERA_KEYS[tier];
      keys.forEach((k, i) => {
        stationPose(k.section, k.u, tier, out);
        expect(out, `${tier} key ${i}`).toEqual({ position: [...k.pose.position], lookAt: [...k.pose.lookAt], fov: k.pose.fov });
        const next = keys[i + 1];
        if (!next) return;
        const mid = (k.section + k.u + next.section + next.u) / 2;
        stationPose(0, mid - 1e-6, tier, out);
        expect(out.position, `${tier} before the midpoint after key ${i}`).toEqual([...k.pose.position]);
        stationPose(0, mid + 1e-6, tier, out);
        expect(out.position, `${tier} past the midpoint after key ${i}`).toEqual([...next.pose.position]);
      });
      const last = keys[keys.length - 1];
      stationPose(last.section, 1, tier, out);
      expect(out.position).toEqual([...last.pose.position]);
    }
  });

  it('compiles the visitor over 300 ms and tears it down over 300 ms', () => {
    const { d, uniforms } = driver({ reducedMotion: true });
    const V = MACHINE.visitor;
    const plan = planVisitor('build a thing that runs.', 'desktop')!;
    requestVisitor(d.visitor, plan);
    let t = frames(d, 1);
    stepFrame(d, DT, t + 0.15);
    expect(uniforms.uCompile.value[V]).toBeCloseTo(0.5, 6);
    stepFrame(d, DT, (t += REDUCED_COMPILE_S));
    expect(uniforms.uCompile.value[V]).toBe(1);
    expect(uniforms.uRun.value[V]).toBe(1);
    requestVisitor(d.visitor, null);
    stepFrame(d, DT, (t += DT));
    stepFrame(d, DT, t + 0.15);
    expect(uniforms.uCompile.value[V]).toBeCloseTo(0.5, 6);
    stepFrame(d, DT, t + REDUCED_COMPILE_S);
    expect(d.visitor.built).toBe(false);
  });
});

// The component wiring, through R3F's reconciler against a renderer stub: useScroll inside the canvas, the themechange
// listener, useFrame at −1 before CameraRig at 0, the debug switch read from location.search, window.__dbso and the
// dbso:rebuild listener.
describe('<Clocks result uniforms tier /> and <CameraRig /> mounted through R3F', () => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  extend({ Group: THREE.Group });

  function rendererStub(): THREE.WebGLRenderer {
    return {
      render() {}, setSize() {}, setPixelRatio() {},
      shadowMap: { enabled: false, type: THREE.PCFShadowMap, needsUpdate: false },
      outputColorSpace: THREE.SRGBColorSpace, toneMapping: THREE.NoToneMapping, domElement: {},
    } as unknown as THREE.WebGLRenderer;
  }
  function withoutClockWarning<T>(fn: () => T): T {
    const warn = console.warn;
    const spy = vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => { if (!String(args[0]).startsWith('THREE.Clock')) warn(...args); });
    try { return fn(); } finally { spy.mockRestore(); }
  }

  beforeEach(() => {
    mockScroll.state = scrollRef('desktop');
    mockScroll.reducedMotion = false;
    mockScroll.tier = 'desktop';
    Object.assign(intro, createIntro());   // the module's intro is shared: no T0 from an earlier mount
    dbso.t0 = null;
  });

  async function mount(query: string, uniforms: BenchUniforms = createUniforms()) {
    stubDom('light', query);
    const root = withoutClockWarning(() => createRoot({} as HTMLCanvasElement));
    await root.configure({ gl: rendererStub(), size: { width: 1440, height: 900, top: 0, left: 0 }, dpr: 1, frameloop: 'never' });
    const store = await act(async () => root.render(createElement('group', null,
      createElement(Clocks, { result: desktop, uniforms, tier: 'desktop' }),
      createElement(CameraRig))));
    return { root, store, uniforms, advance: (t: number) => act(async () => { store.getState().advance(t, true); }) };
  }

  it('reads the scroll refs through useScroll, runs before CameraRig, and the camera lands on the pose Clocks wrote this frame', async () => {
    const { root, store, uniforms, advance } = await mount('');
    const camera = store.getState().camera as THREE.PerspectiveCamera;
    expect(cameraRef.current).toBe(camera);
    const r = mockScroll.state.current.ranges;
    mockScroll.state.current.g = gAt(r, 0, 0.5);
    await advance(DT);
    const expected = { position: [0, 0, 0], lookAt: [0, 0, 0], fov: 0 };
    evaluatePose(0, 0.5, 'desktop', expected);
    expect(hud.pose.position).toEqual(expected.position);
    // CameraRig ran after Clocks in the same frame; its orbit round-trips through the lookAt, so compare within an ulp
    camera.position.toArray().forEach((v, k) => expect(v).toBeCloseTo(expected.position[k], 12));
    expect(uniforms.uCompile.value[MACHINE.quoter]).toBe(0);       // no startIntro yet: the fade has not ended
    expect(uniforms.uTime.value).toBeCloseTo(DT, 9);
    await act(async () => root.unmount());
    expect(cameraRef.current).toBeNull();
  });

  it('installs window.__dbso with the query pins, and pins the hero where ?freeze says', async () => {
    const { root, uniforms, advance } = await mount('?freeze=0.6');
    expect((window as unknown as { __dbso?: DbsoDebug }).__dbso).toBe(dbso);
    expect(dbso.freeze).toBe(0.6);
    expect(dbso.built).toBe(false);
    expect(dbso.t0).toBeNull();
    startIntro();
    await advance(DT);
    expect(dbso.t0).not.toBeNull();
    await advance(3);
    expect(uniforms.uCompile.value[MACHINE.quoter]).toBeCloseTo(0.6 / TIMING.heroCompileS, 6);
    await act(async () => root.unmount());
  });

  it('runs the hero tween from the frame after startIntro, restarts it on dbso:rebuild, and lets go of the listener on unmount', async () => {
    const { root, uniforms, advance } = await mount('');
    await advance(DT);
    expect(uniforms.uCompile.value[MACHINE.quoter]).toBe(0);
    startIntro();                                                    // Scene, at the end of the fade
    await advance(1);                                                // T0 = 1
    expect(uniforms.uCompile.value[MACHINE.quoter]).toBe(0);
    await advance(2.1);
    expect(uniforms.uCompile.value[MACHINE.quoter]).toBeCloseTo(0.5, 6);
    await advance(4);
    expect(uniforms.uCompile.value[MACHINE.quoter]).toBe(1);
    expect(hud.running).toBe(true);
    win.dispatchEvent(new CustomEvent('dbso:rebuild'));              // the h1 or #rebuild
    expect(intro.pending).toBe(true);
    await advance(5);                                                // T0' = 5
    expect(uniforms.uCompile.value[MACHINE.quoter]).toBe(0);
    expect(hud.running).toBe(false);
    await advance(6.1);
    expect(uniforms.uCompile.value[MACHINE.quoter]).toBeCloseTo(0.5, 6);
    await act(async () => root.unmount());
    win.dispatchEvent(new CustomEvent('dbso:rebuild'));
    expect(intro.pending).toBe(false);                               // unsubscribed
  });

  it('takes hud.gl down on unmount, so the DOM shows section 02\'s copy whole once no frame writes hud.click', async () => {
    hud.gl = false;
    const { root, advance } = await mount('');
    await advance(DT);
    expect(hud.gl).toBe(true);
    await act(async () => root.unmount());
    expect(hud.gl).toBe(false);
  });

  it('takes hud.visitorParts down on unmount: the visitor goes with the scene, so the footer stops counting it', async () => {
    const { root, advance } = await mount('');
    await advance(DT);
    win.dispatchEvent(new CustomEvent('dbso:visitor:build', { detail: { text: 'build a thing that runs. then another.' } }));
    await advance(1);
    expect(hud.visitorParts).toBe(12);
    await act(async () => root.unmount());
    expect(hud.visitorParts).toBe(0);
  });

  it('?built=1 builds and runs everything from the first frame', async () => {
    const { root, uniforms, advance } = await mount('?built=1');
    await advance(DT);
    expect(Array.from(uniforms.uCompile.value)).toEqual(new Array(MACHINE_COUNT).fill(1));
    expect(hud.running).toBe(true);
    await advance(2 * DT);
    expect(uniforms.uMachineTime.value[MACHINE.quoter]).toBeGreaterThan(0);
    await act(async () => root.unmount());
  });

  it('follows themechange with the 300 ms lerp while mounted, and lets go of the listener on unmount', async () => {
    const { root, uniforms, advance } = await mount('');
    expect(hexOf(uniforms.uPaper.value)).toBe(PALETTES.light.paper);
    switchTheme('dark');
    for (let i = 1; i <= 9; i++) await advance(i / 60);   // 0.15 s of frames: a frame is clamped to 50 ms, so one long advance would not do
    const a = hexToColor(PALETTES.light.paper), b = hexToColor(PALETTES.dark.paper);
    expectColorClose(uniforms.uPaper.value, new THREE.Color().lerpColors(a, b, 0.5), 1 / 255, 'uPaper mid-lerp');
    for (let i = 10; i <= 30; i++) await advance(i / 60);
    expect(hexOf(uniforms.uPaper.value)).toBe(PALETTES.dark.paper);
    await act(async () => root.unmount());
    switchTheme('light');
    expect(hexOf(uniforms.uPaper.value)).toBe(PALETTES.dark.paper);   // unsubscribed
  });

  it('listens for dbso:visitor:build, :clear and :key, lays the sentence out on the event, and lets go on unmount', async () => {
    upload.mockClear(); clear.mockClear();
    const { root, uniforms, advance } = await mount('');
    await advance(DT);
    const text = 'build a thing that runs. then another.';
    win.dispatchEvent(new CustomEvent('dbso:visitor:build', { detail: { text } }));
    await advance(1);
    expect(upload).toHaveBeenCalledTimes(1);
    expect(upload.mock.calls[0][0]).toEqual(planVisitor(text, 'desktop'));
    expect(upload.mock.calls[0][0].result.counts.total).toBe(12);
    await advance(1.7);
    expect(uniforms.uCompile.value[MACHINE.visitor]).toBeCloseTo(0.5, 6);
    win.dispatchEvent(new CustomEvent('dbso:visitor:key'));
    await advance(1.75);
    expect(uniforms.uSlotPeriod.value).toBeLessThan(slotPeriodFor(1) + 0.01);
    win.dispatchEvent(new CustomEvent('dbso:visitor:clear'));
    await advance(1.8);                                              // the teardown starts
    await advance(2.4);                                              // and ends
    expect(clear).toHaveBeenCalledTimes(1);
    expect(uniforms.uCompile.value[MACHINE.visitor]).toBe(0);
    win.dispatchEvent(new CustomEvent('dbso:visitor:build', { detail: { text: '   ' } }));   // a blank sentence clears
    await advance(2.5);
    expect(clear).toHaveBeenCalledTimes(2);
    expect(upload).toHaveBeenCalledTimes(1);
    const removed = vi.spyOn(win, 'removeEventListener');
    await act(async () => root.unmount());
    const events = ['dbso:visitor:build', 'dbso:visitor:clear', 'dbso:visitor:key'];
    for (const e of events) expect(removed.mock.calls.some(([name]) => name === e), e).toBe(true);
    removed.mockRestore();
  });
});
