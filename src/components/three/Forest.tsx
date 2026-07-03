"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { nightFactor } from "@/lib/journey";
import { useWorld } from "./ForestCanvas";
import {
  buildTerrainGeometry,
  generateMushrooms,
  generateRocks,
  generateTrees,
  heightAt,
} from "./forestGen";

const dummy = new THREE.Object3D();
const tint = new THREE.Color();

/** Inject gentle per-tree wind sway into an instanced material.
 *  The compiled shader is stashed on `material.userData.shader` so the
 *  frame loop can drive its uTime uniform. */
function addWindSway(material: THREE.Material) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    material.userData.shader = shader;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;")
      .replace(
        "#include <project_vertex>",
        /* glsl */ `
        vec4 mvPosition = vec4( transformed, 1.0 );
        #ifdef USE_INSTANCING
          mvPosition = instanceMatrix * mvPosition;
        #endif
        float swayW = max(0.0, transformed.y - 1.0);
        mvPosition.x += sin(uTime * 1.3 + mvPosition.x * 0.5 + mvPosition.z * 0.35) * swayW * 0.035;
        mvPosition.z += cos(uTime * 0.9 + mvPosition.x * 0.3) * swayW * 0.022;
        mvPosition = modelViewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;
        `
      );
  };
}

function Trees({ count }: { count: number }) {
  const trees = useMemo(() => generateTrees(count), [count]);
  const foliageMeshRef = useRef<THREE.InstancedMesh>(null);

  const foliageGeometry = useMemo(() => {
    const cones = [
      new THREE.ConeGeometry(1.55, 2.8, 6).translate(0, 2.3, 0),
      new THREE.ConeGeometry(1.2, 2.3, 6).translate(0, 3.7, 0),
      new THREE.ConeGeometry(0.85, 1.9, 6).translate(0, 4.9, 0),
    ];
    const merged = mergeGeometries(cones)!;
    cones.forEach((c) => c.dispose());
    return merged;
  }, []);

  const foliageMaterial = useMemo(() => {
    const mat = new THREE.MeshLambertMaterial({ flatShading: true });
    addWindSway(mat);
    return mat;
  }, []);

  const setInstances = (foliage: THREE.InstancedMesh | null) => {
    if (!foliage) return;
    const pine = new THREE.Color("#2f5c41");
    const pineDark = new THREE.Color("#24462f");
    const larch = new THREE.Color("#c08a3e");
    trees.forEach((t, i) => {
      dummy.position.set(t.x, t.y, t.z);
      dummy.rotation.set(0, t.rot, 0);
      dummy.scale.setScalar(t.scale);
      dummy.updateMatrix();
      foliage.setMatrixAt(i, dummy.matrix);
      if (t.hue > 0.5) {
        tint.copy(larch).offsetHSL(0, 0, (t.hue - 0.75) * 0.2);
      } else {
        tint.copy(pineDark).lerp(pine, t.hue / 0.2);
      }
      foliage.setColorAt(i, tint);
    });
    foliage.instanceMatrix.needsUpdate = true;
    if (foliage.instanceColor) foliage.instanceColor.needsUpdate = true;
  };

  const setTrunks = (trunks: THREE.InstancedMesh | null) => {
    if (!trunks) return;
    trees.forEach((t, i) => {
      dummy.position.set(t.x, t.y, t.z);
      dummy.rotation.set(0, t.rot, 0);
      dummy.scale.setScalar(t.scale);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);
    });
    trunks.instanceMatrix.needsUpdate = true;
  };

  useFrame(({ clock }) => {
    const mat = foliageMeshRef.current?.material as THREE.Material | undefined;
    const shader = mat?.userData.shader;
    if (shader) shader.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <>
      <instancedMesh
        ref={(m: THREE.InstancedMesh | null) => {
          foliageMeshRef.current = m;
          setInstances(m);
        }}
        args={[foliageGeometry, foliageMaterial, trees.length]}
        frustumCulled={false}
      />
      <instancedMesh ref={setTrunks} args={[undefined, undefined, trees.length]} frustumCulled={false}>
        <cylinderGeometry args={[0.14, 0.22, 2.4, 5]} />
        <meshLambertMaterial color="#5e4a34" flatShading />
      </instancedMesh>
    </>
  );
}

function Rocks({ count }: { count: number }) {
  const rocks = useMemo(() => generateRocks(count), [count]);
  const setRocks = (mesh: THREE.InstancedMesh | null) => {
    if (!mesh) return;
    rocks.forEach((r, i) => {
      dummy.position.set(r.x, r.y, r.z);
      dummy.rotation.set(r.rot, r.rot * 1.7, 0);
      dummy.scale.set(r.scale, r.scale * 0.75, r.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  return (
    <instancedMesh ref={setRocks} args={[undefined, undefined, rocks.length]} frustumCulled={false}>
      <icosahedronGeometry args={[0.8, 0]} />
      <meshLambertMaterial color="#6d746b" flatShading />
    </instancedMesh>
  );
}

function Mushrooms({ count }: { count: number }) {
  const { frame } = useWorld();
  const shrooms = useMemo(() => generateMushrooms(count), [count]);
  const teal = useMemo(() => shrooms.filter((s) => !s.warm), [shrooms]);
  const warm = useMemo(() => shrooms.filter((s) => s.warm), [shrooms]);

  const tealMat = useRef<THREE.MeshLambertMaterial>(null);
  const warmMat = useRef<THREE.MeshLambertMaterial>(null);
  const lightA = useRef<THREE.PointLight>(null);
  const lightB = useRef<THREE.PointLight>(null);

  const place = (mesh: THREE.InstancedMesh | null, list: typeof shrooms) => {
    if (!mesh) return;
    list.forEach((s, i) => {
      dummy.position.set(s.x, s.y + 0.32 * s.scale, s.z);
      dummy.rotation.set(0, s.rot, 0);
      dummy.scale.setScalar(s.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };

  const placeStems = (mesh: THREE.InstancedMesh | null) => {
    if (!mesh) return;
    shrooms.forEach((s, i) => {
      dummy.position.set(s.x, s.y + 0.14 * s.scale, s.z);
      dummy.rotation.set(0, s.rot, 0);
      dummy.scale.setScalar(s.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };

  useFrame(({ clock }) => {
    const night = nightFactor(frame.current.p);
    const pulse = 0.85 + Math.sin(clock.elapsedTime * 1.8) * 0.15;
    if (tealMat.current) tealMat.current.emissiveIntensity = (0.15 + night * 1.7) * pulse;
    if (warmMat.current) warmMat.current.emissiveIntensity = (0.15 + night * 1.5) * pulse;
    if (lightA.current) lightA.current.intensity = night * 9 * pulse;
    if (lightB.current) lightB.current.intensity = night * 7 * pulse;
  });

  return (
    <group>
      <instancedMesh ref={placeStems} args={[undefined, undefined, shrooms.length]} frustumCulled={false}>
        <cylinderGeometry args={[0.06, 0.1, 0.3, 5]} />
        <meshLambertMaterial color="#d8cfb8" flatShading />
      </instancedMesh>
      <instancedMesh ref={(m) => place(m, teal)} args={[undefined, undefined, teal.length]} frustumCulled={false}>
        <coneGeometry args={[0.24, 0.26, 7]} />
        <meshLambertMaterial ref={tealMat} color="#3ea88f" emissive="#4fe3c0" emissiveIntensity={0.2} flatShading />
      </instancedMesh>
      <instancedMesh ref={(m) => place(m, warm)} args={[undefined, undefined, warm.length]} frustumCulled={false}>
        <coneGeometry args={[0.24, 0.26, 7]} />
        <meshLambertMaterial ref={warmMat} color="#c07b3a" emissive="#ffb45e" emissiveIntensity={0.2} flatShading />
      </instancedMesh>
      <pointLight ref={lightA} position={[-2.5, heightAt(-2.5, -36) + 1.4, -36]} color="#4fe3c0" distance={22} decay={1.8} intensity={0} />
      <pointLight ref={lightB} position={[3, heightAt(3, -46) + 1.6, -46]} color="#ffb45e" distance={24} decay={1.8} intensity={0} />
    </group>
  );
}

function Campfire() {
  const { frame } = useWorld();
  const x = 0;
  const z = -76;
  const y = useMemo(() => heightAt(x, z), [x, z]);
  const flameRef = useRef<THREE.Mesh>(null);
  const flameMat = useRef<THREE.MeshLambertMaterial>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  const stones = useMemo(() => {
    const ring: { x: number; z: number; s: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      ring.push({ x: Math.cos(a) * 0.9, z: Math.sin(a) * 0.9, s: 0.16 + (i % 3) * 0.05 });
    }
    return ring;
  }, []);

  useFrame(({ clock }) => {
    const night = nightFactor(frame.current.p);
    const t = clock.elapsedTime;
    const flicker = Math.sin(t * 9.3) * 0.35 + Math.sin(t * 23.7) * 0.2 + Math.sin(t * 3.1) * 0.45;
    if (lightRef.current) {
      lightRef.current.intensity = night * (11 + flicker * 3.5);
    }
    if (flameMat.current) {
      flameMat.current.emissiveIntensity = 0.3 + night * (2.4 + flicker * 0.6);
    }
    if (flameRef.current) {
      const s = 0.85 + flicker * 0.09;
      flameRef.current.scale.set(s, 1 + flicker * 0.16, s);
    }
  });

  return (
    <group position={[x, y, z]}>
      {/* crossed logs */}
      <mesh position={[0, 0.16, 0]} rotation={[0, 0.5, Math.PI / 2.2]}>
        <cylinderGeometry args={[0.09, 0.09, 1.3, 5]} />
        <meshLambertMaterial color="#4a3826" flatShading />
      </mesh>
      <mesh position={[0, 0.16, 0]} rotation={[0, 1.9, Math.PI / 2.4]}>
        <cylinderGeometry args={[0.09, 0.09, 1.3, 5]} />
        <meshLambertMaterial color="#54402b" flatShading />
      </mesh>
      <mesh position={[0, 0.16, 0]} rotation={[0, 3.4, Math.PI / 2.1]}>
        <cylinderGeometry args={[0.08, 0.08, 1.2, 5]} />
        <meshLambertMaterial color="#40311f" flatShading />
      </mesh>
      {/* flame */}
      <mesh ref={flameRef} position={[0, 0.55, 0]}>
        <coneGeometry args={[0.28, 0.9, 6]} />
        <meshLambertMaterial ref={flameMat} color="#ff9a3c" emissive="#ff7b2d" emissiveIntensity={0.3} flatShading />
      </mesh>
      {/* stone ring */}
      {stones.map((s, i) => (
        <mesh key={i} position={[s.x, 0.08, s.z]} rotation={[0.4 * i, i, 0]}>
          <icosahedronGeometry args={[s.s, 0]} />
          <meshLambertMaterial color="#66655e" flatShading />
        </mesh>
      ))}
      <pointLight ref={lightRef} position={[0, 1.1, 0]} color="#ff9548" distance={26} decay={1.9} intensity={0} />
    </group>
  );
}

export default function Forest() {
  const { low } = useWorld();
  const terrainGeometry = useMemo(() => buildTerrainGeometry(low ? 72 : 112), [low]);

  return (
    <group>
      <mesh geometry={terrainGeometry}>
        <meshLambertMaterial vertexColors flatShading />
      </mesh>
      <Trees count={low ? 140 : 380} />
      <Rocks count={low ? 26 : 60} />
      <Mushrooms count={low ? 16 : 26} />
      <Campfire />
    </group>
  );
}
