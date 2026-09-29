// Balance rail and end trays: turn with the beam, rigidly, about the post top (uBalancePivot), as the tiles riding
// them do (stack.glsl.ts). The turn is in bench space. Turning p in the part's own frame would turn each tray bar about
// its own middle (about bench x for the bars along z) and before its length scale, so the trays would shear and stay
// put while the rail's ends moved. uTilt is critically damped in JS. aParam unused.
// M = mat3(instanceMatrix) is rotation · scale. The lit program takes the normal to bench space as M · (n / s2)
// (assemble.ts); the kind turns it there and hands it back as transpose(M) · (…), which that step maps onto the turned normal.
export const KIND_TILT = /* glsl */`
void kind_tilt(inout vec3 p, inout vec3 n, inout vec3 world, float a, float mt, int m) {
  mat3 R = rotZ(uTilt);
  mat3 M = mat3(instanceMatrix);
  vec3 s2 = vec3(dot(M[0], M[0]), dot(M[1], M[1]), dot(M[2], M[2]));
  vec3 rel = instanceMatrix[3].xyz - uBalancePivot + M * p;
  world += R * rel - rel;
  n = transpose(M) * (R * (M * (n / s2)));
}
`;
