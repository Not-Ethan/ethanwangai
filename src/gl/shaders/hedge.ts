// Hedge lines (spec §4.4): segment k shows once uReveal · 24 passes k; the segment being drawn fades in. Pale, alpha
// 0.5, normal blending, fogged like the rest of the valley. Not an emitter.
export const HEDGE_VERT = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
attribute float aSegment;
varying float vSegment;
void main() {
  vSegment = aSegment;
  vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

export const HEDGE_FRAG = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform vec3 uColor;
uniform float uAlpha;
uniform float uReveal;
uniform float uSegments;
varying float vSegment;
void main() {
  float shown = clamp( uReveal * uSegments - vSegment, 0.0, 1.0 );
  if ( shown <= 0.0 ) discard;
  gl_FragColor = vec4( uColor, uAlpha * shown );
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;
