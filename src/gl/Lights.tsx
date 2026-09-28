'use client';
// The light rig (design §6, Light): one key DirectionalLight upper-left-front that casts the shadow map on desktop,
// and a HemisphereLight whose sky is the paper and whose ground is the shadow tone. Clocks fits the key light's
// orthographic shadow camera each frame through the registry's lightRef. The hemisphere's colors ARE the registry's
// uPaper / uShadow Color objects, so the 300 ms palette lerp (applyPalette, in place) reaches the sky and ground
// without a per-frame copy; a copy from Clocks is harmless.
import { useCallback } from 'react';
import type {} from '@react-three/fiber';
import type * as THREE from 'three';
import type { Tier } from '@/bench/types';
import type { BenchUniforms } from './material/uniforms';
import { setLightRef } from './registry';

export const KEY_LIGHT = {
  position: [-8, 14, 10] as const,
  intensity: 2.4,
  shadowMapSize: 2048,
  normalBias: 0.02,
  bias: -0.0002,
} as const;

/** Where the shadow camera starts before Clocks' first fit: a box over the whole ~15 × 10 bench, so the warm-up frame already carries shadows. */
export const SHADOW_CAMERA_START = { extent: 12, near: 1, far: 60 } as const;

export const HEMISPHERE_INTENSITY = 0.6;

/** Applies the key light's values to a live DirectionalLight. Shadows are desktop only; phone grounds with contact darkening alone. */
export function configureKeyLight(light: THREE.DirectionalLight, tier: Tier): void {
  light.position.set(...KEY_LIGHT.position);
  light.intensity = KEY_LIGHT.intensity;
  light.castShadow = tier === 'desktop';
  light.shadow.mapSize.set(KEY_LIGHT.shadowMapSize, KEY_LIGHT.shadowMapSize);
  light.shadow.normalBias = KEY_LIGHT.normalBias;
  light.shadow.bias = KEY_LIGHT.bias;
  const cam = light.shadow.camera;
  cam.left = -SHADOW_CAMERA_START.extent;
  cam.right = SHADOW_CAMERA_START.extent;
  cam.top = SHADOW_CAMERA_START.extent;
  cam.bottom = -SHADOW_CAMERA_START.extent;
  cam.near = SHADOW_CAMERA_START.near;
  cam.far = SHADOW_CAMERA_START.far;
  cam.updateProjectionMatrix();
}

/** Points the hemisphere's sky at uPaper and its ground at uShadow, by reference, at intensity 0.6. */
export function bindHemisphere(light: THREE.HemisphereLight, u: BenchUniforms): void {
  light.color = u.uPaper.value;
  light.groundColor = u.uShadow.value;
  light.intensity = HEMISPHERE_INTENSITY;
}

export function Lights({ uniforms, tier }: { uniforms: BenchUniforms; tier: Tier }) {
  // Ref callbacks with cleanup (React 19): the registry holds the light while it is mounted and null otherwise.
  // A tier change re-runs them, so a desktop → phone demotion drops the shadow map.
  const keyRef = useCallback((light: THREE.DirectionalLight | null) => {
    if (!light) return;
    configureKeyLight(light, tier);
    setLightRef(light);
    return () => setLightRef(null);
  }, [tier]);
  const hemiRef = useCallback((light: THREE.HemisphereLight | null) => {
    if (light) bindHemisphere(light, uniforms);
  }, [uniforms]);

  return (
    <>
      <directionalLight ref={keyRef} />
      <hemisphereLight ref={hemiRef} />
    </>
  );
}
