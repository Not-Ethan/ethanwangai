import { Fragment } from 'react';
import { figureTokens } from '@/site/figureTokens';

/** An oversized mono evidence figure (spec §9: 48–72 px, tabular numerals). No count-up: it is printed as is.
 *  Hyphenated tokens never break across lines; the text content stays exactly the input string. */
export function Figure({ children }: { children: string }) {
  const tokens = figureTokens(children);
  return (
    <p className="mono-figure" data-reveal>
      {tokens.map((t, i) => (
        <Fragment key={i}>
          {i > 0 ? ' ' : null}
          {t.nowrap ? <span style={{ whiteSpace: 'nowrap' }}>{t.text}</span> : t.text}
        </Fragment>
      ))}
    </p>
  );
}
