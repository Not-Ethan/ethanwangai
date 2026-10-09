// The visitor's house for the no-WebGL tier (spec §5.4, §11): the grammar's own SVG elevation and the same tag the GL
// build prints, so both tiers show the same parts count.
import { houseFromSentence, houseSvg } from '@/valley/house';
import { copy } from '@/site/copy';
import { cleanSentence, countWords } from '@/site/visitorSentence';

export interface HouseSvgView { svg: string; tag: string; words: number; parts: number }

export function houseSvgView(sentence: string | null): HouseSvgView | null {
  if (sentence === null) return null;
  const clean = cleanSentence(sentence);
  if (clean === null) return null;
  const house = houseFromSentence(clean);
  const words = countWords(clean);
  const parts = house.parts.length;
  return { svg: houseSvg(house), tag: copy.yours.tag(words, parts), words, parts };
}
