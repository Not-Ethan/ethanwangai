// River and mist (spec §4.1). Ambient motion runs on uTime, which the driver freezes under reduced motion. Both are
// fogged through three's fog chunks (the material's fog flag makes three refresh fogColor, fogNear and fogFar).
import * as THREE from 'three';
import { PALETTE } from '@/valley/palette';
import { TERRAIN } from '@/valley/terrain';
import type { ValleyUniforms } from '../driverCore';

export const RIVER_Y = 0.2;
export const RIVER_WIDTH = 12;
export const RIVER_OPACITY = 0.85;
export const MIST_SPEED = 0.3;
export const MIST_ALPHA = 0.12;

export const RIVER_VERT = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
varying vec2 vWorld;
void main() {
  vec4 world = modelMatrix * vec4( position, 1.0 );
  vWorld = world.xz;
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

export const RIVER_FRAG = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform float uTime;
uniform vec3 uRiverColor;
uniform vec3 uHorizon;
uniform float uOpacity;
varying vec2 vWorld;
float rvHash( vec2 p ) {
  p = fract( p * vec2( 123.34, 456.21 ) );
  p += dot( p, p + 45.32 );
  return fract( p.x * p.y );
}
float rvNoise( vec2 p ) {
  vec2 i = floor( p );
  vec2 f = fract( p );
  vec2 s = f * f * ( 3.0 - 2.0 * f );
  float a = rvHash( i );
  float b = rvHash( i + vec2( 1.0, 0.0 ) );
  float c = rvHash( i + vec2( 0.0, 1.0 ) );
  float d = rvHash( i + vec2( 1.0, 1.0 ) );
  return mix( mix( a, b, s.x ), mix( c, d, s.x ), s.y );
}
void main() {
  vec2 p = vWorld * vec2( 0.08, 0.35 );
  float n = 0.6 * rvNoise( p - vec2( uTime * 0.12, 0.0 ) ) + 0.4 * rvNoise( p * 2.3 - vec2( uTime * 0.27, 0.0 ) );
  float edge = smoothstep( 6.0, 4.5, abs( vWorld.y ) );
  vec3 col = mix( uRiverColor, uHorizon, 0.35 + 0.25 * n );
  col *= 0.75 + 0.35 * n;
  gl_FragColor = vec4( col, uOpacity * ( 0.6 + 0.4 * edge ) );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

export const MIST_VERT = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
attribute vec4 aSeed;
uniform float uTime;
uniform float uSpeed;
uniform float uSpan;
varying vec2 vUv;
void main() {
  vUv = uv;
  float x = mod( aSeed.x + uSpan * 0.5 + uSpeed * uTime, uSpan ) - uSpan * 0.5;
  vec4 mvPosition = modelViewMatrix * vec4( x, aSeed.y, aSeed.z, 1.0 );
  mvPosition.xy += position.xy * aSeed.w;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

export const MIST_FRAG = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform vec3 uColor;
uniform float uAlpha;
varying vec2 vUv;
void main() {
  float r = length( vUv - 0.5 ) * 2.0;
  float a = uAlpha * ( 1.0 - smoothstep( 0.2, 1.0, r ) );
  if ( a <= 0.0 ) discard;
  gl_FragColor = vec4( uColor, a );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

export function createRiverMaterial(u: Pick<ValleyUniforms, 'uTime' | 'uHorizon'>): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: RIVER_VERT,
    fragmentShader: RIVER_FRAG,
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uTime: u.uTime,
      uHorizon: u.uHorizon,
      uRiverColor: { value: new THREE.Color(PALETTE.river) },
      uOpacity: { value: RIVER_OPACITY },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    fog: true,
  });
}

export function createMistMaterial(u: Pick<ValleyUniforms, 'uTime'>): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: MIST_VERT,
    fragmentShader: MIST_FRAG,
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uTime: u.uTime,
      uSpeed: { value: MIST_SPEED },
      uSpan: { value: TERRAIN.width },
      uColor: { value: new THREE.Color(PALETTE.mist) },
      uAlpha: { value: MIST_ALPHA },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    fog: true,
  });
}
