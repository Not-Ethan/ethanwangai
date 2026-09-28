// Balance tiles on the 8 s game clock: liability stacks left over 0–4 s, hedge right over 4–7 s, clear at 7.5–8 s.
// aParam = [side, index, offset, 0]. The tile rides the tilted rail by rotating its rest position (instanceMatrix's
// translation, bench space) about uBalancePivot; that rotation lands in the bench-space offset, not the local pose.
export const KIND_STACK = /* glsl */`
void kind_stack(inout vec3 p, inout vec3 n, inout vec3 world, float a, float mt, int m) {
  float g = mod(mt, 8.0);
  float side = aParam.x, idx = aParam.y;
  float appear = side < 0.0 ? smoothstep(idx / 48.0 * 4.0, idx / 48.0 * 4.0 + 0.05, g)
                            : smoothstep(4.0 + idx / 48.0 * 3.0, 4.0 + idx / 48.0 * 3.0 + 0.05, g);
  float clear = 1.0 - smoothstep(7.5, 7.8, g);
  float vis = appear * clear * a;
  p *= mix(0.001, 1.0, vis);
  // ride the tilted rail: rotate the rest position about the balance pivot
  vec3 rest = instanceMatrix[3].xyz;
  vec3 rel = rest - uBalancePivot;
  mat3 R = rotZ(uTilt);
  world += (R * rel - rel);
  vHot = (g > 7.5 && g < 7.9) ? a : 0.0;
}
`;
