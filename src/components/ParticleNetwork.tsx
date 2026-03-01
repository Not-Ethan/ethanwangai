"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const PARTICLE_COUNT = 120;
const CONNECTION_DISTANCE = 2.5;
const MOUSE_INFLUENCE_RADIUS = 3;

function Particles() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const mouse3D = useRef(new THREE.Vector3(0, 0, 0));
  const { viewport } = useThree();

  const particles = useMemo(() => {
    const positions: THREE.Vector3[] = [];
    const velocities: THREE.Vector3[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 4
        )
      );
      velocities.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.005,
          (Math.random() - 0.5) * 0.005,
          (Math.random() - 0.5) * 0.002
        )
      );
    }
    return { positions, velocities };
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const lineGeometry = useMemo(() => new THREE.BufferGeometry(), []);
  const maxLines = PARTICLE_COUNT * PARTICLE_COUNT;
  const linePositions = useMemo(() => new Float32Array(maxLines * 6), [maxLines]);
  const lineColors = useMemo(() => new Float32Array(maxLines * 6), [maxLines]);

  useFrame(({ pointer }) => {
    if (!meshRef.current) return;

    mouse3D.current.set(
      (pointer.x * viewport.width) / 2,
      (pointer.y * viewport.height) / 2,
      0
    );

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const pos = particles.positions[i];
      const vel = particles.velocities[i];

      const toMouse = mouse3D.current.clone().sub(pos);
      const dist = toMouse.length();
      if (dist < MOUSE_INFLUENCE_RADIUS) {
        const force = (1 - dist / MOUSE_INFLUENCE_RADIUS) * 0.0008;
        vel.add(toMouse.normalize().multiplyScalar(force));
      }

      vel.multiplyScalar(0.998);
      pos.add(vel);

      if (Math.abs(pos.x) > 6) vel.x *= -1;
      if (Math.abs(pos.y) > 5) vel.y *= -1;
      if (Math.abs(pos.z) > 3) vel.z *= -1;

      dummy.position.copy(pos);
      const scale = 0.03 + (dist < MOUSE_INFLUENCE_RADIUS ? (1 - dist / MOUSE_INFLUENCE_RADIUS) * 0.03 : 0);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;

    let lineIndex = 0;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      for (let j = i + 1; j < PARTICLE_COUNT; j++) {
        const d = particles.positions[i].distanceTo(particles.positions[j]);
        if (d < CONNECTION_DISTANCE) {
          const alpha = 1 - d / CONNECTION_DISTANCE;
          const idx = lineIndex * 6;
          linePositions[idx] = particles.positions[i].x;
          linePositions[idx + 1] = particles.positions[i].y;
          linePositions[idx + 2] = particles.positions[i].z;
          linePositions[idx + 3] = particles.positions[j].x;
          linePositions[idx + 4] = particles.positions[j].y;
          linePositions[idx + 5] = particles.positions[j].z;

          const color = [0.231, 0.51, 0.965];
          lineColors[idx] = color[0];
          lineColors[idx + 1] = color[1];
          lineColors[idx + 2] = color[2];
          lineColors[idx + 3] = color[0] * alpha;
          lineColors[idx + 4] = color[1] * alpha;
          lineColors[idx + 5] = color[2] * alpha;

          lineIndex++;
        }
      }
    }

    if (linesRef.current) {
      lineGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(linePositions.slice(0, lineIndex * 6), 3)
      );
      lineGeometry.setAttribute(
        "color",
        new THREE.BufferAttribute(lineColors.slice(0, lineIndex * 6), 3)
      );
      lineGeometry.attributes.position.needsUpdate = true;
      lineGeometry.attributes.color.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.8} />
      </instancedMesh>
      <lineSegments ref={linesRef} geometry={lineGeometry}>
        <lineBasicMaterial vertexColors transparent opacity={0.15} />
      </lineSegments>
    </>
  );
}

export default function ParticleNetwork() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 60 }}
      className="absolute inset-0"
      style={{ background: "transparent" }}
      gl={{ alpha: true, antialias: true }}
    >
      <Particles />
    </Canvas>
  );
}
