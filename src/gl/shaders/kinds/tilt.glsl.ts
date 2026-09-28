// Balance rail and end trays: rotate with the beam. uTilt is critically damped in JS. aParam unused.
export const KIND_TILT = /* glsl */`
void kind_tilt(inout vec3 p, inout vec3 n, inout vec3 world, float a, float mt, int m) {
  mat3 R = rotZ(uTilt);
  p = R * p; n = R * n;
}
`;
