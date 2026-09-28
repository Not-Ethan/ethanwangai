// The switch: raised 30° until the machine locks, then down with expo-out. aParam = [2, −0.5, 0, 0]; pivot at local x = −0.5.
export const KIND_LEVER = /* glsl */`
void kind_lever(inout vec3 p, inout vec3 n, inout vec3 world, float a, float mt, int m) {
  float ang = (1.0 - expoOut(a)) * 0.5235987756;   // 30° → 0
  mat3 R = rotZ(ang);
  vec3 pivot = vec3(-0.5, 0.0, 0.0);
  p = R * (p - pivot) + pivot; n = R * n;
}
`;
