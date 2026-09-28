// Rotors, spokes, motors: rotation about local z at a rate that follows the machine's fill rate. aParam = [0, baseRate, phase, 0].
export const KIND_SPIN = /* glsl */`
void kind_spin(inout vec3 p, inout vec3 n, inout vec3 world, float a, float mt, int m) {
  float rate = aParam.y * (0.6 + 0.4 * uFillRate[m]);
  float ang = mt * rate + aParam.z * PI2;
  mat3 R = rotZ(ang);
  p = R * p; n = R * n;
}
`;
