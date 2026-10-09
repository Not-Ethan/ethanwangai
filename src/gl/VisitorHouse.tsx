'use client';
// The visitor's house on the lot (spec §4.7, §5.5, §6). One mesh whose geometry the bridge swaps when a new build
// starts; clipped from the ground up by one plane during the build (clipShadows so its shadow rises with it), drawn
// DoubleSide while open so the inside of the cut walls is not see-through, FrontSide at rest. The visitor point light
// is Stage 2's POINT_LIGHTS entry (driven by syncScene from lit[visitor]), so none is mounted here. The bridge (src/gl/visitorBridge.ts) owns all timing; this file only plugs in.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { BufferGeometry, DoubleSide, FrontSide, MeshLambertMaterial, Plane, Vector3, type Mesh, type WebGLRenderer } from 'three';
import { getVisitorSnapshot, onVisitorSentence } from '@/site/visitorSentence';
import { useTier } from './useTier';
import { toBufferGeometry, type HouseMeshData } from './houseGeometry';
import { buildPinFromSearch, visitorBridge } from './visitorBridge';
import { Scaffold } from './Scaffold';

function enableLocalClipping(gl: WebGLRenderer): void {
  gl.localClippingEnabled = true;
}

function attachVisitorHouse(
  mesh: Mesh, material: MeshLambertMaterial, plane: Plane, setBuilding: (on: boolean) => void,
): () => void {
  visitorBridge.plane = plane;
  visitorBridge.hooks = {
    swap(data: HouseMeshData | null) {
      const old = mesh.geometry;
      mesh.geometry = data ? toBufferGeometry(data) : new BufferGeometry();
      old.dispose();
    },
    setBuilding(on: boolean) {
      material.side = on ? DoubleSide : FrontSide;
      material.needsUpdate = true;
      setBuilding(on);
    },
  };
  return () => {
    visitorBridge.detach();
    mesh.geometry.dispose();
  };
}

/** Pinned (gate stills) > stored sentence > nothing; then every announced sentence becomes a build request. */
function feedVisitorBridge(): () => void {
  const pin = buildPinFromSearch(window.location.search);
  if (pin) {
    visitorBridge.pin(pin.sentence, pin.t);
    return () => {};
  }
  const stored = getVisitorSnapshot();
  if (stored) visitorBridge.restore(stored);
  return onVisitorSentence((s) => visitorBridge.request(s));
}

export function VisitorHouse() {
  const gl = useThree((s) => s.gl);
  const { shadows } = useTier();
  const mesh = useRef<Mesh>(null);
  const [building, setBuilding] = useState(false);
  const plane = useMemo(() => new Plane(new Vector3(0, -1, 0), -1e6), []);
  const material = useMemo(
    () => new MeshLambertMaterial({ vertexColors: true, flatShading: true, clippingPlanes: [plane], clipShadows: true, side: FrontSide }),
    [plane],
  );

  useEffect(() => enableLocalClipping(gl), [gl]);
  useEffect(() => {
    if (!mesh.current) return;
    return attachVisitorHouse(mesh.current, material, plane, setBuilding);
  }, [material, plane]);
  useEffect(() => feedVisitorBridge(), []);
  useEffect(() => () => material.dispose(), [material]);

  return (
    <group>
      <mesh ref={mesh} material={material} castShadow={shadows} receiveShadow={shadows} />
      {building && <Scaffold />}
    </group>
  );
}
