"use client";

import {
  Component,
  createContext,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { Canvas } from "@react-three/fiber";
import { useJourneyScroll } from "@/components/scroll/SmoothScroll";
import CameraRig from "./CameraRig";
import Sky from "./Sky";
import Forest from "./Forest";
import Atmosphere from "./Atmosphere";
import Aurora from "./Aurora";
import Effects from "./Effects";

export interface FrameState {
  /** Damped journey progress, updated by CameraRig before anything else reads it. */
  p: number;
  /** Raw (undamped) progress. */
  raw: number;
}

interface WorldContextValue {
  frame: RefObject<FrameState>;
  low: boolean;
  reducedMotion: boolean;
}

const WorldContext = createContext<WorldContextValue | null>(null);

export function useWorld() {
  const ctx = useContext(WorldContext);
  if (!ctx) throw new Error("useWorld must be used inside ForestCanvas");
  return ctx;
}

function detectLowTier(): boolean {
  if (typeof window === "undefined") return true;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.innerWidth < 820;
  const weak = (navigator.hardwareConcurrency ?? 8) <= 4;
  return coarse || narrow || weak;
}

class CanvasErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    // The page body carries a gradient fallback; content stays usable.
    return this.state.failed ? null : this.props.children;
  }
}

export default function ForestCanvas() {
  const { progress, reducedMotion } = useJourneyScroll();
  const low = useMemo(() => detectLowTier(), []);
  const frame = useRef<FrameState>({ p: 0, raw: 0 });
  const world = useMemo(
    () => ({ frame, low, reducedMotion }),
    [frame, low, reducedMotion]
  );

  return (
    <div className="fixed inset-0 z-0" aria-hidden>
      <CanvasErrorBoundary>
        <Canvas
          dpr={low ? [1, 1.25] : [1, 1.6]}
          camera={{ fov: 55, near: 0.1, far: 420, position: [0, 3.4, 46] }}
          // On the high tier the EffectComposer renders offscreen, so MSAA
          // there comes from the composer, not the default framebuffer.
          gl={{ antialias: low, powerPreference: "high-performance" }}
          fallback={null}
        >
          <WorldContext.Provider value={world}>
            <CameraRig progress={progress} />
            <Sky />
            <Forest />
            <Atmosphere />
            <Aurora />
            {!low && <Effects />}
          </WorldContext.Provider>
        </Canvas>
      </CanvasErrorBoundary>
    </div>
  );
}
