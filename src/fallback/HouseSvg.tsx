'use client';
// Rendered by Still.tsx (Stage 5) in the no-WebGL tier: the visitor's latest sentence as an SVG elevation with its tag.
// useSyncExternalStore: the server and the hydration pass render nothing; the stored or newly typed sentence follows.
import { useMemo, useSyncExternalStore } from 'react';
import { getVisitorSnapshot, onVisitorSentence } from '@/site/visitorSentence';
import { houseSvgView } from './houseSvgView';

const subscribe = (cb: () => void) => onVisitorSentence(() => cb());
const serverSnapshot = () => null;

export function VisitorHouseSvg() {
  const sentence = useSyncExternalStore(subscribe, getVisitorSnapshot, serverSnapshot);
  const view = useMemo(() => houseSvgView(sentence), [sentence]);
  if (!view) return null;
  return (
    <figure className="mt-6 max-w-[34ch]">
      {/* houseSvg is generated from numbers by the grammar; the test proves no sentence text reaches it */}
      <div role="img" aria-label={view.tag} dangerouslySetInnerHTML={{ __html: view.svg }} />
      <figcaption className="mono mt-2">{view.tag}</figcaption>
    </figure>
  );
}
