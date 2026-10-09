'use client';
// The moon (spec §4.1): one camera-facing disc placed by uMoonPos in its vertex shader, alpha from uMoonAlpha.
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { ValleyUniforms } from './driverCore';
import { createMoonMaterial } from './shaders/sky';

export function Moon({ uniforms }: { uniforms: ValleyUniforms }) {
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const material = useMemo(() => createMoonMaterial(uniforms), [uniforms]);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  return <mesh geometry={geometry} material={material} renderOrder={-1} frustumCulled={false} />;
}
