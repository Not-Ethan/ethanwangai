// The GL tier's gate (design §11): a WebGL2 context that can draw the kits' instanced attributes, or the SVG tier.
// Runs once, on the client, before the Canvas mounts; `?nogl=1` forces the SVG tier for testing.

/** The kits bind up to 16 vertex attributes per instanced draw: WebGL2's floor, which some drivers report below. */
const MIN_VERTEX_ATTRIBS = 16;

/** True when a probe canvas gets a WebGL2 context with 16 or more vertex attributes, and the page is not `?nogl=1`. */
export function webgl2Available(): boolean {
  if (new URLSearchParams(location.search).get('nogl') === '1') return false;
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return false;
    const ok = gl.getParameter(gl.MAX_VERTEX_ATTRIBS) >= MIN_VERTEX_ATTRIBS;
    gl.getExtension('WEBGL_lose_context')?.loseContext();   // hand the probe's context back: browsers cap live contexts
    return ok;
  } catch {
    return false;
  }
}
