'use client';
// Every window, porch light and lamp head in one InstancedMesh of capacity 512 (spec §6). The instance data lives in
// a WindowSet; the driver scatters per-emitter levels into its `lit` array each frame through refs.windows.
import { useEffect, useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { attachSink, type SceneRefs } from './driverCore';
import { createWindowSet, WINDOW_CAPACITY } from './structures';
import { createWindowsMaterial } from './shaders/windows';

export function Windows({ refs }: { refs: SceneRefs }) {
  const set = useMemo(() => createWindowSet(), []);
  const mesh = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(1, 1);
    geometry.setAttribute('aLit', new THREE.InstancedBufferAttribute(set.lit, 1).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('aRow', new THREE.InstancedBufferAttribute(set.rows, 1));
    const m = new THREE.InstancedMesh(geometry, createWindowsMaterial(), WINDOW_CAPACITY);
    m.instanceMatrix = new THREE.InstancedBufferAttribute(set.matrices, 16);
    m.instanceColor = new THREE.InstancedBufferAttribute(set.colors, 3);
    m.count = set.count;
    m.frustumCulled = false;
    return m;
  }, [set]);

  useLayoutEffect(() => {
    const attr = mesh.geometry.getAttribute('aLit') as THREE.BufferAttribute;
    attachSink(refs, 'windows', { lit: set.lit, map: set.emitterOf, count: set.count, attr });
    return () => attachSink(refs, 'windows', null);
  }, [refs, set, mesh]);

  useEffect(() => () => {
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
    mesh.dispose();
  }, [mesh]);

  return <primitive object={mesh} />;
}
