"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { createSampledSky, nightFactor, sampleSky } from "@/lib/journey";
import { useWorld } from "./ForestCanvas";
import { LAKE } from "./forestGen";

const waterVertex = /* glsl */ `
  varying vec2 vUv;
  varying float vFogDepth;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const waterFragment = /* glsl */ `
  uniform vec3 uDeep;
  uniform vec3 uSky;
  uniform vec3 uSun;
  uniform float uTime;
  uniform float uGlitter;
  uniform vec3 fogColor;
  uniform float fogDensity;
  varying vec2 vUv;
  varying float vFogDepth;
  void main() {
    float r1 = sin(vUv.x * 90.0 + uTime * 0.8 + sin(vUv.y * 60.0 + uTime * 0.6));
    float r2 = sin(vUv.y * 74.0 - uTime * 1.05 + sin(vUv.x * 48.0 - uTime * 0.45));
    vec3 col = mix(uDeep, uSky, 0.4 + 0.07 * r1 * r2);
    float glit = pow(max(0.0, r1 * r2), 34.0) * uGlitter;
    col += uSun * glit;
    float fogFactor = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
    col = mix(col, fogColor, clamp(fogFactor, 0.0, 1.0));
    gl_FragColor = vec4(col, 1.0);
  }
`;

/** The lake on the golden-hour stretch — sky-mirror colors + sun glitter. */
export default function Water() {
  const { frame, reducedMotion } = useWorld();
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const skyRef = useRef(createSampledSky());

  const uniforms = useMemo(
    () => ({
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uDeep: { value: new THREE.Color("#0e2431") },
      uSky: { value: new THREE.Color("#8fb7d8") },
      uSun: { value: new THREE.Color("#ffb35c") },
      uTime: { value: 0 },
      uGlitter: { value: 0.6 },
    }),
    []
  );

  useFrame(({ clock }) => {
    const mat = matRef.current;
    if (!mat) return;
    const sky = skyRef.current;
    sampleSky(frame.current.p, sky);
    if (!reducedMotion) mat.uniforms.uTime.value = clock.elapsedTime;
    mat.uniforms.uSky.value.copy(sky.horizon).lerp(sky.mid, 0.45);
    mat.uniforms.uSun.value.copy(sky.sun);
    mat.uniforms.uGlitter.value =
      0.12 + sky.sunIntensity * 0.16 * (1 - nightFactor(frame.current.p) * 0.7);
  });

  return (
    <mesh
      position={[LAKE.x, LAKE.waterY, LAKE.z]}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={[LAKE.rx * 1.04, LAKE.rz * 1.04, 1]}
    >
      <circleGeometry args={[1, 40]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={waterVertex}
        fragmentShader={waterFragment}
        uniforms={uniforms}
        fog
      />
    </mesh>
  );
}
