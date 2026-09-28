// The ink points' fragment shader: a soft dot in the palette's ink, alpha from the vertex clock, discarded once faint
// or outside the disc. uInk is a linear-space Color like every palette uniform, and a GLSL3 ShaderMaterial gets no
// colorspace_fragment of its own, so the dot goes through three's linearToOutputTexel to land in the canvas's sRGB
// like the kits do. Glyph mode (uGlyph = 1, Stage 6) samples the runtime atlas through gl_PointCoord in place of the
// disc; until that atlas exists a glyph point is the same dot at its larger size.
export const INK_FRAGMENT = /* glsl */`
precision highp float;
uniform vec3 uInk;
in float vAlpha; in float vGlyph;
out vec4 fragColor;
void main() {
  if (vAlpha < 0.01) discard;
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float a = vAlpha * (1.0 - smoothstep(0.35, 0.5, d));
  fragColor = vec4(linearToOutputTexel(vec4(uInk, 1.0)).rgb, a);
}
`;
