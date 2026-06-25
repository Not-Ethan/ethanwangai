"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { glowVertex, glowFragment, makeGlowUniforms } from "./glow";
import { makeTreelineTexture } from "./textures";
import { useMood } from "./MoodContext";
import { GROUND_Y } from "./Trees";

const skyVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vDir = normalize(wp.xyz - cameraPosition);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFragment = /* glsl */ `
  precision mediump float;
  uniform vec3 uHorizon;
  uniform vec3 uZenith;
  uniform vec3 uSunColor;
  uniform vec3 uSunDir;
  uniform float uSunGlow;
  varying vec3 vDir;

  void main() {
    vec3 dir = normalize(vDir);
    float h = dir.y;
    float t = smoothstep(-0.04, 0.6, h);
    vec3 col = mix(uHorizon, uZenith, t);

    // Atmospheric glow around the sun: a tight core and a wide halo.
    float d = max(dot(dir, normalize(uSunDir)), 0.0);
    float core = pow(d, 7.0);
    float halo = pow(d, 2.0) * 0.22;
    col += uSunColor * (core + halo) * uSunGlow;

    // Keep the band right at the horizon reading as the fog colour.
    col = mix(col, uHorizon, smoothstep(0.06, -0.2, h));

    gl_FragColor = vec4(col, 1.0);
  }
`;

/** Full gradient sky dome with an atmospheric halo around the sun/moon. */
export function Sky() {
  const mesh = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const mood = useMood();

  const uniforms = useMemo(
    () => ({
      uHorizon: { value: new THREE.Color("#1b2a2b") },
      uZenith: { value: new THREE.Color("#102634") },
      uSunColor: { value: new THREE.Color("#ffca7a") },
      uSunDir: { value: new THREE.Vector3(0, 0.4, -1) },
      uSunGlow: { value: 0.9 },
    }),
    []
  );

  useFrame((state) => {
    const cam = state.camera;
    if (mesh.current) mesh.current.position.copy(cam.position);
    const m = matRef.current;
    if (m) {
      m.uniforms.uHorizon.value.copy(mood.fog);
      m.uniforms.uZenith.value.copy(mood.skyZenith);
      m.uniforms.uSunColor.value.copy(mood.sun);
      m.uniforms.uSunDir.value.copy(mood.sunPos).normalize();
      m.uniforms.uSunGlow.value = mood.sunGlow;
    }
  });

  return (
    <mesh ref={mesh} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[300, 32, 16]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={skyVertex}
        fragmentShader={skyFragment}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
        depthTest={false}
        fog={false}
      />
    </mesh>
  );
}

/** A field of stars that fades in at night. Occluded by the trees. */
export function Stars({ count = 700 }: { count?: number }) {
  const group = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const mood = useMood();

  const geo = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const scales = new Float32Array(count);
    const v = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      // Upper hemisphere only, on a far shell.
      v.set(
        Math.random() * 2 - 1,
        Math.random() * 0.9 + 0.08,
        Math.random() * 2 - 1
      )
        .normalize()
        .multiplyScalar(270);
      positions[i * 3] = v.x;
      positions[i * 3 + 1] = v.y;
      positions[i * 3 + 2] = v.z;
      seeds[i] = Math.random();
      scales[i] = 0.4 + Math.random() * 1.3;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    g.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));
    return g;
  }, [count]);

  const uniforms = useMemo(
    () => makeGlowUniforms("#e6ecff", { size: 22, sway: 0, bob: 0 }),
    []
  );

  useFrame((state) => {
    if (group.current) group.current.position.copy(state.camera.position);
    const m = matRef.current;
    if (m) {
      m.uniforms.uTime.value = state.clock.elapsedTime;
      m.uniforms.uOpacity.value = mood.night;
    }
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

function Ridge({
  radius,
  seed,
  repeat,
  darkness,
  order,
}: {
  radius: number;
  seed: number;
  repeat: number;
  darkness: number;
  order: number;
}) {
  const group = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const mood = useMood();
  const tint = useMemo(() => new THREE.Color(), []);

  const tex = useMemo(() => {
    const t = makeTreelineTexture(seed);
    t.repeat.set(repeat, 1);
    return t;
  }, [seed, repeat]);

  useFrame((state) => {
    const cam = state.camera;
    if (group.current) {
      group.current.position.x = cam.position.x;
      group.current.position.z = cam.position.z;
    }
    if (matRef.current) {
      // Darker, atmospheric silhouettes that sit between the trees and the sky.
      tint.copy(mood.fog).multiplyScalar(darkness);
      matRef.current.color.copy(tint);
    }
  });

  return (
    <group ref={group} position={[0, GROUND_Y + 5, 0]}>
      <mesh renderOrder={order} frustumCulled={false}>
        <cylinderGeometry args={[radius, radius, 44, 96, 1, true]} />
        <meshBasicMaterial
          ref={matRef}
          map={tex}
          transparent
          depthWrite={false}
          side={THREE.BackSide}
          fog={false}
        />
      </mesh>
    </group>
  );
}

/** Two layered conifer ridgelines for atmospheric depth on the horizon. */
export function HorizonRidges() {
  return (
    <>
      <Ridge radius={178} seed={91} repeat={8} darkness={0.78} order={-8} />
      <Ridge radius={138} seed={47} repeat={6} darkness={0.42} order={-7} />
    </>
  );
}
