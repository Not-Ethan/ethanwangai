'use client';
// The only construction on the page (spec §5.5, §6): 18 timber bars around the visitor's house, each grown by its own
// aGrow (0..1) from buildStateAt's stagger. Mounted by VisitorHouse only while a build runs, so it is one extra draw
// for 4.4 s and none at rest. Not a shadow caster and not a light.
import { useEffect, useMemo } from 'react';
import { BoxGeometry, InstancedBufferAttribute, InstancedMesh, Matrix4, MeshLambertMaterial } from 'three';
import { HOUSE_ROOF, SCAFFOLD_BARS, SCAFFOLD_THICKNESS, scaffoldBars } from './houseGeometry';
import { visitorBridge, type GrowTarget } from './visitorBridge';

function createScaffold(): InstancedMesh {
  const cur = visitorBridge.current;
  const bars = cur ? scaffoldBars(cur.data.min, cur.data.max) : [];
  const geometry = new BoxGeometry(SCAFFOLD_THICKNESS, 1, SCAFFOLD_THICKNESS);
  geometry.translate(0, 0.5, 0);   // base at y = 0, so scaling y by aGrow grows the bar up from the ground
  geometry.setAttribute('aGrow', new InstancedBufferAttribute(new Float32Array(SCAFFOLD_BARS), 1));
  const material = new MeshLambertMaterial({ color: HOUSE_ROOF, flatShading: true });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aGrow;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.y *= aGrow;');
  };
  const mesh = new InstancedMesh(geometry, material, SCAFFOLD_BARS);
  const m = new Matrix4();
  bars.forEach((b, i) => mesh.setMatrixAt(i, m.makeScale(1, b.h, 1).setPosition(b.x, b.y, b.z)));
  mesh.count = bars.length;
  mesh.frustumCulled = false;
  return mesh;
}

function attachScaffold(mesh: InstancedMesh): () => void {
  visitorBridge.grow = mesh.geometry.getAttribute('aGrow') as unknown as GrowTarget;
  return () => {
    visitorBridge.grow = null;
    mesh.geometry.dispose();
    (mesh.material as MeshLambertMaterial).dispose();
    mesh.dispose();
  };
}

export function Scaffold() {
  const mesh = useMemo(() => createScaffold(), []);
  useEffect(() => attachScaffold(mesh), [mesh]);
  return <primitive object={mesh} />;
}
