// Rain (spec §6): both vertices of a drop wrap together; the bottom vertex trails by the streak length. uRain = 0
// collapses every vertex off screen. Not an emitter, no additive blending.
export const RAIN_VERT = /* glsl */ `
uniform float uTime;
uniform float uRain;
uniform float uSpeed;
uniform float uHeight;
uniform float uStreak;
attribute float aEnd;
void main() {
  if ( uRain < 0.001 ) {
    gl_Position = vec4( 2.0, 2.0, 2.0, 1.0 );
    return;
  }
  vec3 p = position;
  p.y = mod( p.y - uTime * uSpeed, uHeight ) - 0.5 * uHeight - aEnd * uStreak;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( p, 1.0 );
}
`;

export const RAIN_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uAlpha;
uniform float uRain;
void main() {
  gl_FragColor = vec4( uColor, uAlpha * uRain );
  #include <colorspace_fragment>
}
`;
