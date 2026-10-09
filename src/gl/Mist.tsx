'use client';
// River mist (spec §4.1): 24 camera-facing sprites in one instanced draw, drifting +x and wrapping in the vertex
// shader. Scene mounts it on desktop only.
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { ValleyUniforms } from './driverCore';
import { MIST_COUNT, mistSeeds } from './fieldGeometry';
import { createMistMaterial } from './shaders/river';

export function Mist({ uniforms }: { uniforms: ValleyUniforms }) {
  const mesh = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(1, 1);
    geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(mistSeeds(), 4));
    const m = new THREE.InstancedMesh(geometry, createMistMaterial(uniforms), MIST_COUNT);
    m.frustumCulled = false;
    m.renderOrder = 2;
    return m;
  }, [uniforms]);
  useEffect(() => () => {
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
    mesh.dispose();
  }, [mesh]);
  return <primitive object={mesh} />;
}
