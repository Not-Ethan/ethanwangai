'use client';
// The GL layer's root (design §6, §13): one fixed R3F Canvas behind the DOM at z-index 0 (main sits at 10), aria-hidden
// and pointer-events: none. Builds the bench once per tier, owns the uniform registry's scene constants and the OU
// texture, and mounts the light rig, the paper ground, the kits, the ink points, the clocks driver, the camera rig and the bed hover. The canvas is
// `flat` (no tone mapping): the palette uniforms must reach the screen as the palette's own sRGB values, so the paper,
// pencil and ink match the DOM's CSS tokens and the SVG plate they cross-fade with (§11). The wrapper mounts at
// opacity 0: the warm-up (§11) waits for the fonts, compiles every program, draws one frame, and only then fades the
// canvas in over 200 ms; the end of that fade is T0, when Clocks starts the hero compile. Under it, always, is the SVG
// layer (fallback/StaticPlates.tsx): the hero plate the canvas cross-fades over. With no WebGL2, a renderer failure or
// a lost context the Canvas unmounts and that layer becomes the SVG tier; the DOM is left as it is.
import { Component, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useThree, type RootState } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';
import type { Tier, Vec3 } from '@/bench/types';
import { StaticPlates } from '@/fallback/StaticPlates';
import { webgl2Available } from '@/fallback/glSupport';
import { buildBench } from '@/bench/counts';
import { hashString } from '@/bench/hash';
import { BENCH_SEED_TEXT } from '@/bench/bench';
import { OU, generateOU } from '@/bench/ou';
import { QUOTER_BED } from '@/bench/configs/quoter';
import { useScroll } from '@/scroll/ScrollProvider';
import { createUniforms, OU_STEPS_PER_SECOND, REDUCED_OU_STEPS_PER_SECOND, type BenchUniforms } from './material/uniforms';
import { KEY_LIGHT, Lights } from './Lights';
import { Ground } from './Ground';
import { Kits } from './Kits';
import { Ink } from './Ink';
import { Clocks, startIntro } from './Clocks';
import { CameraRig } from './CameraRig';
import { Hover } from './Hover';
import { TIER_SETTINGS, useTier } from './useTier';
import { hud } from './hud';

export const CAMERA = { fov: 30, near: 0.5, far: 120 } as const;
export const BENCH_CENTER: Vec3 = [0, 0, 1];
/** The cross-fade from paper to canvas; its end is T0. */
export const FADE_MS = 200;

// Canvas options, hoisted so a re-render of Scene (a theme change re-renders the whole tree under ThemeProvider) hands
// R3F the same objects and it reconfigures nothing. r185 retired PCFSoftShadowMap (it warns and falls back to PCF), so
// the shadow map is PCF outright; the softer rungs of the ladder are Stage 6's.
const GL_OPTIONS = { antialias: true, powerPreference: 'high-performance', alpha: false } as const;
const SHADOW_MAP = { type: THREE.PCFShadowMap } as const;
const CAMERA_OPTIONS = { ...CAMERA, position: hud.pose.position as [number, number, number] };
// The wrapper's rendered style never changes, so React never writes it again and the opacity warmUp sets stays.
const HIDDEN = { opacity: 0 } as const;

/** The quoter bed pitch for the tier: quoter.ts halves the columns on phone, which doubles the pitch (0.15 → 0.30). */
export function bedPitch(tier: Tier): number {
  return QUOTER_BED.pitch * (tier === 'phone' ? 2 : 1);
}

/** The OU quote texture: 256 markets × 2048 steps RGBA8 from the bench seed, linear filtering, no mipmaps. */
export function createOUTexture(seed: number = hashString(BENCH_SEED_TEXT)): THREE.DataTexture {
  const tex = new THREE.DataTexture(generateOU(seed), OU.markets, OU.steps, THREE.RGBAFormat);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

/**
 * The registry entries Scene owns: the tier's bed pitch, velocity stretch and leader-line switch (phone: half the
 * stretch, no lines; design §11), the key direction, the bench centre, the OU texture and its playback rate, which
 * reduced motion drops to 1 step a second so the bed steps at 1 Hz (design §11). The balance pivot is the registry's
 * own constant (the post top, uniforms.ts), not the machine's centroid, which the lever pulls off the post.
 */
export function configureUniforms(u: BenchUniforms, tier: Tier, ou: THREE.Texture, reducedMotion = false): BenchUniforms {
  u.uPitch.value = bedPitch(tier);
  u.uStretch.value = TIER_SETTINGS[tier].stretch;
  u.uLines.value = TIER_SETTINGS[tier].lines;
  u.uKeyDir.value.set(...KEY_LIGHT.position).normalize();
  u.uBenchCenter.value.set(...BENCH_CENTER);
  u.uOU.value = ou;
  u.uOUInfo.value.w = reducedMotion ? REDUCED_OU_STEPS_PER_SECOND : OU_STEPS_PER_SECOND;
  return u;
}

/** Points `scene.background` and the clear colour at the registry's uPaper Color, by reference, opaque. */
export function bindPaper(scene: THREE.Scene, gl: THREE.WebGLRenderer, u: BenchUniforms): void {
  scene.background = u.uPaper.value;
  gl.setClearColor(u.uPaper.value, 1);
}

/**
 * Keeps the paper behind the bench bound to the registry Clocks is lerping. A tier change rebuilds `u` with fresh Color
 * objects, and a one-time `onCreated` binding would keep pointing at the old paper, which the lerp no longer writes (load
 * on desktop, resize below 820 px, toggle the theme: kits and ground change, background frozen). The layout effect is
 * keyed on the registry, and a child's layout effect runs before R3F's Provider flags the canvas active, so the first
 * frame clears to paper too.
 */
export function PaperBackground({ uniforms }: { uniforms: BenchUniforms }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => bindPaper(scene, gl, uniforms), [uniforms, gl, scene]);
  return null;
}

/**
 * The warm-up (§11), from R3F's onCreated, which fires once the scene graph exists and before anything has rendered:
 * wait for the fonts (the ink samples them too), compile every program off the first visible frame, draw one frame so
 * the shadow map and the uploads are done, then fade the wrapper in over FADE_MS and declare T0 when the fade ends.
 * The frame loop has been running underneath at opacity 0 the whole time (the bot has been pinging since load).
 */
export async function warmUp({ gl, scene, camera }: Pick<RootState, 'gl' | 'scene' | 'camera'>, wrapper: HTMLElement | null): Promise<void> {
  await document.fonts.ready;
  await gl.compileAsync(scene, camera);
  gl.render(scene, camera);
  if (wrapper) {
    wrapper.style.transition = `opacity ${FADE_MS}ms`;
    wrapper.style.opacity = '1';
  }
  await new Promise<void>((resolve) => setTimeout(resolve, FADE_MS));
  startIntro();
}

/**
 * Keeps a renderer failure (no WebGL2, context creation refused) from taking the DOM down with it; the DOM is the site
 * on its own. `onError` tells Scene, which switches the SVG layer to the tier.
 */
export class GLErrorBoundary extends Component<{ fallback: ReactNode; onError?: () => void; children?: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError?.(); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

/**
 * A lost context (a GPU reset, a driver update, the browser reclaiming it) takes the scene with it, after T0 as much as
 * before (Review Focus #5): the SVG tier takes over rather than a blank paper. Once: R3F's own forceContextLoss on the
 * unmount that follows fires it again.
 */
export function watchContextLoss(canvas: HTMLCanvasElement, onLost: () => void): void {
  canvas.addEventListener('webglcontextlost', onLost, { once: true });
}

/**
 * The GL layer's root: the SVG layer, and over it the canvas while WebGL2 holds. The probe runs once, on the first
 * render (Scene is client-only); a failure after it (the error boundary, a lost context) flips the same switch.
 */
export function Scene() {
  const [failed, setFailed] = useState(() => !webgl2Available());
  const fail = useCallback(() => setFailed(true), []);
  return (
    <>
      <StaticPlates mode={failed ? 'tier' : 'hero'} />
      {!failed && <GLLayer onFail={fail} />}
    </>
  );
}

function GLLayer({ onFail }: { onFail: () => void }) {
  const { tier, dpr, shadows, onDecline } = useTier();
  const { reducedMotion } = useScroll();
  const result = useMemo(() => buildBench(tier), [tier]);
  const ou = useMemo(() => createOUTexture(), []);
  const ouData = ou.image.data as Uint8Array;   // the tape the shader samples, which Hover's readout reads on the CPU
  const u = useMemo(() => configureUniforms(createUniforms(), tier, ou, reducedMotion), [tier, ou, reducedMotion]);
  useEffect(() => () => ou.dispose(), [ou]);
  const wrapper = useRef<HTMLDivElement>(null);

  return (
    <div ref={wrapper} className="pointer-events-none fixed inset-0 z-0" style={HIDDEN} aria-hidden>
      <GLErrorBoundary fallback={null} onError={onFail}>
        <Canvas
          dpr={dpr}
          shadows={shadows ? SHADOW_MAP : false}
          gl={GL_OPTIONS}
          camera={CAMERA_OPTIONS}
          frameloop="always"
          flat
          onCreated={(state) => { watchContextLoss(state.gl.domElement, onFail); void warmUp(state, wrapper.current); }}
        >
          <PaperBackground uniforms={u} />
          <PerformanceMonitor onDecline={onDecline}>
            <Lights uniforms={u} tier={tier} />
            <Ground uniforms={u} tier={tier} result={result} />
            <Kits result={result} uniforms={u} />
            <Ink result={result} uniforms={u} tier={tier} />
            <Clocks result={result} uniforms={u} tier={tier} />
            <CameraRig />
            <Hover result={result} uniforms={u} ouData={ouData} tier={tier} />
          </PerformanceMonitor>
        </Canvas>
      </GLErrorBoundary>
    </div>
  );
}
