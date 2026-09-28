'use client';
// The GL layer's root (design §6, §13): one fixed R3F Canvas behind the DOM at z-index 0 (main sits at 10), aria-hidden
// and pointer-events: none. Builds the bench once per tier, owns the uniform registry's scene constants and the OU
// texture, and mounts the light rig, the paper ground, the kits, the ink points, the clocks driver and the camera rig. The canvas is
// `flat` (no tone mapping): the palette uniforms must reach the screen as the palette's own sRGB values, so the paper,
// pencil and ink match the DOM's CSS tokens and the SVG plate they cross-fade with (§11). Warm-up and the cross-fade
// arrive in Stage 5.
import { Component, useEffect, useLayoutEffect, useMemo, type ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';
import { MACHINE, type LayoutResult, type Tier, type Vec3 } from '@/bench/types';
import { buildBench } from '@/bench/counts';
import { hashString } from '@/bench/hash';
import { BENCH_SEED_TEXT } from '@/bench/bench';
import { OU, generateOU } from '@/bench/ou';
import { QUOTER_BED } from '@/bench/configs/quoter';
import { createUniforms, type BenchUniforms } from './material/uniforms';
import { KEY_LIGHT, Lights } from './Lights';
import { Ground } from './Ground';
import { Kits } from './Kits';
import { Ink } from './Ink';
import { Clocks } from './Clocks';
import { CameraRig } from './CameraRig';
import { useTier } from './useTier';
import { hud } from './hud';

export const CAMERA = { fov: 30, near: 0.5, far: 120 } as const;
export const BENCH_CENTER: Vec3 = [0, 0, 1];

// Canvas options, hoisted so a re-render of Scene (a theme change re-renders the whole tree under ThemeProvider) hands
// R3F the same objects and it reconfigures nothing. r185 retired PCFSoftShadowMap (it warns and falls back to PCF), so
// the shadow map is PCF outright; the softer rungs of the ladder are Stage 6's.
const GL_OPTIONS = { antialias: true, powerPreference: 'high-performance', alpha: false } as const;
const SHADOW_MAP = { type: THREE.PCFShadowMap } as const;
const CAMERA_OPTIONS = { ...CAMERA, position: hud.pose.position as [number, number, number] };
/** POST_H in src/bench/configs/balance.ts: the rail's centre line, which the balance tilts about. */
export const BALANCE_PIVOT_Y = 0.9;

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

/** The registry entries Scene owns: the tier's bed pitch, the key direction, the bench centre, the balance pivot, the OU texture. */
export function configureUniforms(u: BenchUniforms, tier: Tier, result: LayoutResult, ou: THREE.Texture): BenchUniforms {
  u.uPitch.value = bedPitch(tier);
  u.uKeyDir.value.set(...KEY_LIGHT.position).normalize();
  u.uBenchCenter.value.set(...BENCH_CENTER);
  const c = result.machines[MACHINE.balance].centroid;
  u.uBalancePivot.value.set(c[0], BALANCE_PIVOT_Y, c[2]);
  u.uOU.value = ou;
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

/** Keeps a renderer failure (no WebGL2, context creation refused) from taking the DOM down with it; the DOM is the site on its own. */
export class GLErrorBoundary extends Component<{ fallback: ReactNode; children?: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export function Scene() {
  const { tier, dpr, shadows, onDecline } = useTier();
  const result = useMemo(() => buildBench(tier), [tier]);
  const ou = useMemo(() => createOUTexture(), []);
  const u = useMemo(() => configureUniforms(createUniforms(), tier, result, ou), [tier, result, ou]);
  useEffect(() => () => ou.dispose(), [ou]);

  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
      <GLErrorBoundary fallback={null}>
        <Canvas
          dpr={dpr}
          shadows={shadows ? SHADOW_MAP : false}
          gl={GL_OPTIONS}
          camera={CAMERA_OPTIONS}
          frameloop="always"
          flat
        >
          <PaperBackground uniforms={u} />
          <PerformanceMonitor onDecline={onDecline}>
            <Lights uniforms={u} tier={tier} />
            <Ground uniforms={u} tier={tier} result={result} />
            <Kits result={result} uniforms={u} />
            <Ink result={result} uniforms={u} tier={tier} />
            <Clocks result={result} uniforms={u} tier={tier} />
            <CameraRig />
          </PerformanceMonitor>
        </Canvas>
      </GLErrorBoundary>
    </div>
  );
}
