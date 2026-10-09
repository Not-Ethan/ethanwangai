'use client';
// Every static building body in one draw (spec §6): merged at load, vertex colours, flat Lambert, a shadow caster.
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { buildingsGeometry } from './structures';

export function Buildings({ shadows }: { shadows: boolean }) {
  const geometry = useMemo(() => buildingsGeometry(), []);
  const material = useMemo(() => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), []);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  return <mesh geometry={geometry} material={material} castShadow={shadows} receiveShadow={shadows} />;
}
