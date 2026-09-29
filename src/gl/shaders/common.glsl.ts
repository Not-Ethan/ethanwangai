// Vertex-side declarations shared by every kind: attributes, uniforms, varyings and helpers.
// Spliced at `#include <common>` of three's vertex shader, so nothing here may redefine what that
// chunk already #defines (PI, PI2, EPSILON, saturate, ...). Names are the plan's; never rename.
export const COMMON_DECL = /* glsl */`
attribute vec3 aExplode;
attribute vec4 aMeta;      // birth, machine, kind, col
attribute vec4 aParam;
uniform float uCompile[8];
uniform float uMachineTime[8];
uniform float uRun[8];
uniform float uFillRate[8];
uniform float uTilt;
uniform float uTime;
uniform float uVel;
uniform float uMerge;
uniform float uLean;
uniform vec2 uHover;
uniform sampler2D uOU;
uniform vec4 uOUInfo;
uniform float uCellH;
uniform float uPitch;
uniform vec3 uTravelAxis;
uniform float uStretch;
uniform vec3 uBenchCenter;
uniform vec3 uBalancePivot;
uniform float uSlotPeriod;
uniform float uSlotPhase;
uniform vec3 uLock;
varying float vA;
varying float vHot;
varying float vFlip;
varying float vJitter;
varying float vIsCap;
varying float vWorldY;
#ifndef PI2
#define PI2 6.28318530718
#endif
float expoOut(float t) { return t >= 1.0 ? 1.0 : 1.0 - pow(2.0, -10.0 * t); }
float hash11(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash21(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
mat3 rotZ(float a) { float c = cos(a), s = sin(a); return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0); }
mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
/** OU texel for market col at machine time t (seconds). R mid 0..47, G bid off, B ask off, A steps since last fill (0 = fill now). */
vec4 ouFetch(float col, float t) {
  float s = t * uOUInfo.w;
  float sIdx = mod(floor(s), uOUInfo.y);
  vec2 uv = vec2((col + 0.5) / uOUInfo.x, (sIdx + 0.5) / uOUInfo.y);
  return texture2D(uOU, uv);
}
float assembleFactor(float birth, int m) {
  float ls = uLock.x + birth * uLock.y;
  return smoothstep(ls, ls + uLock.z, uCompile[m]);
}
`;
