// Quoter bed cells (the visitor and bot cells share the primitive, not the kind). aParam = [col, row, size, 0].
// Defines quoterHeight, which cap.glsl.ts also calls, so this file must precede cap in the assembled declarations.
export const KIND_CELL = /* glsl */`
// Depth-ladder relief: rows are price levels. Height profile around the market's mid.
float quoterHeight(float col, float row, float size, float mt, int m, out float hot, out vec4 tex) {
  tex = ouFetch(col, mt);
  float mid = tex.r * 255.0;
  float bidOff = tex.g * 255.0, askOff = tex.b * 255.0;
  float d = abs(row - mid);
  float h = 0.25 + 0.75 * exp(-d / 4.0) * size;
  hot = (abs(row - (mid - bidOff)) < 0.5 || abs(row - (mid + askOff)) < 0.5) ? 1.0 : 0.0;
  return clamp(h, 0.25, 1.0);
}
void kind_cell(inout vec3 p, inout vec3 n, inout vec3 world, float a, float mt, int m) {
  float col = aParam.x, row = aParam.y, size = aParam.z;
  // merge: leader/member state at level L and L+1, blended by f
  float L = min(floor(uMerge), 6.0);
  float f = uMerge >= 6.0 ? 0.0 : smoothstep(0.0, 0.3, fract(uMerge));
  float span0 = exp2(L), span1 = exp2(min(L + 1.0, 6.0));
  float r0 = mod(col, span0), r1 = mod(col, span1);
  float lead0 = step(r0, 0.5), lead1 = step(r1, 0.5);
  float dx0 = -r0 * uPitch + lead0 * (span0 - 1.0) * uPitch * 0.5;
  float dx1 = -r1 * uPitch + lead1 * (span1 - 1.0) * uPitch * 0.5;
  float sx0 = mix(0.001, span0, lead0), sx1 = mix(0.001, span1, lead1);
  float dx = mix(dx0, dx1, f), sx = mix(sx0, sx1, f);
  float leaderCol = col - r0;
  float hot; vec4 tex;
  float ph = quoterHeight(leaderCol, row, size, mt / span0, m, hot, tex);
  float hf = mix(0.125, ph, a);
  p.x *= sx; p.y *= hf;
  world.x += dx;
  // hover lift
  if (abs(uHover.x - float(m)) < 0.5 && abs(uHover.y - col) < 0.5) world.y += 0.08;
  // lean kick (burst-back)
  world.x += uLean * 0.35 * p.y;
  vHot = hot * a;
}
`;
