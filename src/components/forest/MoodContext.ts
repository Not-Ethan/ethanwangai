import { createContext, useContext } from "react";
import { makeResolvedMood, type ResolvedMood } from "./mood";

// A single mutable mood object, shared across the scene. The MoodDriver mutates
// it each frame; every other component reads from it inside its own useFrame.
// Passing one stable reference avoids React re-renders and per-frame allocations.
export const MoodContext = createContext<ResolvedMood>(makeResolvedMood());

export const useMood = () => useContext(MoodContext);
