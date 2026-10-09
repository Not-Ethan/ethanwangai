'use client';
// The river ribbon (spec §4.1): 160 x 12 at y = 0.2 along +x, flow shader on ambient time.
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { TERRAIN } from '@/valley/terrain';
import type { ValleyUniforms } from './driverCore';
import { createRiverMaterial, RIVER_WIDTH, RIVER_Y } from './shaders/river';

export function River({ uniforms }: { uniforms: ValleyUniforms }) {
  const geometry = useMemo(() => new THREE.PlaneGeometry(TERRAIN.width, RIVER_WIDTH, 1, 1).rotateX(-Math.PI / 2), []);
  const material = useMemo(() => createRiverMaterial(uniforms), [uniforms]);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  return <mesh geometry={geometry} material={material} position={[0, RIVER_Y, 0]} renderOrder={1} />;
}
