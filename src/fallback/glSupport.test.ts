import { describe, it, expect, vi, afterEach } from 'vitest';
import { webgl2Available } from './glSupport';

// The probe against stand-ins: node has no canvas, so document.createElement hands back a canvas whose getContext is
// whatever the case needs, and location.search is the page's query.
const MAX_VERTEX_ATTRIBS = 0x8869;

function probe(context: unknown) {
  const loseContext = vi.fn();
  const getContext = vi.fn(() => context);
  const createElement = vi.fn(() => ({ getContext }));
  vi.stubGlobal('document', { createElement });
  return { createElement, getContext, loseContext };
}

function gl(maxAttribs: number, loseContext = vi.fn()) {
  return {
    MAX_VERTEX_ATTRIBS,
    getParameter: vi.fn((p: number) => (p === MAX_VERTEX_ATTRIBS ? maxAttribs : 0)),
    getExtension: vi.fn((name: string) => (name === 'WEBGL_lose_context' ? { loseContext } : null)),
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('webgl2Available', () => {
  it('is true for a WebGL2 context with at least 16 vertex attributes, and releases the probe context', () => {
    vi.stubGlobal('location', { search: '' });
    const lose = vi.fn();
    const { createElement, getContext } = probe(gl(16, lose));
    expect(webgl2Available()).toBe(true);
    expect(createElement).toHaveBeenCalledWith('canvas');
    expect(getContext).toHaveBeenCalledWith('webgl2');
    expect(lose).toHaveBeenCalledTimes(1);
  });

  it('is false with no WebGL2 context', () => {
    vi.stubGlobal('location', { search: '' });
    probe(null);
    expect(webgl2Available()).toBe(false);
  });

  it('is false when the context has fewer than 16 vertex attributes (the instancing check), and still releases it', () => {
    vi.stubGlobal('location', { search: '' });
    const lose = vi.fn();
    probe(gl(15, lose));
    expect(webgl2Available()).toBe(false);
    expect(lose).toHaveBeenCalledTimes(1);
  });

  it('is false when creating the context throws', () => {
    vi.stubGlobal('location', { search: '' });
    vi.stubGlobal('document', { createElement: () => ({ getContext: () => { throw new Error('blocked'); } }) });
    expect(webgl2Available()).toBe(false);
  });

  it('is false for ?nogl=1 without probing, so the SVG tier can be forced for testing', () => {
    for (const search of ['?nogl=1', '?tier=phone&nogl=1']) {
      vi.stubGlobal('location', { search });
      const { createElement } = probe(gl(16));
      expect(webgl2Available(), search).toBe(false);
      expect(createElement, search).not.toHaveBeenCalled();
    }
  });

  it('probes as usual for any other nogl value', () => {
    vi.stubGlobal('location', { search: '?nogl=0' });
    probe(gl(16));
    expect(webgl2Available()).toBe(true);
  });
});
