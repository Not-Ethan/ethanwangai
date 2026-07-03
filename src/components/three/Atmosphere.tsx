"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import {
  createSampledSky,
  dawnFactor,
  dayFactor,
  mulberry32,
  nightFactor,
  sampleSky,
} from "@/lib/journey";
import { useWorld } from "./ForestCanvas";
import { heightAt, pathDistance } from "./forestGen";
import { makeGlowTexture } from "./textures";

const particleVertex = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uAmp;
  uniform float uSize;
  uniform float uPixelRatio;
  varying float vTw;
  void main() {
    vec3 p = position;
    p.x += sin(uTime * (0.3 + fract(aSeed) * 0.4) + aSeed * 10.0) * uAmp;
    p.y += sin(uTime * (0.2 + fract(aSeed * 1.7) * 0.35) + aSeed * 23.0) * uAmp * 0.55;
    p.z += cos(uTime * (0.25 + fract(aSeed * 2.3) * 0.4) + aSeed * 17.0) * uAmp;
    vTw = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * (1.1 + fract(aSeed * 3.1)) + aSeed * 31.0));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * uPixelRatio * (26.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const particleFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vTw;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.05, d) * vTw * uOpacity;
    if (a < 0.004) discard;
    gl_FragColor = vec4(uColor, a);
  }
`;

interface ParticleCloudProps {
  count: number;
  seed: number;
  color: string;
  size: number;
  amp: number;
  zMin: number;
  zMax: number;
  maxPathDist: number;
  yMin: number;
  yMax: number;
  /** Returns opacity for the current journey progress. */
  opacityFor: (p: number) => number;
}

function ParticleCloud({
  count,
  seed,
  color,
  size,
  amp,
  zMin,
  zMax,
  maxPathDist,
  yMin,
  yMax,
  opacityFor,
}: ParticleCloudProps) {
  const { frame, reducedMotion } = useWorld();
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmp: { value: amp },
      uSize: { value: size },
      uPixelRatio: { value: 1 },
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: 0 },
    }),
    [amp, size, color]
  );

  const geometry = useMemo(() => {
    const rand = mulberry32(seed);
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    let placed = 0;
    let guard = 0;
    while (placed < count && guard < count * 60) {
      guard++;
      const x = (rand() - 0.5) * 90;
      const z = zMin + rand() * (zMax - zMin);
      if (pathDistance(x, z) > maxPathDist) continue;
      positions[placed * 3] = x;
      positions[placed * 3 + 1] = heightAt(x, z) + yMin + rand() * (yMax - yMin);
      positions[placed * 3 + 2] = z;
      seeds[placed] = rand() * 100;
      placed++;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions.slice(0, placed * 3), 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds.slice(0, placed), 1));
    return geo;
  }, [count, seed, zMin, zMax, maxPathDist, yMin, yMax]);

  useFrame(({ gl, clock }) => {
    const mat = matRef.current;
    if (!mat) return;
    if (!reducedMotion) mat.uniforms.uTime.value = clock.elapsedTime;
    mat.uniforms.uPixelRatio.value = gl.getPixelRatio();
    mat.uniforms.uOpacity.value = opacityFor(frame.current.p);
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={matRef}
        vertexShader={particleVertex}
        fragmentShader={particleFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

const MIST_PLACEMENTS = [
  { x: -6, z: 36, w: 54, h: 10, o: 0.18 },
  { x: 8, z: 12, w: 48, h: 9, o: 0.13 },
  { x: -14, z: -16, w: 56, h: 10, o: 0.15 },
  { x: 4, z: -44, w: 50, h: 9, o: 0.15 },
];

function Mist() {
  const { frame, low, reducedMotion } = useWorld();
  const texture = useMemo(() => makeGlowTexture(0.12), []);
  const skyRef = useRef(createSampledSky());
  const sprites = useRef<(THREE.Sprite | null)[]>([]);
  const placements = low ? MIST_PLACEMENTS.filter((_, i) => i % 2 === 0) : MIST_PLACEMENTS;
  const mistColor = useRef(new THREE.Color());
  const white = useRef(new THREE.Color("#ffffff"));

  useFrame(({ clock }) => {
    const p = frame.current.p;
    const sky = skyRef.current;
    sampleSky(p, sky);
    const strength = 0.35 + dawnFactor(p) * 0.65 + nightFactor(p) * 0.3;
    mistColor.current.copy(sky.fog).lerp(white.current, 0.4);
    sprites.current.forEach((sprite, i) => {
      if (!sprite) return;
      const drift = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.05 + i * 2.1) * 5;
      sprite.position.x = placements[i].x + drift;
      const mat = sprite.material;
      mat.opacity = placements[i].o * strength;
      mat.color.copy(mistColor.current);
      sprite.visible = mat.opacity > 0.012;
    });
  });

  return (
    <>
      {placements.map((m, i) => (
        <sprite
          key={i}
          ref={(s) => {
            sprites.current[i] = s;
          }}
          position={[m.x, heightAt(m.x, m.z) + 1.6, m.z]}
          scale={[m.w, m.h, 1]}
        >
          <spriteMaterial map={texture} transparent opacity={0} depthWrite={false} fog={false} />
        </sprite>
      ))}
    </>
  );
}

function GodRays() {
  const { frame } = useWorld();
  const mats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const dawn = dawnFactor(frame.current.p);
    if (groupRef.current) groupRef.current.visible = dawn > 0.02;
    mats.current.forEach((m, i) => {
      if (m) m.opacity = dawn * (i % 2 === 0 ? 0.03 : 0.018);
    });
  });

  const rays = [
    { x: -7, z: 30, s: 1.2 },
    { x: -1, z: 34, s: 1.5 },
    { x: 6, z: 27, s: 1.0 },
    { x: 11, z: 36, s: 1.3 },
  ];

  return (
    <group ref={groupRef}>
      {rays.map((r, i) => (
        <mesh
          key={i}
          position={[r.x, 9, r.z]}
          rotation={[0.1, 0, -0.34]}
          scale={[r.s, 1, r.s]}
        >
          <coneGeometry args={[3.4, 22, 8, 1, true]} />
          <meshBasicMaterial
            ref={(m) => {
              mats.current[i] = m;
            }}
            color="#ffdba8"
            transparent
            opacity={0}
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            fog={false}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function Atmosphere() {
  const { low } = useWorld();

  return (
    <group>
      <Mist />
      <GodRays />
      {/* fireflies — amber swarm through the dusk grove */}
      <ParticleCloud
        count={low ? 55 : 120}
        seed={606}
        color="#ffc76b"
        size={10}
        amp={1.5}
        zMin={-58}
        zMax={-16}
        maxPathDist={16}
        yMin={0.4}
        yMax={2.6}
        opacityFor={(p) => nightFactor(p) * 0.9 + Math.max(0, nightFactor(p + 0.12) - nightFactor(p)) * 0.4}
      />
      {/* teal wisps around the mushroom grove */}
      <ParticleCloud
        count={low ? 24 : 48}
        seed={909}
        color="#7dffd8"
        size={7}
        amp={1.1}
        zMin={-56}
        zMax={-32}
        maxPathDist={10}
        yMin={0.2}
        yMax={1.4}
        opacityFor={(p) => nightFactor(p) * 0.75}
      />
      {/* pollen + dust drifting over the morning meadow */}
      <ParticleCloud
        count={low ? 30 : 70}
        seed={303}
        color="#ffeccb"
        size={5}
        amp={0.8}
        zMin={2}
        zMax={32}
        maxPathDist={16}
        yMin={0.5}
        yMax={4}
        opacityFor={(p) => dayFactor(p) * 0.65 + dawnFactor(p) * 0.25}
      />
    </group>
  );
}
