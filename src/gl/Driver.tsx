'use client';
// The one useFrame (spec §6 Driver, §8). Reads the scroll ref, runs applyFrame, copies uniforms onto fog and lights,
// composes the camera, and projects every emitter into PROJECTED for the DOM labels. Nothing else in the GL tree
// reads scroll. Allocation-free per frame at rest.
import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type * as THREE from 'three';
import { useScroll } from '@/scroll/ScrollProvider';
import { applyFrame, setFrameInputs, syncScene, type SceneRefs } from './driverCore';
import { composeCamera, type Rig } from './cameraCore';
import { EMITTER_POSITIONS, LABEL_ALPHA, projectEmitters } from './projection';
import { writeLabelAlpha } from './chain';
import { frame } from './frame';
import { LIVE } from './live';
import { wheelRef } from './wheelRef';
import { createPulseGate, inSection, stepPulseGate, type PulseGate } from './pulse';
import { createFlickerClock, isEmailTarget, stepFlicker, type FlickerClock } from './flicker';
import { introClock, markIntroPlayed, readIntroPlayed, sessionStore, shouldPlayIntro, stillParams } from './introGate';

export function Driver({ refs, rig, t0 }: { refs: SceneRefs; rig: Rig; t0: RefObject<number | null> }) {
  const { state, reducedMotion } = useScroll();
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;

  const still = useMemo(() => stillParams(typeof window === 'undefined' ? '' : window.location.search), []);
  const playIntro = useRef(false);
  const marked = useRef(false);
  useEffect(() => {
    if (still.still) markIntroPlayed(sessionStore);
    playIntro.current = shouldPlayIntro({ reducedMotion, introPlayed: readIntroPlayed(sessionStore), still });
  }, [reducedMotion, still]);

  const pulseGate = useRef<PulseGate>(createPulseGate());
  const flicker = useRef<FlickerClock>(createFlickerClock());
  useEffect(() => {
    const clock = flicker.current;
    const onEnter = (e: Event) => {
      if (isEmailTarget(e.target)) clock.pending = true;
    };
    window.addEventListener('pointerover', onEnter, { passive: true });
    window.addEventListener('focusin', onEnter);
    return () => {
      window.removeEventListener('pointerover', onEnter);
      window.removeEventListener('focusin', onEnter);
    };
  }, []);

  useFrame((_, delta) => {
    const { inputs, targets } = frame;
    const u = targets.uniforms;
    const s = state.current;
    const t = performance.now() / 1000;
    const start = t0.current;
    if (playIntro.current && start !== null && !marked.current) {
      marked.current = true;
      if (!still.still) markIntroPlayed(sessionStore);
    }
    const introT = introClock(playIntro.current, start, t, still.t);
    setFrameInputs(inputs, s.g, s.ranges, t, delta, introT, reducedMotion, rig.portrait);
    if (still.g !== null) inputs.g = still.g;
    inputs.pulseT = stepPulseGate(pulseGate.current, inSection(inputs.g, inputs.ranges, 'alive'), t);
    inputs.flickerT = stepFlicker(flicker.current, t);
    applyFrame(inputs, targets);
    writeLabelAlpha(inputs.introT, LABEL_ALPHA);
    LIVE.ridge = targets.latched.ridge;
    const wheel = wheelRef.current;
    if (wheel) wheel.rotation.z = -u.uWheelAngle.value;
    syncScene(refs, u, targets.lit);
    composeCamera(rig, u.uYaw.value, u.uPitch.value, u.uFovScale.value, inputs.dt, camera);
    camera.updateMatrixWorld();
    projectEmitters(camera, EMITTER_POSITIONS, targets.projected);
  });

  return null;
}
