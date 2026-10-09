// The visitor's sentence (spec §2, §3.1 · 07, §11): cleaning, word count, the only localStorage key this site uses, and
// the window event that carries a submitted sentence to the GL bridge (src/gl/visitorBridge.ts) and the no-GL SVG
// (src/fallback/HouseSvg.tsx). Every storage access is inside try/catch: blocked storage means no persistence, never an
// error. The sentence only ever travels as a string to the grammar and to textContent; it is never HTML, never sent.

export const VISITOR_MAX = 140;
export const VISITOR_STORAGE_KEY = 'visitorSentence';
export const VISITOR_EVENT = 'ortg:visitor-sentence';

/** Trim, cap at 140 code points (so an emoji is never split), trim again; blank → null. */
export function cleanSentence(raw: string): string | null {
  const s = Array.from(raw.trim()).slice(0, VISITOR_MAX).join('').trim();
  return s.length > 0 ? s : null;
}

/** The words typed: whitespace-split, non-empty, not clamped (the tag prints the real count). */
export function countWords(s: string): number {
  return s.split(/\s+/).filter((w) => w.length > 0).length;
}

export function loadVisitorSentence(): string | null {
  try {
    const v = globalThis.localStorage?.getItem(VISITOR_STORAGE_KEY);
    return v == null ? null : cleanSentence(v);
  } catch {
    return null;
  }
}

export function saveVisitorSentence(s: string): boolean {
  try {
    const store = globalThis.localStorage;
    if (!store) return false;
    store.setItem(VISITOR_STORAGE_KEY, s);
    return true;
  } catch {
    return false;
  }
}

// The latest sentence, for useSyncExternalStore. undefined = not read from storage yet.
let latest: string | null | undefined;

export function getVisitorSnapshot(): string | null {
  if (latest === undefined) latest = loadVisitorSentence();
  return latest;
}

/** Tests only: forget the cached snapshot. */
export function resetVisitorSnapshot(): void {
  latest = undefined;
}

export function announceVisitorSentence(s: string): void {
  latest = s;
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<string>(VISITOR_EVENT, { detail: s }));
}

export function onVisitorSentence(cb: (s: string) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: Event) => cb((e as CustomEvent<string>).detail);
  window.addEventListener(VISITOR_EVENT, handler);
  return () => window.removeEventListener(VISITOR_EVENT, handler);
}

export interface TextSink { textContent: string | null }

/** The Yours section's clock and tag lines, registered by Yours.tsx on mount; the GL bridge writes them. */
export const yoursDom: { clock: TextSink | null; tag: TextSink | null } = { clock: null, tag: null };
