// Watch field cells: aParam = [col, row, hashBase, cols], w = the field's column count on this tier (48 desktop, 24 phone).
// Rails: aParam = [fieldWidth, period, 0, -1]; w < 0 marks a rail (see configs/watch.ts and configs/slot.ts).
// The slot bar (machine 6) is a rail whose phase is uSlotPhase: its period (uSlotPeriod) changes per keystroke, so Clocks
// integrates rate / period on the CPU. mt / uSlotPeriod would jump the bar on every key and alias it backward, since
// the slot has no lever and its mt has run since load. Both triangle waves are 0 at phase 0, so a rail whose clock has
// not started parks at its −x end, where configs/watch.ts parks it next to the lever, and the hot ring reads the same.
export const KIND_SCAN = /* glsl */`
void kind_scan(inout vec3 p, inout vec3 n, inout vec3 world, float a, float mt, int m) {
  bool isRail = aParam.w < -0.5;
  if (isRail) {
    float phase = (m == 6) ? uSlotPhase : mt / aParam.y;
    float tri = 1.0 - abs(fract(phase) * 2.0 - 1.0);
    world.x += tri * aParam.x;
    return;
  }
  float col = aParam.x, row = aParam.y, base = aParam.z, cols = aParam.w;
  float baseline = 0.35 + 0.25 * sin(col * 0.37 + row * 0.61 + mt * 0.4) * base;
  float spike = step(0.995, base) * 3.0;
  float h = mix(0.125, baseline + spike, a);
  p.y *= h;
  // hot ring when the rail passes a spike: the rail sits tri * fieldWidth from the field's −x edge, i.e. over column tri * cols
  // on either tier. The period mirrors SWEEP_PERIOD_S in configs/watch.ts (the same on both tiers; assemble.test.ts pins it).
  float period = 4.0;
  float tri = 1.0 - abs(fract(mt / period) * 2.0 - 1.0);
  float railCol = tri * cols;
  vHot = spike > 0.0 && abs(railCol - col) < 1.0 ? a : 0.0;
}
`;
