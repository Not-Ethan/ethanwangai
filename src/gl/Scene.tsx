'use client';
// The GL layer's root (spec §6, §7, §11). It mounts inside Stage 0's fixed div.valley-canvas, whose CSS background is
// the committed still, so the first paint is a picture. The canvas mounts at opacity 0; the warm-up fades it in and
// records T0. No WebGL2 (or ?nogl=1, read by webgl2Available), a renderer error, or a lost context unmounts the canvas
// and leaves the still and the DOM. Sky, stars, moon, terrain, river, mist (desktop), buildings, windows, glow, the lights, the
// camera rig and the driver are the scene for this stage.
import { Component, useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, type RootState } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';
import { CAMERA_LANDSCAPE, PLACES } from '@/valley/layout';
import { webgl2Available } from '@/fallback/glSupport';
import { useScroll } from '@/scroll/ScrollProvider';
import { useTier } from './useTier';
import {
  attachFog, attachPointLight, attachSun, createSceneRefs, POINT_LIGHTS, type SceneRefs, type ValleyUniforms,
} from './driverCore';
import { CAMERA_FAR, CAMERA_NEAR, createRig } from './cameraCore';
import { warmUp } from './warmup';
import { frame } from './frame';
import { CameraRig } from './CameraRig';
import { Driver } from './Driver';
import { Sky } from './Sky';
import { Stars } from './Stars';
import { Moon } from './Moon';
import { Terrain } from './Terrain';
import { River } from './River';
import { Mist } from './Mist';
import { Buildings } from './Buildings';
import { Windows } from './Windows';
import { Glow } from './Glow';

export const HEMI_INTENSITY = 20.0;
export const SHADOW_MAP_SIZE = 1024;
const SHADOW_EXTENT = 70;

const HIDDEN = { opacity: 0 } as const;
const SHADOW_MAP = { type: THREE.PCFShadowMap } as const;
const CAMERA_OPTIONS = {
  position: [CAMERA_LANDSCAPE.position[0], CAMERA_LANDSCAPE.position[1], CAMERA_LANDSCAPE.position[2]] as [number, number, number],
  fov: CAMERA_LANDSCAPE.fov,
  near: CAMERA_NEAR,
  far: CAMERA_FAR,
};

/** A renderer failure must not take the DOM down; it unmounts the canvas and the still stays (spec §11). */
export class GLErrorBoundary extends Component<{ onError: () => void; children?: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export function Scene() {
  const [failed, setFailed] = useState(() => !webgl2Available());
  const fail = useCallback(() => setFailed(true), []);
  if (failed) return null;
  return (
    <GLErrorBoundary onError={fail}>
      <ValleyCanvas onFail={fail} />
    </GLErrorBoundary>
  );
}

function ValleyCanvas({ onFail }: { onFail: () => void }) {
  const { tier, dpr, shadows, onDecline } = useTier();
  const { reducedMotion } = useScroll();
  const uniforms = frame.targets.uniforms;
  const refs = useMemo(() => createSceneRefs(), []);
  const rig = useMemo(() => createRig(), []);
  const t0 = useRef<number | null>(null);
  const fade = useRef<HTMLDivElement>(null);
  const fog = useMemo(() => {
    const f = new THREE.Fog(uniforms.uFogColor.value, uniforms.uFogNear.value, uniforms.uFogFar.value);
    f.color = uniforms.uFogColor.value;   // shared by reference: the driver writes it, the fog reads it
    return f;
  }, [uniforms]);
  const gl = useMemo(
    () => ({ antialias: tier === 'desktop', powerPreference: 'high-performance' as const, alpha: false }),
    [tier],
  );

  const onCreated = useCallback((state: RootState) => {
    state.gl.localClippingEnabled = true;
    state.gl.toneMapping = THREE.ACESFilmicToneMapping;
    state.gl.outputColorSpace = THREE.SRGBColorSpace;
    state.scene.fog = fog;
    attachFog(refs, fog);
    state.gl.domElement.addEventListener('webglcontextlost', onFail, { once: true });
    void warmUp({
      fontsReady: document.fonts.ready,
      compile: () => state.gl.compileAsync(state.scene, state.camera),
      renderOnce: () => state.gl.render(state.scene, state.camera),
      fadeIn: (ms) => {
        const el = fade.current;
        if (!el) return;
        el.style.transition = `opacity ${ms}ms`;
        el.style.opacity = '1';
      },
      wait: (ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
      now: () => performance.now(),
    }).then((t) => { t0.current = t; });
  }, [fog, refs, onFail]);

  return (
    <div ref={fade} data-valley-fade="" className="absolute inset-0" style={HIDDEN}>
      <Canvas
        dpr={dpr}
        shadows={shadows ? SHADOW_MAP : false}
        gl={gl}
        camera={CAMERA_OPTIONS}
        frameloop="always"
        onCreated={onCreated}
      >
        <PerformanceMonitor onDecline={onDecline}>
          <SceneLights uniforms={uniforms} refs={refs} shadows={shadows} />
          <Sky uniforms={uniforms} />
          <Stars uniforms={uniforms} tier={tier} />
          <Moon uniforms={uniforms} />
          <Terrain shadows={shadows} />
          <River uniforms={uniforms} />
          {tier === 'desktop' && <Mist uniforms={uniforms} />}
          <Buildings shadows={shadows} />
          <Windows refs={refs} />
          <Glow refs={refs} />
          <CameraRig rig={rig} tier={tier} reducedMotion={reducedMotion} />
          <Driver refs={refs} rig={rig} t0={t0} />
        </PerformanceMonitor>
      </Canvas>
    </div>
  );
}

/** One hemisphere, one directional (moon/sun) with the desktop shadow map, four point lights (spec §6). */
function SceneLights({ uniforms, refs, shadows }: { uniforms: ValleyUniforms; refs: SceneRefs; shadows: boolean }) {
  const hemi = useRef<THREE.HemisphereLight>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  const points = useRef<(THREE.PointLight | null)[]>([]);

  useLayoutEffect(() => {
    const h = hemi.current;
    const s = sun.current;
    if (h) {
      h.color = uniforms.uHemiSky.value;
      h.groundColor = uniforms.uHemiGround.value;
    }
    if (s) s.color = uniforms.uSunColor.value;
    attachSun(refs, s);
    POINT_LIGHTS.forEach((_, k) => attachPointLight(refs, k, points.current[k] ?? null));
    return () => {
      attachSun(refs, null);
      POINT_LIGHTS.forEach((_, k) => attachPointLight(refs, k, null));
    };
  }, [uniforms, refs]);

  return (
    <>
      <hemisphereLight ref={hemi} intensity={HEMI_INTENSITY} />
      <directionalLight
        ref={sun}
        castShadow={shadows}
        shadow-mapSize-width={SHADOW_MAP_SIZE}
        shadow-mapSize-height={SHADOW_MAP_SIZE}
        shadow-camera-left={-SHADOW_EXTENT}
        shadow-camera-right={SHADOW_EXTENT}
        shadow-camera-top={SHADOW_EXTENT}
        shadow-camera-bottom={-SHADOW_EXTENT}
        shadow-camera-near={1}
        shadow-camera-far={200}
        shadow-bias={-0.0005}
      />
      {POINT_LIGHTS.map((p, k) => {
        const at = PLACES[p.place];
        return (
          <pointLight
            key={p.id}
            ref={(light) => { points.current[k] = light; }}
            position={[at[0], at[1] + p.lift, at[2] + p.forward]}
            distance={p.distance}
            decay={2}
            intensity={0}
          />
        );
      })}
    </>
  );
}
