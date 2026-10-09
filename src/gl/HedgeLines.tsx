'use client';
// The hedge lines (spec §4.4, §6): one LineSegments draw. uReveal is the holder applyFrame writes the latched hedge
// reveal into (Task 3.8); it is assigned after the merge so it stays the same object, not a clone.
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { ALPHA, PALETTE } from '@/valley/palette';
import { HEDGE_SEGMENTS, buildHedgeGeometry } from './hedgeGeometry';
import { HEDGE_FRAG, HEDGE_VERT } from './shaders/hedge';

export function createHedgeMaterial(reveal: { value: number }): THREE.ShaderMaterial {
  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    {
      uColor: { value: new THREE.Color(PALETTE.hedge) },
      uAlpha: { value: ALPHA.hedge },
      uSegments: { value: HEDGE_SEGMENTS },
    },
  ]);
  uniforms.uReveal = reveal;
  return new THREE.ShaderMaterial({
    vertexShader: HEDGE_VERT,
    fragmentShader: HEDGE_FRAG,
    uniforms,
    fog: true,
    transparent: true,
    depthWrite: false,
  });
}

export function HedgeLines({ reveal }: { reveal: { value: number } }) {
  const geometry = useMemo(() => buildHedgeGeometry(), []);
  const material = useMemo(() => createHedgeMaterial(reveal), [reveal]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  return <lineSegments geometry={geometry} material={material} />;
}
