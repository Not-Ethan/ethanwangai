'use client';
// Six InstancedMeshes, one per primitive, built once from a LayoutResult. instanceMatrix is filled from the rest
// poses at mount and never written again on the scroll path: every motion is the vertex shader's (design §5, §6).
// The only later write is the Stage 4 visitor upload into the reserve instances, through kitRefs.
import { useEffect, useMemo } from 'react';
import type {} from '@react-three/fiber';   // registers three's JSX elements (group, instancedMesh, primitive) with React's JSX types
import * as THREE from 'three';
import { PRIMITIVE_NAMES, type LayoutResult, type PrimitiveId } from '@/bench';
import { createInkMaterial } from '@/gl/material/inkMaterial';
import { createDepthMaterial } from '@/gl/material/depthMaterial';
import type { BenchUniforms } from '@/gl/material/uniforms';
import { createKitGeometries } from './kitGeometry';
import { buildKitAttributes, VISITOR_RESERVE_BY_PRIMITIVE } from './kitAttributes';
import { kitRefs } from './registry';

interface Kit { id: PrimitiveId; geometry: THREE.BufferGeometry; instanceMatrix: THREE.InstancedBufferAttribute; count: number }

/** A generous sphere over the whole bench: the meshes are never frustum culled, so this only needs to exist. */
const kitBoundingSphere = () => new THREE.Sphere(new THREE.Vector3(0, 0.5, 0), 20);

/** One kit per primitive: a cloned base geometry carrying the instanced attributes, and the static instanceMatrix. */
function buildKits(result: LayoutResult): Kit[] {
  const base = createKitGeometries();
  return PRIMITIVE_NAMES.map((name, i) => {
    const id = i as PrimitiveId;
    const a = buildKitAttributes(result.byPrimitive[id], VISITOR_RESERVE_BY_PRIMITIVE[name]);
    const geometry = base[id].clone();
    geometry.setAttribute('aExplode', new THREE.InstancedBufferAttribute(a.explode, 3));
    geometry.setAttribute('aMeta', new THREE.InstancedBufferAttribute(a.meta, 4));
    geometry.setAttribute('aParam', new THREE.InstancedBufferAttribute(a.param, 4));
    geometry.boundingSphere = kitBoundingSphere();
    const instanceMatrix = new THREE.InstancedBufferAttribute(a.matrices, 16);
    instanceMatrix.setUsage(THREE.StaticDrawUsage);
    return { id, geometry, instanceMatrix, count: a.count };
  });
}

export function Kits({ result, uniforms }: { result: LayoutResult; uniforms: BenchUniforms }) {
  const kits = useMemo(() => buildKits(result), [result]);
  const material = useMemo(() => createInkMaterial(uniforms), [uniforms]);
  const depth = useMemo(() => createDepthMaterial(uniforms), [uniforms]);
  useEffect(() => () => kits.forEach((k) => k.geometry.dispose()), [kits]);
  useEffect(() => () => { material.dispose(); depth.dispose(); }, [material, depth]);

  return (
    <group name="kits">
      {kits.map((k) => (
        <instancedMesh
          key={k.id}
          ref={(mesh) => { kitRefs[k.id] = mesh; }}
          args={[k.geometry, material, k.count]}
          frustumCulled={false}
          castShadow
          receiveShadow
          customDepthMaterial={depth}
        >
          <primitive object={k.instanceMatrix} attach="instanceMatrix" />
        </instancedMesh>
      ))}
    </group>
  );
}
