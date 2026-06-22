"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { scrollState, lerp } from "@/lib/scroll";
import { resolveMood, makeResolvedMood } from "./mood";
import { MoodContext } from "./MoodContext";
import Trees, { GROUND_Y } from "./Trees";
import { Motes, Fireflies } from "./Particles";
import { useMood } from "./MoodContext";

const TRAVEL = 95; // world units walked from top to bottom of the page

/**
 * Resolves the blended mood every frame and drives the global scene state:
 * fog, sky colour, and the cinematic camera that walks down the forest path.
 * Placed first so the shared mood object is fresh before anything reads it.
 */
function MoodDriver() {
  const mood = useMood();
  const { scene, camera } = useThree();
  const fog = useMemo(() => new THREE.FogExp2("#1b2a2b", 0.05), []);
  const bg = useMemo(() => new THREE.Color("#1b2a2b"), []);
  const look = useMemo(() => new THREE.Vector3(), []);

  // Attach exponential fog and a background colour once; both blend each frame.
  useLayoutEffect(() => {
    scene.fog = fog;
    scene.background = bg;
  }, [scene, fog, bg]);

  useFrame((state, delta) => {
    resolveMood(scrollState.progress, mood);

    fog.color.copy(mood.fog);
    fog.density = mood.fogDensity;
    bg.copy(mood.fog);

    // Smoothly damped, frame-rate independent camera move.
    const k = 1 - Math.pow(0.0015, delta);
    const t = state.clock.elapsedTime;
    const bob = Math.sin(t * 1.4) * 0.06;
    const targetZ = -scrollState.progress * TRAVEL;

    camera.position.x = lerp(camera.position.x, state.pointer.x * 1.5, k);
    camera.position.y = lerp(
      camera.position.y,
      0.9 + state.pointer.y * 0.6 + bob,
      k
    );
    camera.position.z = lerp(camera.position.z, targetZ + 6, k);

    look.set(
      state.pointer.x * 0.6,
      1.2,
      camera.position.z - 14
    );
    camera.lookAt(look);
  });

  return null;
}

/** Key light + fill, coloured by the time of day and anchored ahead of you. */
function Lights() {
  const mood = useMood();
  const dir = useRef<THREE.DirectionalLight>(null);
  const amb = useRef<THREE.AmbientLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    const cam = state.camera;
    if (dir.current) {
      dir.current.color.copy(mood.sun);
      dir.current.intensity = mood.sunIntensity;
      dir.current.position.set(
        cam.position.x + mood.sunPos.x,
        mood.sunPos.y,
        cam.position.z + mood.sunPos.z
      );
      target.position.set(cam.position.x, GROUND_Y, cam.position.z - 16);
      target.updateMatrixWorld();
    }
    if (amb.current) {
      amb.current.color.copy(mood.ambient);
      amb.current.intensity = mood.ambientIntensity;
    }
    if (hemi.current) {
      hemi.current.color.copy(mood.sun);
      hemi.current.groundColor.copy(mood.ground);
      hemi.current.intensity = 0.5;
    }
  });

  return (
    <>
      <ambientLight ref={amb} />
      <hemisphereLight ref={hemi} />
      <directionalLight ref={dir} target={target} />
      <primitive object={target} />
    </>
  );
}

/** The glowing sun/moon orb that hangs ahead — the main bloom source. */
function SunOrb() {
  const mood = useMood();
  const ref = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((state) => {
    const cam = state.camera;
    if (ref.current) {
      ref.current.position.set(
        cam.position.x + mood.sunPos.x,
        mood.sunPos.y,
        cam.position.z + mood.sunPos.z
      );
      ref.current.scale.setScalar(mood.sunSize);
    }
    if (mat.current) mat.current.color.copy(mood.sun);
  });

  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[1, 2]} />
      <meshBasicMaterial ref={mat} toneMapped={false} />
    </mesh>
  );
}

/** A large ground plane that follows you and fades into the fog. */
function Ground() {
  const mood = useMood();
  const ref = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state) => {
    if (ref.current) {
      ref.current.position.x = state.camera.position.x;
      ref.current.position.z = state.camera.position.z;
    }
    if (mat.current) mat.current.color.copy(mood.ground);
  });

  return (
    <mesh
      ref={ref}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, GROUND_Y, 0]}
    >
      <planeGeometry args={[400, 400, 1, 1]} />
      <meshStandardMaterial ref={mat} color="#0d1512" roughness={1} />
    </mesh>
  );
}

function Scene({ quality }: { quality: "high" | "low" }) {
  const mood = useMemo(() => makeResolvedMood(), []);
  const treeCount = quality === "high" ? 95 : 50;
  const moteCount = quality === "high" ? 280 : 130;
  const fireflyCount = quality === "high" ? 120 : 60;

  return (
    <MoodContext.Provider value={mood}>
      <MoodDriver />
      <Lights />
      <SunOrb />
      <Ground />
      <Trees count={treeCount} />
      <Motes count={moteCount} />
      <Fireflies count={fireflyCount} />
      <EffectComposer enableNormalPass={false} multisampling={0}>
        <Bloom
          intensity={0.95}
          luminanceThreshold={0.5}
          luminanceSmoothing={0.35}
          mipmapBlur
          radius={0.7}
        />
        <Vignette offset={0.25} darkness={0.82} eskil={false} />
      </EffectComposer>
    </MoodContext.Provider>
  );
}

export default function ForestCanvas({
  quality = "high",
}: {
  quality?: "high" | "low";
}) {
  return (
    <Canvas
      dpr={[1, 1.8]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ fov: 55, near: 0.1, far: 220, position: [0, 0.9, 6] }}
    >
      <Scene quality={quality} />
    </Canvas>
  );
}
