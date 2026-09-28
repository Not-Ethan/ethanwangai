// Watch field cells: aParam = [col, row, hashBase, 0]. Rails: aParam = [fieldWidth, period, 0, 1]; w = 1 marks a rail
// (see configs/watch.ts and configs/slot.ts). The slot bar (machine 6) is a rail whose period comes from uSlotPeriod.
export const KIND_SCAN = /* glsl */`
void kind_scan(inout vec3 p, inout vec3 n, inout vec3 world, float a, float mt, int m) {
  bool isRail = aParam.w > 0.5;
  if (isRail) {
    float period = (m == 6) ? uSlotPeriod : aParam.y;
    float tri = abs(fract(mt / period) * 2.0 - 1.0);
    world.x += tri * aParam.x;
    return;
  }
  float col = aParam.x, row = aParam.y, base = aParam.z;
  float baseline = 0.35 + 0.25 * sin(col * 0.37 + row * 0.61 + mt * 0.4) * base;
  float spike = step(0.995, base) * 3.0;
  float h = mix(0.125, baseline + spike, a);
  p.y *= h;
  // hot ring when the rail passes a spike: the rail's column is its triangle-wave fraction times the field's 48 columns (period 4 s, as configs/watch.ts)
  float period = 4.0;
  float tri = abs(fract(mt / period) * 2.0 - 1.0);
  float railCol = tri * 48.0;
  vHot = spike > 0.0 && abs(railCol - col) < 1.0 ? a : 0.0;
}
`;
