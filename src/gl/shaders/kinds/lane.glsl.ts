// Tiles on a rail. aParam = [rate, phase, segLen, j]; j = 0 is the intake chute, j ≥ 1 splitter out-lane j.
// SPLIT_D1 and the fan end points mirror src/bench/configs/splitter.ts: SPLIT_D1 is the straight run along x from the tile
// rest (REST.x = −1.9) along the in-rail and through the block to the fan start (FAN_FROM.x = 0.3), so 0.3 − (−1.9) = 2.2;
// out-rail j then runs from [0.3, 0.3, 0] to [2.2, 0.3, −1.1 + j·0.2]. assemble.test.ts checks both against the built config.
export const KIND_LANE = /* glsl */`
#define SPLIT_D1 2.2
void kind_lane(inout vec3 p, inout vec3 n, inout vec3 world, float a, float mt, int m) {
  float speed = aParam.x * (1.0 + 2.0 * abs(uVel));
  float prog = fract(mt * speed / 4.0 + aParam.y);
  if (aParam.w < 0.5) {
    vec3 dir = normalize(vec3(0.8, -0.65, 0.0));
    world += dir * prog * aParam.z;
  } else {
    float j = aParam.w - 1.0;
    vec3 outDir = vec3(2.2 - 0.3, 0.0, (-1.1 + j * 0.2) - 0.0);
    float outLen = length(outDir); outDir /= outLen;
    if (prog < 0.5) world.x += prog * 2.0 * SPLIT_D1;
    else world += vec3(SPLIT_D1, 0.0, 0.0) + outDir * (prog - 0.5) * 2.0 * outLen;
  }
  // parked and stacked while still: mt = 0 → prog = phase; hide the stack by scaling to a thin tile until run
  p *= mix(0.4, 1.0, clamp(uRun[m], 0.0, 1.0));
}
`;
