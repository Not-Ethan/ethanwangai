import { describe, it, expect, vi, afterEach } from 'vitest';
import { houseFromSentence } from '@/valley/house';
import { submitYours, type YoursDeps } from './yoursSubmit';
import { VISITOR_MAX } from './visitorSentence';

function input(value: string) {
  return { value, blur: vi.fn() };
}
function deps(saveOk = true) {
  const d = { save: vi.fn(() => saveOk), announce: vi.fn() };
  return d as typeof d & YoursDeps;
}

afterEach(() => vi.unstubAllGlobals());

describe('submitYours', () => {
  it('Enter on a sentence: trimmed, saved, announced; the input keeps what was typed', () => {
    const i = input('  a bot that books my dentist appointments  ');
    const d = deps();
    expect(submitYours(i, 'desktop', vi.fn(), d)).toBe('a bot that books my dentist appointments');
    expect(d.save).toHaveBeenCalledWith('a bot that books my dentist appointments');
    expect(d.announce).toHaveBeenCalledWith('a bot that books my dentist appointments');
    expect(i.value).toBe('  a bot that books my dentist appointments  ');
  });

  it('blank or whitespace builds nothing and stores nothing', () => {
    for (const v of ['', '   ', '\t\n']) {
      const d = deps();
      expect(submitYours(input(v), 'desktop', vi.fn(), d)).toBeNull();
      expect(d.save).not.toHaveBeenCalled();
      expect(d.announce).not.toHaveBeenCalled();
    }
  });

  it('caps at 140 characters, and a single 60-character word still builds a real house', () => {
    const d = deps();
    expect(submitYours(input('w'.repeat(300)), 'desktop', vi.fn(), d)).toBe('w'.repeat(VISITOR_MAX));
    const long = submitYours(input('x'.repeat(60)), 'desktop', vi.fn(), d)!;
    expect(long).toBe('x'.repeat(60));
    expect(houseFromSentence(long).parts.length).toBeGreaterThan(0);
  });

  it('phone: closes the keyboard and reframes on the yours section; desktop does neither', () => {
    const p = input('a thing');
    const scrollP = vi.fn();
    submitYours(p, 'phone', scrollP, deps());
    expect(p.blur).toHaveBeenCalledTimes(1);
    expect(scrollP).toHaveBeenCalledWith('yours');
    const q = input('a thing');
    const scrollQ = vi.fn();
    submitYours(q, 'desktop', scrollQ, deps());
    expect(q.blur).not.toHaveBeenCalled();
    expect(scrollQ).not.toHaveBeenCalled();
  });

  it('storage blocked: still builds, nothing throws', () => {
    const d = deps(false);
    expect(submitYours(input('a thing'), 'desktop', vi.fn(), d)).toBe('a thing');
    expect(d.announce).toHaveBeenCalledWith('a thing');
  });

  it('with the real helpers and a localStorage that throws, it announces and does not throw', () => {
    const win = new EventTarget();
    const got: string[] = [];
    win.addEventListener('ortg:visitor-sentence', (e) => got.push((e as CustomEvent<string>).detail));
    vi.stubGlobal('window', win);
    vi.stubGlobal('localStorage', { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } });
    expect(() => submitYours(input('a thing'), 'desktop', vi.fn())).not.toThrow();
    expect(got).toEqual(['a thing']);
  });
});
