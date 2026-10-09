'use client';
// The one useFrame (spec §6 Driver, §8). Reads the scroll ref, runs applyFrame, copies uniforms onto fog and lights,
// composes the camera, and projects every emitter into PROJECTED for the DOM labels. Nothing else in the GL tree
// reads scroll. Allocation-free per frame at rest.
import type { RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type * as THREE from 'three';
import { useScroll } from '@/scroll/ScrollProvider';
import { applyFrame, setFrameInputs, syncScene, type SceneRefs } from './driverCore';
import { composeCamera, type Rig } from './cameraCore';
import { EMITTER_POSITIONS, projectEmitters } from './projection';
import { frame } from './frame';

export function Driver({ refs, rig, t0 }: { refs: SceneRefs; rig: Rig; t0: RefObject<number | null> }) {
  const { state, reducedMotion } = useScroll();
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;

  useFrame((_, delta) => {
    const { inputs, targets } = frame;
    const u = targets.uniforms;
    const s = state.current;
    const t = performance.now() / 1000;
    const start = t0.current;
    setFrameInputs(inputs, s.g, s.ranges, t, delta, start === null ? null : t - start, reducedMotion, rig.portrait);
    applyFrame(inputs, targets);
    syncScene(refs, u, targets.lit);
    composeCamera(rig, u.uYaw.value, u.uPitch.value, u.uFovScale.value, inputs.dt, camera);
    camera.updateMatrixWorld();
    projectEmitters(camera, EMITTER_POSITIONS, targets.projected);
  });

  return null;
}
