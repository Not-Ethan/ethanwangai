// Carriage parts: cosine travel along the rail. aParam = [railLength, period, phase, dir].
export const KIND_SWEEP = /* glsl */`
void kind_sweep(inout vec3 p, inout vec3 n, inout vec3 world, float a, float mt, int m) {
  float s = 0.5 * (1.0 - cos(PI2 * (mt / aParam.y + aParam.z)));
  world.x += aParam.w * aParam.x * s;
}
`;
