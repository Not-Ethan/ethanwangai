"use client";

import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";

export default function Effects() {
  return (
    // multisampling kept low — the default (8x) is a real frame-time cost
    <EffectComposer multisampling={2}>
      <Bloom mipmapBlur luminanceThreshold={0.72} intensity={0.5} radius={0.7} />
      <Vignette eskil={false} offset={0.22} darkness={0.62} />
    </EffectComposer>
  );
}
