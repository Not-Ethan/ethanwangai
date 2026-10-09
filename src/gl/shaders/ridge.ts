// The ridge's point shader (spec §4.6), for Stage 3's Ridge.tsx: a point shows when aBirth <= uReveal, sized by aSize
// with perspective, sampling the shared glow sprite, additive, fading to black in fog like the glow sprites.
import { ADDITIVE_FOG } from './glow';

export const RIDGE_VERT = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
attribute float aBirth;
attribute float aSize;
uniform float uReveal;
uniform float uPixelScale;
varying float vShown;
void main() {
  vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
  vShown = step( aBirth, uReveal );
  gl_PointSize = vShown * aSize * uPixelScale / max( 1.0, -mvPosition.z );
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

export const RIDGE_FRAG = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform sampler2D uMap;
uniform vec3 uColor;
varying float vShown;
void main() {
  if ( vShown < 0.5 ) discard;
  float a = texture2D( uMap, gl_PointCoord ).a;
  gl_FragColor = vec4( uColor * a, 1.0 );
  #include <colorspace_fragment>
  ${ADDITIVE_FOG}
}
`;
