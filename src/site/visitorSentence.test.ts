import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { copy } from '@/site/copy';
import {
  VISITOR_EVENT, VISITOR_MAX, VISITOR_STORAGE_KEY,
  announceVisitorSentence, cleanSentence, countWords, getVisitorSnapshot, loadVisitorSentence, onVisitorSentence,
  resetVisitorSnapshot, saveVisitorSentence,
} from './visitorSentence';

function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() { return m.size; },
    clear: () => m.clear(),
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    key: (i: number) => [...m.keys()][i] ?? null,
    removeItem: (k: string) => { m.delete(k); },
    setItem: (k: string, v: string) => { m.set(k, String(v)); },
  };
}

/** localStorage whose very access throws, as in some private modes. */
function blockStorage(): () => void {
  const prev = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() { throw new DOMException('denied', 'SecurityError'); },
  });
  return () => {
    if (prev) Object.defineProperty(globalThis, 'localStorage', prev);
    else delete (globalThis as { localStorage?: Storage }).localStorage;
  };
}

beforeEach(() => resetVisitorSnapshot());
afterEach(() => vi.unstubAllGlobals());

describe('cleanSentence and countWords', () => {
  it('trims, caps at 140 characters, and turns blank into null (Review Focus 1)', () => {
    expect(cleanSentence('  a bot that trades  ')).toBe('a bot that trades');
    expect(cleanSentence('')).toBeNull();
    expect(cleanSentence(' \t\n ')).toBeNull();
    expect(cleanSentence('a'.repeat(200))).toBe('a'.repeat(VISITOR_MAX));
    expect(cleanSentence('x'.repeat(60))).toBe('x'.repeat(60));
    expect(Array.from(cleanSentence('😀'.repeat(150))!)).toHaveLength(VISITOR_MAX);
  });
  it('counts the words typed, unclamped', () => {
    expect(countWords('a  bot\tthat\ntrades')).toBe(4);
    expect(countWords('   ')).toBe(0);
    expect(countWords('w '.repeat(30))).toBe(30);
  });
});

describe('localStorage.visitorSentence', () => {
  it('round-trips through storage under the spec key', () => {
    const s = memoryStorage();
    vi.stubGlobal('localStorage', s);
    expect(loadVisitorSentence()).toBeNull();
    expect(saveVisitorSentence('a bar that pays you back')).toBe(true);
    expect(s.getItem(VISITOR_STORAGE_KEY)).toBe('a bar that pays you back');
    expect(loadVisitorSentence()).toBe('a bar that pays you back');
  });
  it('cleans what it loads: blank is null, long is capped', () => {
    const s = memoryStorage();
    vi.stubGlobal('localStorage', s);
    s.setItem(VISITOR_STORAGE_KEY, '   ');
    expect(loadVisitorSentence()).toBeNull();
    s.setItem(VISITOR_STORAGE_KEY, 'b'.repeat(500));
    expect(loadVisitorSentence()).toBe('b'.repeat(VISITOR_MAX));
  });
  it('blocked storage: load is null, save is false, nothing throws (Review Focus 4)', () => {
    const restore = blockStorage();
    try {
      expect(() => loadVisitorSentence()).not.toThrow();
      expect(loadVisitorSentence()).toBeNull();
      expect(saveVisitorSentence('a thing')).toBe(false);
    } finally {
      restore();
    }
  });
  it('a full or read-only store: save is false, nothing throws', () => {
    const s = memoryStorage();
    s.setItem = () => { throw new DOMException('full', 'QuotaExceededError'); };
    vi.stubGlobal('localStorage', s);
    expect(saveVisitorSentence('a thing')).toBe(false);
  });
  it('no storage at all (server render): null and false', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(loadVisitorSentence()).toBeNull();
    expect(saveVisitorSentence('a thing')).toBe(false);
  });
});

describe('announce, subscribe, snapshot', () => {
  it('announces on window and updates the snapshot; unsubscribe stops delivery', () => {
    vi.stubGlobal('window', new EventTarget());
    vi.stubGlobal('localStorage', memoryStorage());
    const got: string[] = [];
    const off = onVisitorSentence((s) => got.push(s));
    announceVisitorSentence('first');
    expect(got).toEqual(['first']);
    expect(getVisitorSnapshot()).toBe('first');
    off();
    announceVisitorSentence('second');
    expect(got).toEqual(['first']);
    expect(getVisitorSnapshot()).toBe('second');
  });
  it('the first snapshot reads storage once', () => {
    const s = memoryStorage();
    s.setItem(VISITOR_STORAGE_KEY, 'stored one');
    vi.stubGlobal('localStorage', s);
    expect(getVisitorSnapshot()).toBe('stored one');
    s.setItem(VISITOR_STORAGE_KEY, 'changed underneath');
    expect(getVisitorSnapshot()).toBe('stored one');
  });
  it('uses the event name the GL bridge and the SVG listen for', () => {
    expect(VISITOR_EVENT).toBe('ortg:visitor-sentence');
  });
});

describe('copy.yours strings the build prints (spec §3.1 · 07, §3.2)', () => {
  it('input, button and hint', () => {
    expect(copy.yours.placeholder).toBe("something you'd build");
    expect(copy.yours.button).toBe('build');
    expect(copy.yours.hint).toBe('it stays in this browser. nothing is sent anywhere.');
  });
  it('clock and tag', () => {
    expect(copy.yours.clock('2.15')).toBe('2.15 / 4.40');
    expect(copy.yours.tag(7, 233)).toBe('7 words in · 233 parts out · 4.40 s on the clock');
    expect(copy.yours.tag(24, 1933)).toBe('24 words in · 1,933 parts out · 4.40 s on the clock');
  });
  it('the five hillside sentences, in order', () => {
    expect(copy.yours.hillside).toEqual([
      'a discord bot for my middle school server',
      'a trading algorithm for kalshi',
      'a pipeline that made three thousand videos a month',
      'a help-desk assistant that reads the docs for you',
      'a pricing model for free-drinks promos at bars',
    ]);
  });
});
