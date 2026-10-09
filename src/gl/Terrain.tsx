'use client';
// The ground (spec §4.1, §6): one flat-shaded Lambert mesh with vertex colours and the treeline merged in. It only
// receives shadows.
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { terrainGeometry } from './fieldGeometry';

export function Terrain({ shadows }: { shadows: boolean }) {
  const geometry = useMemo(() => terrainGeometry(), []);
  const material = useMemo(() => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), []);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  return <mesh geometry={geometry} material={material} receiveShadow={shadows} />;
}
