// Enter (or the build button) in section 07 (spec §3.1 · 07, §11). The sentence is cleaned, stored in this browser if
// storage allows, and announced on window for the GL bridge (or the no-GL SVG) to build. On phones the keyboard closes
// and the page reframes on the section so the lot is visible. Nothing is sent anywhere.
import type { Tier } from '@/valley/types';
import { announceVisitorSentence, cleanSentence, saveVisitorSentence } from './visitorSentence';

export interface YoursInput { value: string; blur(): void }
export interface YoursDeps { save(s: string): boolean; announce(s: string): void }

const DEFAULT_DEPS: YoursDeps = { save: saveVisitorSentence, announce: announceVisitorSentence };

export function submitYours(
  input: YoursInput, tier: Tier, scrollTo: (id: string) => void, deps: YoursDeps = DEFAULT_DEPS,
): string | null {
  const sentence = cleanSentence(input.value);
  if (sentence === null) return null;
  deps.save(sentence);
  deps.announce(sentence);
  if (tier === 'phone') {
    input.blur();
    scrollTo('yours');
  }
  return sentence;
}
