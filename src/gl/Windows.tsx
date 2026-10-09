'use client';
// Every window, porch light and lamp head in one InstancedMesh of capacity 512 (spec §6). The instance data lives in
// a WindowSet; the driver scatters per-emitter levels into its `lit` array each frame through refs.windows.
import { useEffect, useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { attachSink, type SceneRefs } from './driverCore';
import { bindWindowBuffers, windowBuffersFor } from './windowSlots';
import { createWindowSet, WINDOW_CAPACITY } from './structures';
import { createWindowsMaterial } from './shaders/windows';

export function Windows({ refs, millRows }: { refs: SceneRefs; millRows?: { value: THREE.Vector4 } }) {
  const set = useMemo(() => createWindowSet(), []);
  const mesh = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(1, 1);
    geometry.setAttribute('aLit', new THREE.InstancedBufferAttribute(set.lit, 1).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('aRow', new THREE.InstancedBufferAttribute(set.rows, 1));
    const m = new THREE.InstancedMesh(geometry, createWindowsMaterial(millRows), WINDOW_CAPACITY);
    m.instanceMatrix = new THREE.InstancedBufferAttribute(set.matrices, 16);
    m.instanceColor = new THREE.InstancedBufferAttribute(set.colors, 3);
    m.count = set.count;
    m.frustumCulled = false;
    return m;
  }, [set, millRows]);

  useLayoutEffect(() => {
    const attr = mesh.geometry.getAttribute('aLit') as THREE.BufferAttribute;
    attachSink(refs, 'windows', { lit: set.lit, map: set.emitterOf, source: set, attr });
    return () => attachSink(refs, 'windows', null);
  }, [refs, set, mesh]);

  // Hillside and visitor windows (spec 4.7, 6) go after the static ones; see src/gl/windowSlots.ts.
  useEffect(() => {
    bindWindowBuffers(windowBuffersFor(mesh, set));
    return () => bindWindowBuffers(null);
  }, [mesh, set]);

  useEffect(() => () => {
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
    mesh.dispose();
  }, [mesh]);

  return <primitive object={mesh} />;
}
