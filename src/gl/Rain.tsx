'use client';
// Rain (spec §6, §11): one LineSegments draw centred on the camera for the current aspect. Scene mounts it only on the
// desktop tier and not under reduced motion (Task 3.11). uRain and uTime are the driver's holders.
import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { ALPHA, PALETTE } from '@/valley/palette';
import { CAMERA_LANDSCAPE, CAMERA_PORTRAIT } from '@/valley/layout';
import { RAIN, buildRainGeometry } from './rainGeometry';
import { RAIN_FRAG, RAIN_VERT } from './shaders/rain';

export function createRainMaterial(rain: { value: number }, time: { value: number }): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: RAIN_VERT,
    fragmentShader: RAIN_FRAG,
    uniforms: {
      uRain: rain,
      uTime: time,
      uSpeed: { value: RAIN.speed },
      uHeight: { value: RAIN.height },
      uStreak: { value: RAIN.streak },
      uColor: { value: new THREE.Color(PALETTE.rain) },
      uAlpha: { value: ALPHA.rain },
    },
    transparent: true,
    depthWrite: false,
  });
}

export function Rain({ rain, time }: { rain: { value: number }; time: { value: number } }) {
  const geometry = useMemo(() => buildRainGeometry(), []);
  const material = useMemo(() => createRainMaterial(rain, time), [rain, time]);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const origin = width < height ? CAMERA_PORTRAIT.position : CAMERA_LANDSCAPE.position;
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  return (
    <lineSegments
      geometry={geometry}
      material={material}
      position={[origin[0], origin[1], origin[2]]}
      frustumCulled={false}
    />
  );
}
