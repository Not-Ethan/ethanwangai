// Quoter cell caps: ride their cell's height and flip on a fill at the traded level. aParam as the cell's; pivot on the −z edge at local z = −0.4.
export const KIND_CAP = /* glsl */`
float flipProfile(float t) {                       // t seconds since the fill
  float up = smoothstep(0.0, 0.12, t);
  float down = 1.0 - smoothstep(0.42, 0.62, t);
  return 1.08 * 3.14159265 * min(up, down);
}
void kind_cap(inout vec3 p, inout vec3 n, inout vec3 world, float a, float mt, int m) {
  float col = aParam.x, row = aParam.y, size = aParam.z;
  float L = min(floor(uMerge), 6.0);
  float f = uMerge >= 6.0 ? 0.0 : smoothstep(0.0, 0.3, fract(uMerge));
  float span0 = exp2(L), span1 = exp2(min(L + 1.0, 6.0));
  float r0 = mod(col, span0), r1 = mod(col, span1);
  float lead0 = step(r0, 0.5), lead1 = step(r1, 0.5);
  float dx = mix(-r0 * uPitch + lead0 * (span0 - 1.0) * uPitch * 0.5, -r1 * uPitch + lead1 * (span1 - 1.0) * uPitch * 0.5, f);
  float sx = mix(mix(0.001, span0, lead0), mix(0.001, span1, lead1), f);
  float leaderCol = col - r0;
  float hot; vec4 tex;
  float ph = quoterHeight(leaderCol, row, size, mt / span0, m, hot, tex);
  float hf = mix(0.125, ph, a);
  // fill at the traded level: fetch the fill channel at rate-scaled time
  vec4 ft = ouFetch(leaderCol, mt * uFillRate[m] / span0);
  float since = ft.a * 255.0;                                   // steps since last fill
  float t = (since + fract(mt * uFillRate[m] / span0 * uOUInfo.w)) / uOUInfo.w;
  float mid = ft.r * 255.0;
  float side = step(0.5, hash21(vec2(leaderCol, floor(mt * uFillRate[m] / span0 * uOUInfo.w) - since)));
  float tradedRow = mix(mid - ft.g * 255.0, mid + ft.b * 255.0, side);
  float isTraded = step(abs(row - tradedRow), 0.5) * step(since, 6.0);
  float ang = flipProfile(t) * isTraded * a;
  mat3 R = rotX(ang);
  vec3 pivot = vec3(0.0, 0.0, -0.4);
  p = R * (p - pivot) + pivot; n = R * n;
  p.x *= sx;
  world.x += dx;
  world.y += uCellH * (hf - 1.0);
  world.x += uLean * 0.35 * uCellH * hf;
  vFlip = ang / 3.14159265;
  vIsCap = 1.0;
}
`;
