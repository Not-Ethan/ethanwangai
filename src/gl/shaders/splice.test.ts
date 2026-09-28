import { describe, it, expect } from 'vitest';
import { splice, spliceAfter } from './splice';

const SRC = '#include <common>\nvoid main() {\n  #include <begin_vertex>\n  #include <project_vertex>\n}';

describe('splice', () => {
  it('replaces the first occurrence of the chunk and leaves the rest of the source untouched', () => {
    const out = splice(SRC, '#include <project_vertex>', 'gl_Position = vec4(0.0);');
    expect(out).toBe('#include <common>\nvoid main() {\n  #include <begin_vertex>\n  gl_Position = vec4(0.0);\n}');
  });

  it('replaces only the first occurrence when the chunk repeats', () => {
    expect(splice('a X b X', 'X', 'Y')).toBe('a Y b X');
  });

  it('inserts the replacement literally, so $-sequences in GLSL are never read as replacement patterns', () => {
    expect(splice('a X b', 'X', '$& $1 $$')).toBe('a $& $1 $$ b');
  });

  it('throws, naming the missing chunk, rather than returning the source unpatched', () => {
    expect(() => splice(SRC, '#include <opaque_fragment>', 'x')).toThrow(/#include <opaque_fragment> is not in three's shader/);
  });
});

describe('spliceAfter', () => {
  it('keeps the chunk and puts the piece on the line after it', () => {
    const out = spliceAfter(SRC, '#include <common>', 'varying vec2 vWorldXZ;');
    expect(out.startsWith('#include <common>\nvarying vec2 vWorldXZ;\nvoid main()')).toBe(true);
    expect(out.split('#include <common>').length - 1).toBe(1);
  });

  it('throws when the chunk is missing', () => {
    expect(() => spliceAfter('', '#include <common>', 'x')).toThrow(/not in three's shader/);
  });
});
