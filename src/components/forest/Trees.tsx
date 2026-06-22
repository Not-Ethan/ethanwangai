"use client";

import { useMemo, useRef, useLayoutEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeBufferGeometries } from "three-stdlib";
import { useMood } from "./MoodContext";

export const GROUND_Y = -2.6;
const FIELD = 130; // depth of the recycling forest band
const CORRIDOR = 5; // half-width of the clear path the camera walks down

type TreeData = {
  x: number;
  z: number;
  scale: number;
  rot: number;
  tone: number; // per-tree brightness variation
};

/** A stylised low-poly conifer: three stacked, tapering cones on a short trunk. */
function makeFoliageGeometry() {
  const cones: THREE.BufferGeometry[] = [];
  const tiers = [
    { r: 1.5, h: 2.4, y: 1.4 },
    { r: 1.15, h: 2.2, y: 2.7 },
    { r: 0.8, h: 1.9, y: 3.9 },
  ];
  for (const t of tiers) {
    const g = new THREE.ConeGeometry(t.r, t.h, 7);
    g.translate(0, t.y, 0);
    cones.push(g);
  }
  const merged = mergeBufferGeometries(cones, false)!;
  merged.computeVertexNormals();
  return merged;
}

function makeTrunkGeometry() {
  const g = new THREE.CylinderGeometry(0.16, 0.26, 1.2, 6);
  g.translate(0, 0.6, 0);
  return g;
}

export default function Trees({ count = 90 }: { count?: number }) {
  const foliageRef = useRef<THREE.InstancedMesh>(null);
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const mood = useMood();

  const foliageGeo = useMemo(makeFoliageGeometry, []);
  const trunkGeo = useMemo(makeTrunkGeometry, []);

  const trees = useMemo<TreeData[]>(() => {
    const arr: TreeData[] = [];
    for (let i = 0; i < count; i++) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const x = side * (CORRIDOR + Math.pow(Math.random(), 1.4) * 26);
      arr.push({
        x,
        z: -Math.random() * FIELD,
        scale: 0.7 + Math.random() * 1.2,
        rot: Math.random() * Math.PI * 2,
        tone: 0.7 + Math.random() * 0.5,
      });
    }
    return arr;
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Write a tree's transform into both instanced meshes for a given index.
  const writeInstance = (i: number, t: TreeData) => {
    dummy.position.set(t.x, GROUND_Y, t.z);
    dummy.rotation.set(0, t.rot, 0);
    dummy.scale.setScalar(t.scale);
    dummy.updateMatrix();
    foliageRef.current!.setMatrixAt(i, dummy.matrix);
    trunkRef.current!.setMatrixAt(i, dummy.matrix);
  };

  useLayoutEffect(() => {
    if (!foliageRef.current || !trunkRef.current) return;
    trees.forEach((t, i) => writeInstance(i, t));
    foliageRef.current.instanceMatrix.needsUpdate = true;
    trunkRef.current.instanceMatrix.needsUpdate = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trees]);

  useFrame((state) => {
    const cam = state.camera;
    let dirty = false;
    for (let i = 0; i < trees.length; i++) {
      const t = trees[i];
      // Recycle trees that fall behind the camera to the far end of the band.
      if (t.z > cam.position.z + 12) {
        t.z -= FIELD;
        const side = Math.random() < 0.5 ? -1 : 1;
        t.x = side * (CORRIDOR + Math.pow(Math.random(), 1.4) * 26);
        t.scale = 0.7 + Math.random() * 1.2;
        t.rot = Math.random() * Math.PI * 2;
        t.tone = 0.7 + Math.random() * 0.5;
        writeInstance(i, t);
        dirty = true;
      }
    }
    if (dirty && foliageRef.current && trunkRef.current) {
      foliageRef.current.instanceMatrix.needsUpdate = true;
      trunkRef.current.instanceMatrix.needsUpdate = true;
    }

    // Drift foliage tint with the time of day.
    const fol = foliageRef.current
      ?.material as THREE.MeshStandardMaterial | undefined;
    if (fol) fol.color.copy(mood.foliage);
  });

  return (
    <group>
      <instancedMesh
        ref={trunkRef}
        args={[trunkGeo, undefined, trees.length]}
        castShadow={false}
        frustumCulled={false}
      >
        <meshStandardMaterial color="#1c150f" roughness={1} flatShading />
      </instancedMesh>
      <instancedMesh
        ref={foliageRef}
        args={[foliageGeo, undefined, trees.length]}
        frustumCulled={false}
      >
        <meshStandardMaterial color="#2c5142" roughness={0.9} flatShading />
      </instancedMesh>
    </group>
  );
}
