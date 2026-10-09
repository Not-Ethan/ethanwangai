import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import type { SectionId, SectionRange } from '@/valley/types';
import { SECTIONS, sectionRanges } from '@/valley/sections';
import { timelineAt } from '@/valley/timeline';
import { environmentAt } from '@/valley/environment';
import { EMITTERS } from '@/valley/lights';
import {
  applyFrame, attachFog, attachPointLight, attachSink, attachSun, createFrame, createFrameTargets, createSceneRefs, createUniforms,
  hexToColor, POINT_LIGHTS, REST_LIT, scatterLit, setFrameInputs, SUN_DISTANCE, syncScene,
} from './driverCore';
import { EMITTER_COUNT, EMITTER_INDEX } from './projection';

function rangesAt(vh: number): SectionRange[] {
  let top = 0;
  const tops: number[] = [];
  for (const s of SECTIONS) {
    tops.push(top);
    top += (s.heightVh / 100) * vh;
  }
  return sectionRanges(tops, top, vh);
}
const RANGES = rangesAt(900);
function mid(id: SectionId): number {
  const r = RANGES.find((x) => x.id === id)!;
  return (r.start + r.end) / 2;
}
function frameAt(g: number, opts: { portrait?: boolean; reducedMotion?: boolean; t?: number } = {}) {
  const f = createFrame(createUniforms(), new Float32Array(EMITTER_COUNT * 3));
  setFrameInputs(f.inputs, g, RANGES, opts.t ?? 1, 1 / 60, null, opts.reducedMotion ?? false, opts.portrait ?? false);
  applyFrame(f.inputs, f.targets);
  return f;
}
const hex = (c: THREE.Color) => `#${c.getHexString()}`;

describe('applyFrame', () => {
  it('writes the environment for the timeline tod (spec §5.2)', () => {
    for (const g of [0, mid('kalshi'), mid('darch'), 1]) {
      const f = frameAt(g);
      const u = f.targets.uniforms;
      const tl = timelineAt(g, RANGES, false);
      const env = environmentAt(tl.tod);
      expect(u.uTod.value).toBeCloseTo(tl.tod, 9);
      expect(hex(u.uZenith.value)).toBe(env.zenith.toLowerCase());
      expect(hex(u.uHorizon.value)).toBe(env.horizon.toLowerCase());
      expect(hex(u.uEast.value)).toBe(env.east.toLowerCase());
      expect(hex(u.uFogColor.value)).toBe(env.fogColor.toLowerCase());
      expect(hex(u.uHemiSky.value)).toBe(env.hemiSky.toLowerCase());
      expect(hex(u.uHemiGround.value)).toBe(env.hemiGround.toLowerCase());
      expect(hex(u.uSunColor.value)).toBe(env.sunColor.toLowerCase());
      expect(u.uFogNear.value).toBe(env.fogNear);
      expect(u.uFogFar.value).toBe(env.fogFar);
      expect(u.uSunIntensity.value).toBe(env.sunIntensity);
      expect(u.uStarAlpha.value).toBe(env.starAlpha);
      expect(u.uMoonAlpha.value).toBe(env.moonAlpha);
      expect(u.uSunDir.value.toArray()).toEqual([...env.sunDir]);
      expect(u.uMoonPos.value.toArray()).toEqual([...env.moonPos]);
    }
  });

  it('writes the view and picks the portrait yaw column when portrait (spec §3)', () => {
    const g = mid('darch');
    const land = frameAt(g).targets.uniforms;
    const port = frameAt(g, { portrait: true }).targets.uniforms;
    expect(land.uYaw.value).toBeCloseTo(timelineAt(g, RANGES, false).view.yaw, 9);
    expect(port.uYaw.value).toBeCloseTo(timelineAt(g, RANGES, true).view.yaw, 9);
    expect(land.uPitch.value).toBeCloseTo(timelineAt(g, RANGES, false).view.pitch, 9);
    expect(land.uFovScale.value).toBeCloseTo(timelineAt(g, RANGES, false).view.fovScale, 9);
  });

  it('writes uRidgeReveal and uHedgeReveal from g and latches them (spec §2 reveals latch, §16)', () => {
    const f = createFrame(createUniforms(), new Float32Array(EMITTER_COUNT * 3));
    const u = f.targets.uniforms;
    const step = (g: number) => {
      setFrameInputs(f.inputs, g, RANGES, 1, 1 / 60, null, false, false);
      applyFrame(f.inputs, f.targets);
    };
    step(0);
    expect(u.uRidgeReveal.value).toBeCloseTo(0.01, 6);
    step(mid('kalshi'));
    const half = u.uRidgeReveal.value;
    expect(half).toBeGreaterThan(0.1);
    expect(half).toBeLessThan(1);
    step(0);
    expect(u.uRidgeReveal.value).toBe(half);
    step(mid('heron'));
    expect(u.uRidgeReveal.value).toBe(1);
    const hedge = u.uHedgeReveal.value;
    expect(hedge).toBeGreaterThan(0.1);
    step(0);
    expect(u.uHedgeReveal.value).toBe(hedge);
    expect(f.targets.latched).toEqual({ ridge: 1, hedge });
  });

  it('lets darchOverride win over the timeline', () => {
    const f = frameAt(0);
    f.inputs.darchOverride = 0.5;
    applyFrame(f.inputs, f.targets);
    expect(f.targets.uniforms.uDarchT.value).toBe(0.5);
  });

  it('freezes ambient time and drops rain under reduced motion (spec §8, §11)', () => {
    const live = frameAt(mid('darch'), { t: 42 });
    expect(live.targets.uniforms.uTime.value).toBe(42);
    expect(live.targets.uniforms.uRain.value).toBeCloseTo(timelineAt(mid('darch'), RANGES).rain, 9);
    const still = frameAt(mid('darch'), { t: 42, reducedMotion: true });
    expect(still.targets.uniforms.uTime.value).toBe(0);
    expect(still.targets.uniforms.uRain.value).toBe(0);
  });

  it('survives empty ranges (the provider has not measured yet) with finite values', () => {
    const f = createFrame(createUniforms(), new Float32Array(EMITTER_COUNT * 3));
    setFrameInputs(f.inputs, 0.3, [], 1, 1 / 60, null, false, false);
    expect(() => applyFrame(f.inputs, f.targets)).not.toThrow();
    const u = f.targets.uniforms;
    for (const v of [u.uTod.value, u.uYaw.value, u.uFovScale.value, u.uFogNear.value, u.uRidgeReveal.value]) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });

  it('survives a NaN g by treating it as 0', () => {
    const f = frameAt(Number.NaN);
    expect(f.targets.uniforms.uTod.value).toBe(timelineAt(0, RANGES).tod);
  });

  it('createFrameTargets hands out independent targets', () => {
    const a = createFrameTargets();
    const b = createFrameTargets();
    expect(a.uniforms).not.toBe(b.uniforms);
    expect(a.projected).not.toBe(b.projected);
    expect(a.lit.length).toBe(EMITTER_COUNT);
    expect(a.latched).toEqual({ ridge: 0, hedge: 0 });
  });

  it('writes a new uniforms object even when g has not changed', () => {
    const g = mid('darch');
    frameAt(g);
    const second = frameAt(g);
    expect(hex(second.targets.uniforms.uZenith.value)).toBe(environmentAt(timelineAt(g, RANGES).tod).zenith.toLowerCase());
  });

  it('lights every registered emitter at rest except the visitor (Stage 2, spec §4.7)', () => {
    const f = frameAt(0);
    expect(f.targets.lit.length).toBe(EMITTERS.length);
    EMITTERS.forEach((e, i) => expect(f.targets.lit[i], e.id).toBe(e.id === 'visitor' ? 0 : 1));
    expect(Array.from(REST_LIT)).toEqual(Array.from(f.targets.lit));
  });

  it('allocates nothing per frame at rest (spec §12)', () => {
    const f = createFrame(createUniforms(), new Float32Array(EMITTER_COUNT * 3));
    setFrameInputs(f.inputs, mid('darch'), RANGES, 0, 1 / 60, null, false, false);
    // Warm up past the JIT tiers so compilation garbage is not counted as per-frame allocation.
    for (let i = 0; i < 100000; i++) {
      f.inputs.t = i / 60;
      applyFrame(f.inputs, f.targets);
    }
    // Nine samples of 1,000 calls; the smallest delta is the per-frame signal (a GC or a background compile landing
    // inside one sample inflates only that sample, which made this test flaky under full-suite load).
    const gc = (globalThis as { gc?: () => void }).gc;
    let best = Number.POSITIVE_INFINITY;
    for (let k = 0; k < 9; k++) {
      gc?.();
      const before = process.memoryUsage().heapUsed;
      for (let i = 0; i < 1000; i++) {
        f.inputs.t = 10 + k + i / 60;
        applyFrame(f.inputs, f.targets);
      }
      best = Math.min(best, process.memoryUsage().heapUsed - before);
    }
    // The true per-call figure is about 16 to 32 bytes (measured with gc); the bound is loose enough to ignore
    // background compiler garbage under full-suite load and tight enough to catch a per-emitter allocation.
    expect(best).toBeLessThan(400 * 1024);
  });
});

describe('helpers', () => {
  it('hexToColor matches Color.set for every environment colour', () => {
    const env = environmentAt(0.45);
    for (const h of [env.zenith, env.horizon, env.east, env.fogColor, env.sunColor]) {
      const a = hexToColor(h, new THREE.Color());
      const b = new THREE.Color(h);
      expect(a.r).toBeCloseTo(b.r, 6);
      expect(a.g).toBeCloseTo(b.g, 6);
      expect(a.b).toBeCloseTo(b.b, 6);
    }
  });

  it('scatterLit copies per-emitter levels to per-instance slots and reports change', () => {
    const lit = Float32Array.of(0.25, 1, 1.6);
    const map = Uint8Array.of(2, 0, 0, 1);
    const out = new Float32Array(4);
    expect(scatterLit(lit, map, 4, out)).toBe(true);
    expect(Array.from(out)).toEqual([1.600000023841858, 0.25, 0.25, 1]);
    expect(scatterLit(lit, map, 4, out)).toBe(false);
    expect(scatterLit(lit, map, 2, new Float32Array(1))).toBe(true);
  });

  it('syncScene writes fog range, sun, point light intensities and flags changed sinks', () => {
    const u = createUniforms();
    u.uFogNear.value = 30;
    u.uFogFar.value = 200;
    u.uSunDir.value.set(0, 2, 0);
    u.uSunIntensity.value = 0.35;
    const refs = createSceneRefs();
    const fog = new THREE.Fog(u.uFogColor.value, 1, 2);
    const sun = new THREE.DirectionalLight();
    const points = POINT_LIGHTS.map(() => new THREE.PointLight());
    attachFog(refs, fog);
    attachSun(refs, sun);
    points.forEach((p, k) => attachPointLight(refs, k, p));
    const attr = new THREE.InstancedBufferAttribute(new Float32Array(3), 1);
    attachSink(refs, 'windows', { lit: attr.array as Float32Array, map: Uint8Array.of(0, 1, 2), source: { count: 3 }, attr });
    const lit = new Float32Array(EMITTER_COUNT).fill(1);
    lit[EMITTER_INDEX.visitor] = 0;
    const v0 = attr.version;
    syncScene(refs, u, lit);
    expect([fog.near, fog.far]).toEqual([30, 200]);
    expect(sun.position.toArray()).toEqual([0, SUN_DISTANCE, 0]);
    expect(sun.intensity).toBe(0.35);
    POINT_LIGHTS.forEach((p, k) => expect(points[k].intensity).toBe(p.base * lit[EMITTER_INDEX[p.id]]));
    expect(attr.version).toBe(v0 + 1);
    syncScene(refs, u, lit);
    expect(attr.version).toBe(v0 + 1);
  });

  it('a sink follows its source count live (Stage 4 window slots)', () => {
    const refs = createSceneRefs();
    const attr = new THREE.InstancedBufferAttribute(new Float32Array(4), 1);
    const source = { count: 2 };
    attachSink(refs, 'windows', { lit: attr.array as Float32Array, map: Uint8Array.of(0, 0, 0, 0), source, attr });
    const lit = new Float32Array(EMITTER_COUNT).fill(1);
    syncScene(refs, createUniforms(), lit);
    expect(Array.from(attr.array)).toEqual([1, 1, 0, 0]);
    source.count = 4;
    syncScene(refs, createUniforms(), lit);
    expect(Array.from(attr.array)).toEqual([1, 1, 1, 1]);
  });
});
