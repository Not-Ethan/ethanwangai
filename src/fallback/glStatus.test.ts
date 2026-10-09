import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { glStatus, probeGl, markGlFailed, subscribeGl, watchContextLoss, resetGlStatusForTests } from './glStatus';

beforeEach(() => resetGlStatusForTests());
afterEach(() => vi.unstubAllGlobals());

describe('the GL status store (spec §11)', () => {
  it('starts unknown, then caches the first probe result and never probes again', () => {
    expect(glStatus()).toBe('unknown');
    const probe = vi.fn(() => true);
    expect(probeGl(probe)).toBe('ok');
    expect(probeGl(probe)).toBe('ok');
    expect(probe).toHaveBeenCalledTimes(1);
  });

  it('a failing probe is the no-GL tier', () => {
    expect(probeGl(() => false)).toBe('failed');
    expect(glStatus()).toBe('failed');
  });

  it('?nogl=1 forces the no-GL tier through the real probe without creating a context', () => {
    vi.stubGlobal('location', { search: '?nogl=1' });
    const createElement = vi.fn();
    vi.stubGlobal('document', { createElement });
    expect(probeGl()).toBe('failed');
    expect(createElement).not.toHaveBeenCalled();
  });

  it('markGlFailed flips ok to failed once and notifies each subscriber once', () => {
    probeGl(() => true);
    const a = vi.fn();
    const b = vi.fn();
    const offB = subscribeGl(b);
    subscribeGl(a);
    offB();
    markGlFailed();
    markGlFailed();
    expect(glStatus()).toBe('failed');
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).not.toHaveBeenCalled();
    expect(probeGl(() => true)).toBe('failed');   // a later probe never resurrects the canvas
  });
});

describe('watchContextLoss (index Review Focus 5)', () => {
  it('a lost context after T0 switches to the no-GL tier, once', () => {
    probeGl(() => true);
    const canvas = new EventTarget();
    const seen = vi.fn();
    subscribeGl(seen);
    watchContextLoss(canvas, markGlFailed);
    canvas.dispatchEvent(new Event('webglcontextlost'));
    canvas.dispatchEvent(new Event('webglcontextlost'));   // R3F's own forceContextLoss on the unmount that follows
    expect(glStatus()).toBe('failed');
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it('the returned function stops watching', () => {
    const canvas = new EventTarget();
    const onLost = vi.fn();
    const stop = watchContextLoss(canvas, onLost);
    stop();
    canvas.dispatchEvent(new Event('webglcontextlost'));
    expect(onLost).not.toHaveBeenCalled();
  });
});
