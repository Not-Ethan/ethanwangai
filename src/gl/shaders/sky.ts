// Sky, stars and moon (spec §4.1). Not emitters: normal blending, no tone mapping, so the palette keyframes the
// driver writes (uZenith, uHorizon, uEast) reach the screen as authored. The east stop sits toward +x.
import * as THREE from 'three';
import { PALETTE } from '@/valley/palette';
import type { ValleyUniforms } from '../driverCore';

export const SKY_RADIUS = 200;
export const MOON_DISTANCE = 170;
export const MOON_SIZE = 7;

export const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  // centred on the camera so the whole dome stays inside the far plane
  gl_Position = projectionMatrix * viewMatrix * vec4( position + cameraPosition, 1.0 );
}
`;

export const SKY_FRAG = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uEast;
varying vec3 vDir;
void main() {
  vec3 d = normalize( vDir );
  float h = clamp( d.y, -0.2, 1.0 );
  vec3 col = mix( uHorizon, uZenith, smoothstep( 0.0, 0.55, h ) );
  float east = smoothstep( -0.1, 0.9, d.x ) * ( 1.0 - smoothstep( 0.0, 0.35, h ) );
  col = mix( col, uEast, east * 0.85 );
  gl_FragColor = vec4( col, 1.0 );
  #include <colorspace_fragment>
}
`;

export const STARS_VERT = /* glsl */ `
attribute float aSize;
attribute float aPhase;
uniform float uTime;
uniform float uStarAlpha;
varying float vAlpha;
void main() {
  vAlpha = uStarAlpha * ( 0.7 + 0.3 * sin( uTime * 1.3 + aPhase ) );
  gl_PointSize = aSize;
  gl_Position = projectionMatrix * viewMatrix * vec4( position + cameraPosition, 1.0 );
}
`;

export const STARS_FRAG = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  if ( dot( c, c ) > 0.25 || vAlpha <= 0.0 ) discard;
  gl_FragColor = vec4( uColor, vAlpha );
  #include <colorspace_fragment>
}
`;

export const MOON_VERT = /* glsl */ `
uniform vec3 uMoonPos;
uniform float uMoonSize;
uniform float uMoonDistance;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec3 dir = length( uMoonPos ) > 0.0001 ? normalize( uMoonPos ) : vec3( 0.0, 1.0, 0.0 );
  vec4 mv = viewMatrix * vec4( dir * uMoonDistance + cameraPosition, 1.0 );
  mv.xy += position.xy * uMoonSize;
  gl_Position = projectionMatrix * mv;
}
`;

export const MOON_FRAG = /* glsl */ `
uniform vec3 uMoonColor;
uniform float uMoonAlpha;
varying vec2 vUv;
void main() {
  float r = length( vUv - 0.5 ) * 2.0;
  float a = uMoonAlpha * ( 1.0 - smoothstep( 0.86, 1.0, r ) );
  if ( a <= 0.0 ) discard;
  gl_FragColor = vec4( uMoonColor, a );
  #include <colorspace_fragment>
}
`;

export function createSkyMaterial(u: Pick<ValleyUniforms, 'uZenith' | 'uHorizon' | 'uEast'>): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    uniforms: { uZenith: u.uZenith, uHorizon: u.uHorizon, uEast: u.uEast },
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    toneMapped: false,
  });
}

export function createStarsMaterial(u: Pick<ValleyUniforms, 'uTime' | 'uStarAlpha'>): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: STARS_VERT,
    fragmentShader: STARS_FRAG,
    uniforms: { uTime: u.uTime, uStarAlpha: u.uStarAlpha, uColor: { value: new THREE.Color(PALETTE.ink) } },
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    fog: false,
    toneMapped: false,
  });
}

export function createMoonMaterial(u: Pick<ValleyUniforms, 'uMoonPos' | 'uMoonAlpha'>): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: MOON_VERT,
    fragmentShader: MOON_FRAG,
    uniforms: {
      uMoonPos: u.uMoonPos,
      uMoonAlpha: u.uMoonAlpha,
      uMoonSize: { value: MOON_SIZE },
      uMoonDistance: { value: MOON_DISTANCE },
      uMoonColor: { value: new THREE.Color(PALETTE.ink) },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    fog: false,
    toneMapped: false,
  });
}
