// The two string splices every onBeforeCompile patch in src/gl is built from: inkMaterial.ts (and depthMaterial.ts
// through its spliceVertex) and Ground.tsx. A missing chunk throws rather than silently shipping an unpatched program:
// three's ShaderLib text is an implementation detail that can move between releases, and a patch that no longer lands
// should fail the warm-up compile loudly instead of drawing a stock material.

/** Replaces the first `chunk` in `src`; throws if three's shader no longer carries it. The replacement goes in literally (a function replacer), so `$` sequences in GLSL are never read as replacement patterns. */
export function splice(src: string, chunk: string, replacement: string): string {
  if (!src.includes(chunk)) throw new Error(`dbso shader: ${chunk} is not in three's shader`);
  return src.replace(chunk, () => replacement);
}

/** Keeps `chunk` and appends `piece` on the line after it. */
export function spliceAfter(src: string, chunk: string, piece: string): string {
  return splice(src, chunk, `${chunk}\n${piece}`);
}
