"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const ForestCanvas = dynamic(() => import("./forest/ForestCanvas"), {
  ssr: false,
});

/**
 * Fixed, full-viewport WebGL forest that lives behind all page content.
 * Pointer-events are disabled so the scene never intercepts clicks/scroll.
 */
export default function ForestBackground() {
  // ForestCanvas is client-only (ssr:false), so reading window here is safe and
  // never causes a hydration mismatch.
  const [quality] = useState<"high" | "low">(() =>
    typeof window !== "undefined" && window.innerWidth < 820 ? "low" : "high"
  );

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none"
      aria-hidden="true"
      style={{
        background:
          "radial-gradient(120% 90% at 50% 0%, #243b34 0%, #111c1a 45%, #070b09 100%)",
      }}
    >
      <ForestCanvas quality={quality} />
    </div>
  );
}
