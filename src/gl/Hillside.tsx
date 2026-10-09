'use client';
// The five hillside houses (spec §3.2, §4.7): built once from copy.yours.hillside with the house grammar, merged into one
// static mesh (one draw), seated on PLACES.hill1…hill5. Each house's windows are registered under its own emitter, so
// Windows.tsx lights them with that emitter; this mesh itself never glows and is not a shadow caster.
import { useEffect, useMemo } from 'react';
import { MeshLambertMaterial } from 'three';
import { copy } from '@/site/copy';
import { useTier } from './useTier';
import { hillsideData, toBufferGeometry } from './houseGeometry';
import { setDynamicWindows } from './windowSlots';

function registerHillWindows(windows: ReturnType<typeof hillsideData>['windows']): () => void {
  for (const w of windows) setDynamicWindows(w.emitter, w.quads);
  return () => { for (const w of windows) setDynamicWindows(w.emitter, []); };
}

export function Hillside() {
  const { shadows } = useTier();
  const built = useMemo(() => hillsideData(copy.yours.hillside), []);
  const geometry = useMemo(() => toBufferGeometry(built.mesh), [built]);
  const material = useMemo(() => new MeshLambertMaterial({ vertexColors: true, flatShading: true }), []);
  useEffect(() => registerHillWindows(built.windows), [built]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  return <mesh geometry={geometry} material={material} receiveShadow={shadows} />;
}
