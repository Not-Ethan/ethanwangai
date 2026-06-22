"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  glowVertex,
  glowFragment,
  makeGlowUniforms,
  makeGlowGeometry,
} from "./glow";
import { useMood } from "./MoodContext";
import { GROUND_Y } from "./Trees";

/**
 * Drifting pollen/dust that catches the daylight. Fades out as night falls.
 * The whole cloud follows the camera so density stays constant as you travel.
 */
export function Motes({ count = 280 }: { count?: number }) {
  const group = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const mood = useMood();

  const geo = useMemo(
    () => makeGlowGeometry(count, { x: 24, yMin: GROUND_Y, yMax: 12, z: 70 }),
    [count]
  );
  const uniforms = useMemo(
    () => makeGlowUniforms("#dfe9c4", { size: 9, sway: 0.7, bob: 0.5 }),
    []
  );

  useFrame((state) => {
    const m = matRef.current;
    if (m) {
      m.uniforms.uTime.value = state.clock.elapsedTime;
      m.uniforms.uOpacity.value = mood.motes * 0.55;
    }
    if (group.current) group.current.position.z = state.camera.position.z - 30;
  });

  return (
    <group ref={group}>
      <points geometry={geo} frustumCulled={false}>
        <shaderMaterial
          ref={matRef}
          vertexShader={glowVertex}
          fragmentShader={glowFragment}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

/**
 * Fireflies that wake at dusk and fill the forest at night. Brighter, slower,
 * and lower to the ground than the motes — the bloom pass makes them glow.
 */
export function Fireflies({ count = 110 }: { count?: number }) {
  const group = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const mood = useMood();

  const geo = useMemo(
    () =>
      makeGlowGeometry(count, { x: 20, yMin: GROUND_Y + 0.5, yMax: 7, z: 70 }),
    [count]
  );
  const uniforms = useMemo(
    () => makeGlowUniforms("#ffd27a", { size: 16, sway: 1.1, bob: 0.9 }),
    []
  );

  useFrame((state) => {
    const m = matRef.current;
    if (m) {
      m.uniforms.uTime.value = state.clock.elapsedTime;
      m.uniforms.uOpacity.value = mood.fireflies;
    }
    if (group.current) group.current.position.z = state.camera.position.z - 28;
  });

  return (
    <group ref={group}>
      <points geometry={geo} frustumCulled={false}>
        <shaderMaterial
          ref={matRef}
          vertexShader={glowVertex}
          fragmentShader={glowFragment}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}
