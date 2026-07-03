"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { nightFactor } from "@/lib/journey";
import { useWorld } from "./ForestCanvas";

const auroraVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const auroraFragment = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform float uSeed;
  varying vec2 vUv;

  float ridges(float x) {
    return sin(x) * 0.5 + sin(x * 2.13 + 1.7) * 0.3 + sin(x * 0.47 + 4.2) * 0.2;
  }

  void main() {
    float x = vUv.x * 12.6 + uSeed;
    float wave = ridges(x * 0.5 + uTime * 0.22) * 0.2;
    float y = vUv.y + wave;
    // Curtain: bright lower edge fading upward.
    float band = smoothstep(0.02, 0.22, y) * smoothstep(1.0, 0.35, y);
    float rays = 0.55 + 0.45 * sin(x * 4.0 - uTime * 1.1 + ridges(x * 1.7) * 2.6);
    float edgeFade = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
    float a = band * rays * edgeFade * uOpacity;
    if (a < 0.004) discard;
    vec3 col = mix(vec3(0.18, 0.95, 0.62), vec3(0.45, 0.4, 0.95), smoothstep(0.15, 0.85, y));
    gl_FragColor = vec4(col * a, a);
  }
`;

function Curtain({
  position,
  rotation,
  scale,
  seed,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  seed: number;
}) {
  const { frame, reducedMotion } = useWorld();
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uSeed: { value: seed },
    }),
    [seed]
  );

  useFrame(({ clock }) => {
    const mat = matRef.current;
    const mesh = meshRef.current;
    if (!mat || !mesh) return;
    const opacity = nightFactor(frame.current.p) * 0.55;
    mat.uniforms.uOpacity.value = opacity;
    if (!reducedMotion) mat.uniforms.uTime.value = clock.elapsedTime;
    mesh.visible = opacity > 0.01;
  });

  return (
    <mesh ref={meshRef} position={position} rotation={rotation} scale={scale} visible={false}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={auroraVertex}
        fragmentShader={auroraFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

/** Northern lights over the summit — the midnight finale. */
export default function Aurora() {
  return (
    <>
      <Curtain position={[-10, 64, -150]} rotation={[-0.12, 0, 0.04]} scale={[190, 52, 1]} seed={0} />
      <Curtain position={[-55, 76, -168]} rotation={[-0.16, 0.1, -0.06]} scale={[150, 42, 1]} seed={17} />
    </>
  );
}
