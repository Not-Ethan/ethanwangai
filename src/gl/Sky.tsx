'use client';
// The sky dome (spec §4.1): one inverted sphere, drawn first (renderOrder -2), never culled, depth never written.
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { ValleyUniforms } from './driverCore';
import { createSkyMaterial, SKY_RADIUS } from './shaders/sky';

export function Sky({ uniforms }: { uniforms: ValleyUniforms }) {
  const geometry = useMemo(() => new THREE.SphereGeometry(SKY_RADIUS, 48, 24), []);
  const material = useMemo(() => createSkyMaterial(uniforms), [uniforms]);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  return <mesh geometry={geometry} material={material} renderOrder={-2} frustumCulled={false} />;
}
