"use client";

/* eslint-disable react-hooks/immutability --
   `frame` is a shared mutable ref (per-frame rAF state) delivered via context;
   writes happen inside the R3F frame loop, never during React render. */

import { useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import type { MotionValue } from "framer-motion";
import { cameraCurve } from "@/lib/journey";
import { useWorld } from "./ForestCanvas";

const pos = new THREE.Vector3();
const ahead = new THREE.Vector3();
const tangent = new THREE.Vector3();
const right = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);

export default function CameraRig({ progress }: { progress: MotionValue<number> }) {
  const { frame, reducedMotion } = useWorld();
  const pointer = useThree((s) => s.pointer);
  const smoothPointer = useRef(new THREE.Vector2());

  // Priority -1: runs before every other useFrame so frame.p is fresh.
  useFrame(({ camera, clock }, delta) => {
    const target = THREE.MathUtils.clamp(progress.get(), 0, 1);
    frame.current.raw = target;

    // Exponential damping — buttery in both directions, frame-rate independent.
    const lambda = reducedMotion ? 30 : 3.4;
    frame.current.p = THREE.MathUtils.damp(frame.current.p, target, lambda, delta);
    const t = THREE.MathUtils.clamp(frame.current.p, 0, 1);

    cameraCurve.getPointAt(t, pos);
    cameraCurve.getTangentAt(t, tangent);

    // Look a little way down the trail; at the very end, along the tangent.
    const lookT = Math.min(t + 0.055, 1);
    if (lookT > t + 0.002) {
      cameraCurve.getPointAt(lookT, ahead);
    } else {
      ahead.copy(pos).addScaledVector(tangent, 12);
    }
    ahead.y += 0.4;

    if (!reducedMotion) {
      // Gentle walking bob + slow breathing drift.
      const time = clock.elapsedTime;
      pos.y += Math.sin(time * 0.6) * 0.06;
      pos.x += Math.sin(time * 0.23) * 0.12;

      // Pointer parallax, damped so it trails the cursor.
      smoothPointer.current.x = THREE.MathUtils.damp(smoothPointer.current.x, pointer.x, 2.4, delta);
      smoothPointer.current.y = THREE.MathUtils.damp(smoothPointer.current.y, pointer.y, 2.4, delta);
      right.crossVectors(tangent, up).normalize();
      pos.addScaledVector(right, smoothPointer.current.x * 0.7);
      ahead.addScaledVector(right, smoothPointer.current.x * 1.6);
      ahead.y += smoothPointer.current.y * 1.1;
    }

    camera.position.copy(pos);
    camera.lookAt(ahead);
  }, -1);

  return null;
}
