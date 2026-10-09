'use client';
// The mill wheel (spec §4.5, §6): one flat Lambert mesh in the wall colour, a shadow caster on desktop. Driver.tsx sets
// its rotation.z each frame from the angle applyFrame integrates (Task 3.9).
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { PALETTE } from '@/valley/palette';
import { MILL_WHEEL_POSITION, buildMillWheelGeometry } from './millWheelGeometry';
import { wheelRef } from './wheelRef';

function registerWheel(mesh: THREE.Mesh | null): () => void {
  wheelRef.current = mesh;
  return () => {
    wheelRef.current = null;
  };
}

export function MillWheel({ shadows }: { shadows: boolean }) {
  const geometry = useMemo(() => buildMillWheelGeometry(), []);
  const material = useMemo(() => new THREE.MeshLambertMaterial({ color: PALETTE.wall, flatShading: true }), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  return (
    <mesh
      ref={registerWheel}
      geometry={geometry}
      material={material}
      position={[MILL_WHEEL_POSITION[0], MILL_WHEEL_POSITION[1], MILL_WHEEL_POSITION[2]]}
      castShadow={shadows}
      receiveShadow={shadows}
    />
  );
}
