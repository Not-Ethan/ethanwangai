'use client';
// The ridge (spec §4.6, §6): one Points draw of the trades and one crest line under them. The reveal and the
// brightness are uniform holders applyFrame writes (Tasks 3.7, 3.8); this component never reads scroll.
import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { Tier } from '@/valley/types';
import { PALETTE } from '@/valley/palette';
import { CAMERA_LANDSCAPE, CAMERA_PORTRAIT } from '@/valley/layout';
import { getGlowTexture } from './glowTexture';
import { RIDGE_ALPHA, RIDGE_POINT_WORLD, buildRidgeGeometry, crestLinePoints, pointScale, ridgeConfig } from './ridgeGeometry';
import { RIDGE_FRAG, RIDGE_VERT } from './shaders/ridge';

export interface RidgeProps { tier: Tier; reveal: { value: number }; lit: { value: number } }

export function createRidgeMaterial(reveal: { value: number }, lit: { value: number }, sizeScale: number): THREE.ShaderMaterial {
  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    {
      uMap: { value: null },
      uColor: { value: new THREE.Color(PALETTE.ridge) },
      uAlpha: { value: RIDGE_ALPHA },
      uPixelScale: { value: pointScale(900, CAMERA_LANDSCAPE.fov) * RIDGE_POINT_WORLD * sizeScale },
    },
  ]);
  // shared holders and the shared texture are assigned after the merge, which would clone them
  uniforms.uReveal = reveal;
  uniforms.uLit = lit;
  uniforms.uMap.value = getGlowTexture();
  return new THREE.ShaderMaterial({
    vertexShader: RIDGE_VERT,
    fragmentShader: RIDGE_FRAG,
    uniforms,
    fog: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

function setPixelScale(material: THREE.ShaderMaterial, bufferHeightPx: number, fovDeg: number, sizeScale: number): void {
  material.uniforms.uPixelScale.value = pointScale(bufferHeightPx, fovDeg) * RIDGE_POINT_WORLD * sizeScale;
}

export function Ridge({ tier, reveal, lit }: RidgeProps) {
  const { count, sizeScale } = ridgeConfig(tier);
  const geometry = useMemo(() => buildRidgeGeometry(count), [count]);
  const material = useMemo(() => createRidgeMaterial(reveal, lit, sizeScale), [reveal, lit, sizeScale]);
  const crest = useMemo(() => crestLinePoints(), []);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const dpr = useThree((s) => s.viewport.dpr);

  useEffect(() => {
    setPixelScale(material, height * dpr, width < height ? CAMERA_PORTRAIT.fov : CAMERA_LANDSCAPE.fov, sizeScale);
  }, [material, width, height, dpr, sizeScale]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  return (
    <group>
      <Line points={crest} color={PALETTE.terrainCrest} lineWidth={2} />
      <points geometry={geometry} material={material} frustumCulled={false} />
    </group>
  );
}
