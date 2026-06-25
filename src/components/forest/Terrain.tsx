"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { terrainHeight } from "./heightfield";
import { makeSoftCircleTexture } from "./textures";
import { useMood } from "./MoodContext";
import { GROUND_Y } from "./Trees";

const WHITE = new THREE.Color("#ffffff");


/** Faceted, low-poly rolling ground that the camera travels across. */
export function Terrain() {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const mood = useMood();

  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(600, 600, 90, 90);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, terrainHeight(x, z));
    }
    g.computeVertexNormals();
    return g;
  }, []);

  useFrame(() => {
    if (matRef.current) matRef.current.color.copy(mood.ground);
  });

  return (
    <mesh geometry={geo} position={[0, GROUND_Y, 0]} frustumCulled={false}>
      <meshStandardMaterial
        ref={matRef}
        color="#0d1512"
        roughness={1}
        flatShading
      />
    </mesh>
  );
}

/** Soft, camera-facing mist banks that drift low between the trunks. */
export function GroundMist({ count = 16 }: { count?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const mood = useMood();

  const tex = useMemo(() => makeSoftCircleTexture(256), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tint = useMemo(() => new THREE.Color(), []);

  const banks = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 48,
        z: -Math.random() * 90,
        y: GROUND_Y + 1.2 + Math.random() * 2.2,
        scale: 14 + Math.random() * 22,
        seed: Math.random() * 100,
        speed: 0.2 + Math.random() * 0.5,
      })),
    [count]
  );

  useFrame((state) => {
    const cam = state.camera;
    const t = state.clock.elapsedTime;
    const inst = ref.current;
    if (inst) {
      for (let i = 0; i < banks.length; i++) {
        const b = banks[i];
        // Recycle banks that fall behind the camera.
        if (b.z > cam.position.z + 14) {
          b.z -= 100;
          b.x = (Math.random() - 0.5) * 48;
        }
        const drift = Math.sin(t * b.speed * 0.4 + b.seed) * 3;
        dummy.position.set(b.x + drift, b.y, b.z);
        dummy.quaternion.copy(cam.quaternion); // billboard toward camera
        dummy.scale.set(b.scale * 1.6, b.scale, 1);
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
      }
      inst.instanceMatrix.needsUpdate = true;
    }
    if (matRef.current) {
      tint.copy(mood.fog).lerp(WHITE, 0.18);
      matRef.current.color.copy(tint);
      matRef.current.opacity = mood.mist * 0.32;
    }
  });

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, banks.length]}
      frustumCulled={false}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        ref={matRef}
        map={tex}
        transparent
        depthWrite={false}
        opacity={0}
        side={THREE.DoubleSide}
        fog={false}
      />
    </instancedMesh>
  );
}
