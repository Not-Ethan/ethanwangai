"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { createSampledSky, mulberry32, nightFactor, sampleSky } from "@/lib/journey";
import { useWorld } from "./ForestCanvas";
import { makeGlowTexture } from "./textures";

const DOME_RADIUS = 310;

const skyVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFragment = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uMid;
  uniform vec3 uHorizon;
  uniform vec3 uFog;
  varying vec3 vDir;
  void main() {
    float h = vDir.y;
    vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.24, max(h, 0.0)));
    col = mix(col, uTop, smoothstep(0.2, 0.64, max(h, 0.0)));
    col = mix(uFog, col, smoothstep(-0.1, 0.03, h));
    gl_FragColor = vec4(col, 1.0);
  }
`;

const starsVertex = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  uniform float uTime;
  uniform float uPixelRatio;
  varying float vAlpha;
  varying float vWarm;
  void main() {
    vAlpha = 0.45 + 0.55 * sin(uTime * (0.35 + fract(aPhase) * 1.4) + aPhase * 7.0);
    vWarm = fract(aPhase * 3.7);
    gl_PointSize = aSize * uPixelRatio;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const starsFragment = /* glsl */ `
  uniform float uOpacity;
  varying float vAlpha;
  varying float vWarm;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.08, d) * vAlpha * uOpacity;
    if (a < 0.003) discard;
    vec3 col = mix(vec3(0.78, 0.85, 1.0), vec3(1.0, 0.93, 0.8), vWarm);
    gl_FragColor = vec4(col, a);
  }
`;

function celestialDir(y: number, phi: number, out: THREE.Vector3): THREE.Vector3 {
  const clampedY = THREE.MathUtils.clamp(y, -0.95, 0.95);
  const horiz = Math.sqrt(1 - clampedY * clampedY);
  return out.set(Math.sin(phi) * horiz, clampedY, -Math.cos(phi) * horiz);
}

const sunDir = new THREE.Vector3();
const moonDir = new THREE.Vector3();
const lightDir = new THREE.Vector3();

export default function Sky() {
  const { frame, low } = useWorld();
  const camera = useThree((s) => s.camera);
  const skyRef = useRef(createSampledSky());

  const domeMatRef = useRef<THREE.ShaderMaterial>(null);
  const starsMatRef = useRef<THREE.ShaderMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);
  const fogRef = useRef<THREE.FogExp2>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const dirRef = useRef<THREE.DirectionalLight>(null);
  const dirTargetRef = useRef<THREE.Object3D>(null);
  const sunRef = useRef<THREE.Sprite>(null);
  const moonRef = useRef<THREE.Sprite>(null);
  const moonHaloRef = useRef<THREE.Sprite>(null);

  const softGlow = useMemo(() => makeGlowTexture(0.18), []);
  const crispGlow = useMemo(() => makeGlowTexture(0.55), []);

  const domeUniforms = useMemo(
    () => ({
      uTop: { value: new THREE.Color("#20284e") },
      uMid: { value: new THREE.Color("#6e5377") },
      uHorizon: { value: new THREE.Color("#f2a65e") },
      uFog: { value: new THREE.Color("#a98087") },
    }),
    []
  );

  const starsUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uPixelRatio: { value: 1 },
    }),
    []
  );

  const starsGeometry = useMemo(() => {
    const count = low ? 350 : 750;
    const rand = mulberry32(2026);
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Uniform-ish over the upper dome, biased away from the horizon.
      const theta = rand() * Math.PI * 2;
      const y = 0.06 + Math.pow(rand(), 0.7) * 0.9;
      const horiz = Math.sqrt(1 - y * y);
      const r = DOME_RADIUS * 0.94;
      positions[i * 3] = Math.cos(theta) * horiz * r;
      positions[i * 3 + 1] = y * r;
      positions[i * 3 + 2] = Math.sin(theta) * horiz * r;
      sizes[i] = 1 + rand() * 2.4;
      phases[i] = rand() * 100;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
    return geo;
  }, [low]);

  useFrame(({ gl, clock }) => {
    const t = frame.current.p;
    const sky = skyRef.current;
    sampleSky(t, sky);
    const night = nightFactor(t);

    const dome = domeMatRef.current;
    if (dome) {
      dome.uniforms.uTop.value.copy(sky.top);
      dome.uniforms.uMid.value.copy(sky.mid);
      dome.uniforms.uHorizon.value.copy(sky.horizon);
      dome.uniforms.uFog.value.copy(sky.fog);
    }

    if (fogRef.current) {
      fogRef.current.color.copy(sky.fog);
      fogRef.current.density = sky.fogDensity;
    }
    if (hemiRef.current) {
      hemiRef.current.color.copy(sky.hemiSky);
      hemiRef.current.groundColor.copy(sky.hemiGround);
      hemiRef.current.intensity = sky.hemiIntensity;
    }
    if (ambientRef.current) ambientRef.current.intensity = sky.ambient;

    // Sun arcs across the sky and sets; the moon rises for the last act.
    const sunY = Math.sin(0.14 + t * Math.PI * 1.12) * 0.92;
    celestialDir(sunY, -0.42, sunDir);
    const moonY = Math.sin(Math.max(0, t - 0.66) * 3.4) * 0.72;
    celestialDir(moonY, 0.55, moonDir);

    const group = groupRef.current;
    if (group) {
      group.position.set(camera.position.x, 0, camera.position.z);
    }

    const sunVisible = THREE.MathUtils.smoothstep(sunY, -0.06, 0.06) * (1 - night);
    if (sunRef.current) {
      sunRef.current.position.copy(sunDir).multiplyScalar(DOME_RADIUS * 0.9);
      sunRef.current.material.color.copy(sky.sun);
      sunRef.current.material.opacity = sunVisible * 0.95;
      const s = 55 + (1 - Math.max(sunY, 0)) * 40; // bigger near the horizon
      sunRef.current.scale.setScalar(s);
    }

    const moonVisible = THREE.MathUtils.smoothstep(t, 0.7, 0.84);
    if (moonRef.current) {
      moonRef.current.position.copy(moonDir).multiplyScalar(DOME_RADIUS * 0.88);
      moonRef.current.material.opacity = moonVisible * 0.95;
      moonRef.current.scale.setScalar(16);
    }
    if (moonHaloRef.current) {
      moonHaloRef.current.position.copy(moonDir).multiplyScalar(DOME_RADIUS * 0.88);
      moonHaloRef.current.material.opacity = moonVisible * 0.2;
      moonHaloRef.current.scale.setScalar(42);
    }

    if (dirRef.current && dirTargetRef.current) {
      if (dirRef.current.target !== dirTargetRef.current) {
        dirRef.current.target = dirTargetRef.current;
      }
      lightDir.copy(sunDir).lerp(moonDir, night).normalize();
      dirRef.current.position.copy(lightDir).multiplyScalar(70);
      dirRef.current.position.y += camera.position.y;
      dirRef.current.color.copy(sky.sun);
      dirRef.current.intensity = sky.sunIntensity;
      dirTargetRef.current.position.set(0, camera.position.y, 0);
    }

    const stars = starsMatRef.current;
    if (stars) {
      stars.uniforms.uTime.value = clock.elapsedTime;
      stars.uniforms.uOpacity.value = THREE.MathUtils.smoothstep(t, 0.62, 0.88);
      stars.uniforms.uPixelRatio.value = gl.getPixelRatio();
    }
  });

  return (
    <>
      <fogExp2 ref={fogRef} attach="fog" args={["#a98087", 0.02]} />
      <ambientLight ref={ambientRef} intensity={0.25} />
      <hemisphereLight ref={hemiRef} intensity={0.6} />

      <group ref={groupRef}>
        <mesh renderOrder={-10} frustumCulled={false}>
          <sphereGeometry args={[DOME_RADIUS, 32, 18]} />
          <shaderMaterial
            ref={domeMatRef}
            vertexShader={skyVertex}
            fragmentShader={skyFragment}
            uniforms={domeUniforms}
            side={THREE.BackSide}
            depthWrite={false}
          />
        </mesh>

        <sprite ref={sunRef} renderOrder={-9}>
          <spriteMaterial
            map={softGlow}
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            fog={false}
          />
        </sprite>

        <sprite ref={moonHaloRef} renderOrder={-9}>
          <spriteMaterial
            map={softGlow}
            color="#bcd4ee"
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            fog={false}
          />
        </sprite>
        <sprite ref={moonRef} renderOrder={-8}>
          <spriteMaterial
            map={crispGlow}
            color="#e8f0fa"
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            fog={false}
          />
        </sprite>

        <points renderOrder={-8} frustumCulled={false} geometry={starsGeometry}>
          <shaderMaterial
            ref={starsMatRef}
            vertexShader={starsVertex}
            fragmentShader={starsFragment}
            uniforms={starsUniforms}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </points>

        <directionalLight ref={dirRef} intensity={1.4} />
        <object3D ref={dirTargetRef} />
      </group>
    </>
  );
}
