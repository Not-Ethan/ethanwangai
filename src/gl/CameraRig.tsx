'use client';
// Keeps the rig's mode and pointer current (spec §6 CameraRig). It never moves the camera itself: Driver.tsx calls
// composeCamera from the one useFrame. Portrait follows the canvas aspect (width < height), not the tier, so a
// small landscape laptop keeps the landscape camera (spec §11). Parallax: desktop, full motion, window listeners
// (the canvas wrapper has pointer-events: none and R3F pointer events are not used).
import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import type { Tier } from '@/valley/types';
import { normalizePointer, resetPointer, setRigMode, type Rig } from './cameraCore';
import { isPortrait } from './composition';

export function CameraRig({ rig, tier, reducedMotion }: { rig: Rig; tier: Tier; reducedMotion: boolean }) {
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const parallaxOn = tier === 'desktop' && !reducedMotion;

  useEffect(() => {
    setRigMode(rig, isPortrait(width, height), parallaxOn);
  }, [rig, width, height, parallaxOn]);

  useEffect(() => {
    if (!parallaxOn) return;
    const onMove = (e: PointerEvent) => {
      normalizePointer(e.clientX, e.clientY, window.innerWidth, window.innerHeight, rig.pointer);
    };
    const onLeave = () => resetPointer(rig);
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, [rig, parallaxOn]);

  return null;
}
