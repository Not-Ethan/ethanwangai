// The ?debug=1 overlay (spec §14 G7). A requestAnimationFrame loop outside React (the scene keeps its one useFrame):
// frame intervals into a FrameWindow, gl.render wrapped for CPU time, renderer.info read between frames (three resets
// it at the start of each render, so this is the last frame's total). Exposes window.__ortgPerf for the gate agent.
import type { Camera, Object3D, Scene, WebGLRenderer } from 'three';
import type { Tier } from '@/valley/types';
import { FrameWindow, formatOverlay, splitDraws, verdict, type PerfSnapshot } from './perfStats';

const context: { tier: Tier; rung: number } = { tier: 'desktop', rung: 0 };

export function setPerfContext(tier: Tier, rung: number): void {
  context.tier = tier;
  context.rung = rung;
}

function heapMB(): number | null {
  const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
  return mem ? mem.usedJSHeapSize / 1048576 : null;
}

function countShadows(scene: Scene): { casters: number; lights: number } {
  let casters = 0;
  let lights = 0;
  scene.traverseVisible((o) => {
    const flags = o as Object3D & { isMesh?: boolean; isLight?: boolean };
    if (flags.isMesh && o.castShadow) casters++;
    if (flags.isLight && o.castShadow) lights++;
  });
  return { casters, lights };
}

interface PerfApi { snapshot(): PerfSnapshot; reset(): void; verdict(): ReturnType<typeof verdict> }

export function attachPerfProbe(gl: WebGLRenderer, scene: Scene): () => void {
  const frames = new FrameWindow(2400);
  let renderMs = 0;
  let heapStart = heapMB();
  let shadows = countShadows(scene);

  const originalRender = gl.render;
  gl.render = function timedRender(this: WebGLRenderer, s: Object3D, c: Camera) {
    const t0 = performance.now();
    originalRender.call(this, s, c);
    renderMs = performance.now() - t0;
  };

  const pre = document.createElement('pre');
  pre.id = 'perf';
  pre.className = 'mono';
  document.body.appendChild(pre);

  const snapshot = (): PerfSnapshot => {
    const f = frames.stats();
    const draws = splitDraws(gl.info.render.calls, shadows.casters, shadows.lights, gl.shadowMap.enabled);
    const now = heapMB();
    return {
      tier: context.tier, rung: context.rung, dpr: gl.getPixelRatio(),
      frames: f.frames, meanMs: f.meanMs, p95Ms: f.p95Ms, maxMs: f.maxMs, fps: f.meanMs > 0 ? 1000 / f.meanMs : 0,
      renderMs, calls: gl.info.render.calls, mainDraws: draws.main, shadowDraws: draws.shadow,
      heapGrowthMB: now === null || heapStart === null ? null : now - heapStart,
    };
  };
  const reset = () => {
    frames.reset();
    heapStart = heapMB();
  };
  const api: PerfApi = { snapshot, reset, verdict: () => verdict(snapshot()) };
  (window as Window & { __ortgPerf?: PerfApi }).__ortgPerf = api;

  let last = performance.now();
  let count = 0;
  let raf = requestAnimationFrame(function tick(now: number) {
    frames.push(now - last);
    last = now;
    count++;
    if (count % 30 === 0) {
      shadows = countShadows(scene);
      pre.textContent = formatOverlay(snapshot());
    }
    raf = requestAnimationFrame(tick);
  });

  return () => {
    cancelAnimationFrame(raf);
    gl.render = originalRender;
    pre.remove();
    delete (window as Window & { __ortgPerf?: PerfApi }).__ortgPerf;
  };
}
