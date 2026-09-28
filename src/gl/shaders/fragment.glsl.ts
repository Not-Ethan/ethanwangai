// Fragment-side pieces of the ink material. Each is spliced after the named three chunk by the material patch;
// they share main()'s scope, so colorFragment's wN, contact and inkMix are read by emissive and output.
// Below vA = 0.6 a part is flat unlit pencil; above it, ink with three-tone face shading and uHot emissive on events.

/** Palette uniforms, the key-light direction and the varyings the vertex side writes. */
export const FRAG_DECL = /* glsl */`
uniform vec3 uPaper;
uniform vec3 uInkTop;
uniform vec3 uInkKey;
uniform vec3 uInkShade;
uniform vec3 uPencil;
uniform vec3 uHot;
uniform vec3 uKeyDir;
varying float vA;
varying float vHot;
varying float vFlip;
varying float vJitter;
varying float vIsCap;
varying float vWorldY;
`;

/**
 * After `#include <color_fragment>`. three declares `normal` later, in normal_fragment_begin, so the world
 * normal comes from vNormal here (transformNormalByInverseViewMatrix is r185's name for inverseTransformDirection).
 */
export const FRAG_COLOR = /* glsl */`
vec3 wN = transformNormalByInverseViewMatrix(normalize(vNormal), viewMatrix);
float up = wN.y;
float key = dot(wN, uKeyDir);
vec3 tone = up > 0.5 ? uInkTop : (key > 0.25 ? uInkKey : uInkShade);
float inkMix = step(0.6, vA);
diffuseColor.rgb = mix(uPencil, tone, inkMix);
float contact = 1.0 - 0.22 * (1.0 - clamp(vWorldY / 0.5, 0.0, 1.0));
diffuseColor.rgb *= contact;
`;

/** After `#include <roughnessmap_fragment>`: ±0.08 per-instance roughness jitter. */
export const FRAG_ROUGHNESS = /* glsl */`
roughnessFactor = clamp(roughnessFactor + (vJitter - 0.5) * 0.16, 0.05, 1.0);
`;

/** After `#include <emissivemap_fragment>`: uHot at 0.6 on events, and on a flipped cap's underside once it faces up. */
export const FRAG_EMISSIVE = /* glsl */`
float capHot = vIsCap * step(0.5, vFlip) * step(0.3, wN.y);
totalEmissiveRadiance += uHot * 0.6 * max(vHot, capHot) * inkMix;
`;

/** After `#include <opaque_fragment>`: pencil is unlit, so it replaces the lit result below the ink threshold. */
export const FRAG_OUTPUT = /* glsl */`
gl_FragColor.rgb = mix(uPencil * contact, gl_FragColor.rgb, inkMix);
`;
