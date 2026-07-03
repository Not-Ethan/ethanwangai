"use client";

import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";

export default function Effects() {
  return (
    <EffectComposer>
      <Bloom mipmapBlur luminanceThreshold={0.75} intensity={0.55} radius={0.7} />
      <Vignette eskil={false} offset={0.22} darkness={0.62} />
    </EffectComposer>
  );
}
