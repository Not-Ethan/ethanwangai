// Bot and visitor parts: a seeded scale pulse on a chat cadence. aParam = [period, phase, pulseScale, 0].
export const KIND_PING = /* glsl */`
void kind_ping(inout vec3 p, inout vec3 n, inout vec3 world, float a, float mt, int m) {
  float ph = fract(mt / aParam.x + aParam.y);
  float bump = smoothstep(0.0, 0.05, ph) * (1.0 - smoothstep(0.05, 0.12, ph));
  p *= 1.0 + (aParam.z - 1.0) * bump * a;
  vHot = bump * a;
}
`;
