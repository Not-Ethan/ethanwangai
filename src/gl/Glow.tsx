'use client';
// One additive glow sprite per lit emitter, the ridge excluded (spec §6), in one instanced draw. The driver scatters
// the per-emitter levels into aLit each frame through refs.glow.
import { useEffect, useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { attachSink, type SceneRefs } from './driverCore';
import { getGlowTexture } from './glowTexture';
import { createGlowMaterial, glowInstances } from './shaders/glow';

export function Glow({ refs }: { refs: SceneRefs }) {
  const data = useMemo(() => glowInstances(), []);
  const mesh = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(1, 1);
    geometry.setAttribute('aLit', new THREE.InstancedBufferAttribute(data.lit, 1).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('aSize', new THREE.InstancedBufferAttribute(data.sizes, 1));
    const m = new THREE.InstancedMesh(geometry, createGlowMaterial(getGlowTexture()), data.count);
    m.instanceMatrix = new THREE.InstancedBufferAttribute(data.matrices, 16);
    m.instanceColor = new THREE.InstancedBufferAttribute(data.colors, 3);
    m.frustumCulled = false;
    m.renderOrder = 3;
    return m;
  }, [data]);

  useLayoutEffect(() => {
    const attr = mesh.geometry.getAttribute('aLit') as THREE.BufferAttribute;
    attachSink(refs, 'glow', { lit: data.lit, map: data.map, count: data.count, attr });
    return () => attachSink(refs, 'glow', null);
  }, [refs, data, mesh]);

  useEffect(() => () => {
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
    mesh.dispose();
  }, [mesh]);

  return <primitive object={mesh} />;
}
