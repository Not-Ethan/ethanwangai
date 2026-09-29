// The ink points' vertex shader (design §7 Flight, Rows band): one program, stateless, GLSL3 for the sampler3D curl
// volume. A point's clock is its own: compile points fly over the 0.6 before their part's lock midpoint, the merge
// partition follows uBurst, the trickle loops on uTime once the quoter is built. Spawn is the point's uv inside its
// source rect (NDC); the target and its partition's centroid go through the real camera; flight blends the two in
// NDC along a bezier. The rows band (design §3.1) is one screen-aligned grid per partition. A compile point streams
// off its glyph into its row, holds, and is released to its part, all on the machine's own uCompile in one window
// shared by the whole partition, so every row prints in the same frame for every point; a point whose part locks
// early peels off its row on its own clock before that release, so the rows thin toward the parts. The merge burst
// keeps its band on its own staggered clock, and the trickle never enters it. three declares projectionMatrix and
// modelViewMatrix (and the sampler3D precision) for a ShaderMaterial, so this file must not.
export const INK_VERTEX = /* glsl */`
precision highp float; precision highp sampler3D;
in vec3 aTarget; in float aTargetBirth; in float aSeed; in float aRow; in float aPartition; in float aTrickle; in vec2 aSpawnUV;
uniform vec4 uRect[8]; uniform vec3 uCentroid[8]; uniform float uCompile[8]; uniform float uTime; uniform float uVel;
uniform float uBurst; uniform float uTrickle; uniform float uActiveRect; uniform sampler3D uCurl; uniform float uPixelRatio;
uniform float uBandPitch; uniform float uBandRows[8]; uniform vec3 uLock; uniform float uGlyph; uniform float uInkEnabled;
out float vAlpha; out float vGlyph;
const int PART_MACHINE[7] = int[7](0, 1, 0, 2, 3, 4, 7);
// The compile band's window in uCompile: T0 + 0.35 s and T0 + 0.95 s over TIMING.heroCompileS = 2.2 s (0.35 / 2.2,
// 0.95 / 2.2); prints over its first quarter, holds, releases over its last quarter.
const float BAND_T0 = 0.15909, BAND_T1 = 0.43182;
// The band's origin sits this share of the way from the source rect's centre to the partition's centroid.
const float BAND_BLEND = 0.33;
// A row starts BAND_MARGIN (NDC x) from the origin and runs LINE_MIN plus up to LINE_RAG more, hashed per row.
const float BAND_MARGIN = 0.32, LINE_MIN = 0.14, LINE_RAG = 0.46;
// The merge burst (part 2) has its own: a quarter of the way from the copy line to the bed, its rows starting at the
// origin and short, so all eight sit on the paper between the copy column and the intake's hopper. The hero's blend
// and margin landed them on the bed; halfway, at the hero's lengths, they ran over the hopper, the in-rail and the frame.
const float BURST_BLEND = 0.27, BURST_MARGIN = 0.0, BURST_LINE_MIN = 0.05, BURST_LINE_RAG = 0.06;
// A point that departs after its row has printed still flies into it, over this much uCompile.
const float LATE_LEG = 0.03;
// A compile point leaves its row on its own clock from t = ROW_LEAVE, ahead of the band's release, so the ink bound
// for the parts that lock from T0 + 0.75 s (design §3.1) streams off the rows toward them while the rows still hold.
const float ROW_LEAVE = 0.7;
float expoOut(float t) { return t >= 1.0 ? 1.0 : 1.0 - pow(2.0, -10.0 * t); }
float hash1(float n) { return fract(sin(n * 12.9898 + 78.233) * 43758.5453); }
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
  // rows band: one grid per partition, its origin never the point's own spawn, so row k is one height for all points
  vec2 rectCenter = vec2(r.x + 0.5 * r.z, r.y - 0.5 * r.w);
  vec2 bandOrigin = mix(rectCenter, centroidNdc, part == 2 ? BURST_BLEND : BAND_BLEND);
  float rows = uBandRows[part];
  float ragged = hash1(aRow + 17.0 * float(part));   // ragged right ends, one length per row
  float lineLen = part == 2 ? BURST_LINE_MIN + BURST_LINE_RAG * ragged : LINE_MIN + LINE_RAG * ragged;
  float xInLine = fract(aSeed * 13.7) * lineLen;
  float rowY = bandOrigin.y + (rows * 0.5 - aRow) * uBandPitch;
  vec2 rowPt = vec2(bandOrigin.x + (part == 2 ? BURST_MARGIN : BAND_MARGIN) + xInLine, rowY);
  float band;   // how far the point sits in its row: 1 holds it there, curl stilled
  if (aTrickle > 0.5) {
    band = 0.0;   // the trickle never enters the band (design §7)
  } else if (part == 2) {
    // the merge burst keeps its band on its own clock: t runs off uBurst, staggered by aSeed
    float front = smoothstep(0.28 + aRow / rows * 0.08, 0.30 + aRow / rows * 0.08, t);
    band = smoothstep(0.28, 0.36, t) * (1.0 - smoothstep(0.54, 0.62, t)) * front;
    p = mix(p, rowPt, band);
  } else {
    // compile points: the band is one event on the machine's own clock, the same frames for the whole partition
    float bt = clamp((uCompile[m] - BAND_T0) / (BAND_T1 - BAND_T0), 0.0, 1.0);
    float front = smoothstep(aRow / rows * 0.22, aRow / rows * 0.22 + 0.03, bt);   // printing front, top row first
    float release = smoothstep(0.75, 1.0, bt);
    // not yet departed (t == 0): on its glyph and hidden; from t = ROW_LEAVE: leaves its row for its part
    float ownFade = step(0.001, t) * (1.0 - smoothstep(ROW_LEAVE, 1.0, t));
    float via = (1.0 - release) * ownFade;   // routed through its row rather than straight at its part
    // in-leg: eases off its glyph and reaches its row as the front seats it, so the stream heads for the band
    float seated = BAND_T0 + (aRow / rows * 0.22 + 0.03) * (BAND_T1 - BAND_T0);
    float s = clamp((uCompile[m] - depart) / max(LATE_LEG, seated - depart), 0.0, 1.0);
    float seat = front * s;
    p = mix(p, mix(mix(spawn, rowPt, s * s * s), rowPt, seat), via);
    band = via * seat;
  }
  // curl
  vec3 c = texture(uCurl, vec3(aSpawnUV * 2.0, aSeed + uTime * 0.15)).xyz * 2.0 - 1.0;
  p += c.xy * sin(3.14159265 * t) * (0.006 + 0.02 * abs(uVel)) * (1.0 - band);
  // depth: near the camera in flight, a hair in front of the target once landing
  float z = mix(-0.98, targetDepth - 0.002, smoothstep(0.9, 1.0, t));
  gl_Position = vec4(p, z, 1.0);
  // uInkEnabled = 0 under reduced motion (design §11: no ink transit): every point hidden, its size 0 below
  vAlpha = uInkEnabled * 0.85 * smoothstep(0.0, 0.03, t) * (1.0 - smoothstep(0.92, 1.0, t)) * step(0.001, t);
  vGlyph = uGlyph * step(0.85, fract(aSeed * 3.3)) * band;
  gl_PointSize = (vGlyph > 0.5 ? 12.0 : 2.0) * uPixelRatio * step(0.001, vAlpha);
}
`;
