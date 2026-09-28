// The ink points' vertex shader (design §7 Flight, Rows band): one program, stateless, GLSL3 for the sampler3D curl
// volume. A point's clock is its own: compile points fly over the 0.6 before their part's lock midpoint, the merge
// partition follows uBurst, the trickle loops on uTime once the quoter is built. Spawn is the point's uv inside its
// source rect (NDC); the target and its partition's centroid go through the real camera; flight blends the two in
// NDC along a bezier, pulled into a row-quantized band for t in [0.28, 0.62]. three declares projectionMatrix and
// modelViewMatrix (and the sampler3D precision) for a ShaderMaterial, so this file must not.
export const INK_VERTEX = /* glsl */`
precision highp float; precision highp sampler3D;
in vec3 aTarget; in float aTargetBirth; in float aSeed; in float aRow; in float aPartition; in float aTrickle; in vec2 aSpawnUV;
uniform vec4 uRect[8]; uniform vec3 uCentroid[8]; uniform float uCompile[8]; uniform float uTime; uniform float uVel;
uniform float uBurst; uniform float uTrickle; uniform float uActiveRect; uniform sampler3D uCurl; uniform float uPixelRatio;
uniform float uBandPitch; uniform float uBandRows[8]; uniform vec3 uLock; uniform float uGlyph;
out float vAlpha; out float vGlyph;
const int PART_MACHINE[7] = int[7](0, 1, 0, 2, 3, 4, 7);
float expoOut(float t) { return t >= 1.0 ? 1.0 : 1.0 - pow(2.0, -10.0 * t); }
void main() {
  int part = int(aPartition + 0.5);
  int m = PART_MACHINE[part];
  // progress 0..1 for this point
  float ls = uLock.x + aTargetBirth * uLock.y;
  float land = ls + uLock.z * 0.5;
  float depart = max(0.0, land - 0.6);
  float t;
  if (aTrickle > 0.5) {
    t = uTrickle > 0.5 ? fract(uTime * 0.12 + aSeed) : 0.0;
    if (uCompile[0] < 0.999) t = 0.0;
  } else if (part == 2) {
    t = clamp((uBurst - aSeed * 0.3) / 0.6, 0.0, 1.0);
  } else {
    t = clamp((uCompile[m] - depart) / max(1e-4, land - depart), 0.0, 1.0);
  }
  // spawn in NDC from the source rect
  int rectIdx = (aTrickle > 0.5) ? int(uActiveRect + 0.5) : part;
  vec4 r = uRect[rectIdx];
  vec2 spawn = vec2(r.x + aSpawnUV.x * r.z, r.y - aSpawnUV.y * r.w);
  // target in NDC
  vec4 clip = projectionMatrix * modelViewMatrix * vec4(aTarget, 1.0);
  vec2 target = clip.xy / clip.w;
  float targetDepth = clip.z / clip.w;
  vec4 cclip = projectionMatrix * modelViewMatrix * vec4(uCentroid[part], 1.0);
  vec2 centroidNdc = cclip.xy / cclip.w;
  // flight: quadratic bezier with a control point pulled toward the band
  float e = expoOut(t);
  vec2 ctrl = mix(spawn, centroidNdc, 0.33) + vec2(0.0, -0.15);
  vec2 p = mix(mix(spawn, ctrl, e), mix(ctrl, target, e), e);
  // rows band: t in [0.28, 0.62] pulls toward a row-quantized point
  float band = smoothstep(0.28, 0.36, t) * (1.0 - smoothstep(0.54, 0.62, t));
  vec2 bandOrigin = mix(spawn, centroidNdc, 0.33);
  float rows = uBandRows[part];
  float lineLen = 0.35 + 0.45 * fract(aSeed * 7.31);           // ragged right ends
  float xInLine = fract(aSeed * 13.7) * lineLen;
  vec2 rowPt = vec2(bandOrigin.x - 0.25 + xInLine * 0.8, bandOrigin.y + (rows * 0.5 - aRow) * uBandPitch);
  // printing front: rows appear top to bottom over the first quarter of the band window
  float front = smoothstep(0.28 + aRow / rows * 0.08, 0.30 + aRow / rows * 0.08, t);
  p = mix(p, rowPt, band * front);
  // curl
  vec3 c = texture(uCurl, vec3(aSpawnUV * 2.0, aSeed + uTime * 0.15)).xyz * 2.0 - 1.0;
  p += c.xy * sin(3.14159265 * t) * (0.006 + 0.02 * abs(uVel)) * (1.0 - band);
  // depth: near the camera in flight, a hair in front of the target once landing
  float z = mix(-0.98, targetDepth - 0.002, smoothstep(0.9, 1.0, t));
  gl_Position = vec4(p, z, 1.0);
  vAlpha = 0.85 * smoothstep(0.0, 0.03, t) * (1.0 - smoothstep(0.92, 1.0, t)) * step(0.001, t);
  vGlyph = uGlyph * step(0.85, fract(aSeed * 3.3)) * band;
  gl_PointSize = (vGlyph > 0.5 ? 12.0 : 2.0) * uPixelRatio * step(0.001, vAlpha);
}
`;
