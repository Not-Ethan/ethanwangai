'use client';
// The ink points system (design §7): one stateless gl.POINTS draw of seven fixed partitions, built once from the
// layout (inkGeometry.ts) and drawn after the kits. The DOM is the ink's source: on mount, after document.fonts.ready
// and on debounced resize, every source element's glyph pixels are sampled into aSpawnUV (textSampler.ts) and its page
// rect cached (rects.ts); that is the only upload. Each frame, at priority 0 after Clocks (−1) has placed the section,
// the cached rects become uRect from the scroll offset alone, and the trickle's slot, the burst, the DPR and the band
// pitch are written into the registry. No React state, no getBoundingClientRect and no buffer upload on the scroll path.
import { useEffect, useLayoutEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { LayoutResult, Tier } from '@/bench/types';
import { hashString } from '@/bench/hash';
import { BENCH_SEED_TEXT } from '@/bench/bench';
import { mergeBurst } from '@/bench/sceneState';
import { useScroll } from '@/scroll/ScrollProvider';
import type { BenchUniforms } from './material/uniforms';
import {
  BAND_PITCH_PX, FIRST_LINE_SLOT, PARTITION, PARTITION_COUNT, buildInkGeometry, trickleSlot, writeCentroids, writeSpawnUV,
  type InkGeometryData,
} from './inkGeometry';
import { INK_VERTEX } from './shaders/ink.vert';
import { INK_FRAGMENT } from './shaders/ink.frag';
import { createCurlTexture } from './curl';
import { sampleTextPoints } from './textSampler';
import { RectTracker, type OffsetElement, type StickyElementSource } from './rects';
import { hud } from './hud';

/** Drawn after the kits, never sorted among them. */
export const INK_RENDER_ORDER = 10;
export const RESIZE_DEBOUNCE_MS = 200;

/** The DOM sources by uRect slot: the seven partitions' elements, and section 03's first line for the trickle. */
export interface InkSource { slot: number; selector: string; words?: string }
export const INK_SOURCES: readonly InkSource[] = [
  { slot: PARTITION.quoter, selector: '[data-ink-source="sentence"]', words: '[data-ink-words]' },
  { slot: PARTITION.intake, selector: '[data-ink-source="kalshi"]' },
  { slot: PARTITION.merge, selector: '[data-ink-source="more"]' },
  { slot: PARTITION.balance, selector: '[data-ink-source="heron"]' },
  { slot: PARTITION.splitter, selector: '[data-ink-source="darch"]' },
  { slot: PARTITION.watch, selector: '[data-ink-source="summers"]' },
  { slot: PARTITION.visitor, selector: '#yours-echo' },
  { slot: FIRST_LINE_SLOT, selector: '[data-ink-source="first"]' },
];

export interface InkPoints { geometry: THREE.BufferGeometry; data: InkGeometryData }

/** The point buffers as a BufferGeometry. `position` is aTarget's own attribute, so three has a vertex count without a second buffer. */
export function createInkPoints(result: LayoutResult, tier: Tier, seed: number): InkPoints {
  const data = buildInkGeometry(result, tier, seed);
  const geometry = new THREE.BufferGeometry();
  const target = new THREE.BufferAttribute(data.target, 3);
  geometry.setAttribute('position', target);
  geometry.setAttribute('aTarget', target);
  geometry.setAttribute('aTargetBirth', new THREE.BufferAttribute(data.targetBirth, 1));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(data.seed, 1));
  geometry.setAttribute('aRow', new THREE.BufferAttribute(data.row, 1));
  geometry.setAttribute('aPartition', new THREE.BufferAttribute(data.partition, 1));
  geometry.setAttribute('aTrickle', new THREE.BufferAttribute(data.trickle, 1));
  geometry.setAttribute('aSpawnUV', new THREE.BufferAttribute(new Float32Array(data.count * 2), 2));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e3);   // never culled; this only needs to exist
  return { geometry, data };
}

/** The points' GLSL3 ShaderMaterial, reading the registry's own `{ value }` entries by reference. */
export function createInkPointsMaterial(u: BenchUniforms): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: INK_VERTEX,
    fragmentShader: INK_FRAGMENT,
    uniforms: { ...u },
    transparent: true,
    depthTest: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
}

/** The nearest `position: sticky` ancestor of `el`, as the tracker's sticky source, or `el` itself when there is none. */
export function stickySource(el: HTMLElement): OffsetElement | StickyElementSource {
  for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.position !== 'sticky') continue;
    const container = node.parentElement ?? node;
    return { element: el, block: node, container, top: parseFloat(style.top) || 0, lead: parseFloat(getComputedStyle(container).paddingTop) || 0 };
  }
  return el;
}

/** Measures every source present in the DOM into the tracker and samples the partitions' text into aSpawnUV: one upload. */
export function registerSources(points: InkPoints, tracker: RectTracker): void {
  const sources: Record<number, OffsetElement | StickyElementSource> = {};
  const spawn = points.geometry.getAttribute('aSpawnUV') as THREE.BufferAttribute;
  const sizes = points.data.offsets.map((o, p, offsets) => (offsets[p + 1] ?? points.data.count) - o);
  let sampled = false;
  for (const { slot, selector, words } of INK_SOURCES) {
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) continue;
    sources[slot] = stickySource(el);
    if (slot >= PARTITION_COUNT) continue;
    const text = sampleTextPoints(el, words ? el.querySelector<HTMLElement>(words) : null);
    if (text.count === 0) continue;
    writeSpawnUV(spawn.array as Float32Array, points.data.offsets[slot], sizes[slot], text.uv, text.count);
    sampled = true;
  }
  tracker.measure(sources);
  if (sampled) spawn.needsUpdate = true;
}

/** Samples on mount and once fonts are in, then again on a debounced resize; returns the unsubscribe. */
export function followSources(points: InkPoints, tracker: RectTracker): () => void {
  let cancelled = false;
  let timer = 0;
  const measure = () => { if (!cancelled) registerSources(points, tracker); };
  measure();
  document.fonts.ready.then(measure);
  const onResize = () => { window.clearTimeout(timer); timer = window.setTimeout(measure, RESIZE_DEBOUNCE_MS); };
  window.addEventListener('resize', onResize);
  return () => {
    cancelled = true;
    window.clearTimeout(timer);
    window.removeEventListener('resize', onResize);
  };
}

/** The registry entries the layout and the curl volume own: written once, before the first frame draws. */
export function bindInkUniforms(u: BenchUniforms, curl: THREE.Data3DTexture, result: LayoutResult): void {
  u.uCurl.value = curl;
  writeCentroids(result, u.uCentroid.value);
}

/** One frame's registry writes, from the section Clocks placed this frame and the cached rects. */
export function writeInkFrame(u: BenchUniforms, tracker: RectTracker, scrollY: number, vw: number, vh: number, pixelRatio: number, reducedMotion: boolean): void {
  tracker.write(scrollY, vw, vh, u.uRect.value);
  const slot = trickleSlot(hud.section);
  if (slot >= 0) u.uActiveRect.value = slot;
  u.uTrickle.value = slot >= 0 && !reducedMotion ? 1 : 0;
  u.uBurst.value = mergeBurst(hud.section, hud.u);
  u.uPixelRatio.value = pixelRatio;
  u.uBandPitch.value = (BAND_PITCH_PX / vh) * 2;
}

export function Ink({ result, uniforms, tier }: { result: LayoutResult; uniforms: BenchUniforms; tier: Tier }) {
  const { state: scroll, reducedMotion } = useScroll();
  const points = useMemo(() => createInkPoints(result, tier, hashString(BENCH_SEED_TEXT)), [result, tier]);
  const material = useMemo(() => createInkPointsMaterial(uniforms), [uniforms]);
  const curl = useMemo(() => createCurlTexture(), []);
  const tracker = useMemo(() => new RectTracker(), []);
  useEffect(() => () => points.geometry.dispose(), [points]);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => curl.dispose(), [curl]);

  useLayoutEffect(() => bindInkUniforms(uniforms, curl, result), [uniforms, curl, result]);

  useEffect(() => followSources(points, tracker), [points, tracker]);

  // Priority 0: after Clocks (−1) has written hud.section for this frame. A priority above 0 would hand the render
  // loop to this hook (R3F stops rendering on its own), which is not what "after Clocks" means.
  useFrame((state) => {
    const sc = scroll.current;
    if (!sc) return;
    writeInkFrame(uniforms, tracker, sc.scrollY, sc.vw, sc.vh, state.gl.getPixelRatio(), reducedMotion);
  }, 0);

  return <points geometry={points.geometry} material={material} frustumCulled={false} renderOrder={INK_RENDER_ORDER} />;
}
