import { describe, it, expect, vi, afterEach } from 'vitest';
import { COMPILE_TIMEOUT_MS, FADE_MS, warmUp, withTimeout, type WarmUpDeps } from './warmup';

afterEach(() => { vi.useRealTimers(); });

function deps(log: string[], over: Partial<WarmUpDeps> = {}): WarmUpDeps {
  return {
    fontsReady: Promise.resolve().then(() => { log.push('fonts'); }),
    compile: () => { log.push('compile'); return Promise.resolve(); },
    renderOnce: () => { log.push('render'); },
    fadeIn: (ms) => { log.push(`fade ${ms}`); },
    wait: (ms) => new Promise<void>((resolve) => setTimeout(() => { log.push(`waited ${ms}`); resolve(); }, ms)),
    now: () => 12_345,
    ...over,
  };
}

describe('withTimeout', () => {
  it('reports done, failed or timeout', async () => {
    vi.useFakeTimers();
    await expect(withTimeout(Promise.resolve(1), 10)).resolves.toBe('done');
    await expect(withTimeout(Promise.reject(new Error('lost')), 10)).resolves.toBe('failed');
    const hanging = withTimeout(new Promise(() => {}), COMPILE_TIMEOUT_MS);
    await vi.advanceTimersByTimeAsync(COMPILE_TIMEOUT_MS);
    await expect(hanging).resolves.toBe('timeout');
  });
});

describe('warmUp (spec §7)', () => {
  it('waits for fonts, compiles, draws one frame, fades over 200 ms, then resolves T0 in seconds', async () => {
    vi.useFakeTimers();
    const log: string[] = [];
    const p = warmUp(deps(log));
    await vi.advanceTimersByTimeAsync(FADE_MS);
    await expect(p).resolves.toBe(12.345);
    expect(FADE_MS).toBe(200);
    expect(log).toEqual(['fonts', 'compile', 'render', 'fade 200', 'waited 200']);
  });

  it('proceeds after 4 s when compileAsync never settles (lost context, Review Focus 5)', async () => {
    vi.useFakeTimers();
    const log: string[] = [];
    const p = warmUp(deps(log, { compile: () => { log.push('compile'); return new Promise(() => {}); } }));
    await vi.advanceTimersByTimeAsync(COMPILE_TIMEOUT_MS - 1);
    expect(log).not.toContain('render');
    await vi.advanceTimersByTimeAsync(1 + FADE_MS);
    await expect(p).resolves.toBe(12.345);
    expect(log).toContain('render');
    expect(COMPILE_TIMEOUT_MS).toBe(4000);
  });

  it('proceeds when compile throws or rejects and when the first frame throws', async () => {
    vi.useFakeTimers();
    const log: string[] = [];
    const p = warmUp(deps(log, {
      compile: () => { throw new Error('context lost'); },
      renderOnce: () => { throw new Error('context lost'); },
    }));
    await vi.advanceTimersByTimeAsync(FADE_MS);
    await expect(p).resolves.toBe(12.345);
    expect(log).toContain('fade 200');
  });

  it('does not wait forever on fonts', async () => {
    vi.useFakeTimers();
    const log: string[] = [];
    const p = warmUp(deps(log, { fontsReady: new Promise(() => {}) }));
    await vi.advanceTimersByTimeAsync(COMPILE_TIMEOUT_MS + FADE_MS);
    await expect(p).resolves.toBe(12.345);
  });
});
