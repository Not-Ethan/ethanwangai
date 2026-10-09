'use client';
import { useEffect, useRef, type FormEvent } from 'react';
import { copy } from '@/site/copy';
import { SECTIONS } from '@/valley/sections';
import { Reveal } from '@/site/Reveal';
import { useScroll } from '@/scroll/ScrollProvider';
import { submitYours } from '@/site/yoursSubmit';
import { useGlFailed } from '@/fallback/Still';
import { VisitorHouseSvg } from '@/fallback/HouseSvg';
import { VISITOR_MAX, loadVisitorSentence, yoursDom } from '@/site/visitorSentence';

const HEIGHT_VH = SECTIONS.find((s) => s.id === 'yours')?.heightVh ?? 100;

/** Hand the clock and tag lines to the GL bridge, and show a stored sentence in the input. */
function bindYours(input: HTMLInputElement | null, clock: HTMLElement | null, tag: HTMLElement | null): () => void {
  yoursDom.clock = clock;
  yoursDom.tag = tag;
  const stored = loadVisitorSentence();
  if (stored && input && input.value === '') input.value = stored;
  return () => {
    yoursDom.clock = null;
    yoursDom.tag = null;
  };
}

/** 07 · yours (spec §3.1): one sentence, max 140 characters. Enter or `build` submits; the bridge builds the house. */
export function Yours() {
  const { tier, scrollTo } = useScroll();
  const c = copy.yours;
  const input = useRef<HTMLInputElement>(null);
  const clock = useRef<HTMLParagraphElement>(null);
  const tag = useRef<HTMLParagraphElement>(null);
  const glFailed = useGlFailed();

  useEffect(() => bindYours(input.current, clock.current, tag.current), []);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.current) submitYours(input.current, tier, scrollTo);
  };

  return (
    <section id="yours" className="section" style={{ minHeight: `${HEIGHT_VH}vh` }}>
      <div className="section-grid">
        <Reveal className="copy-col scrim">
          <h2 className="h2" data-reveal>{c.heading}</h2>
          <p className="body mt-5" data-reveal>{c.body}</p>
          <form id="yours-form" className="mt-6 flex items-baseline gap-4" onSubmit={onSubmit}>
            <input
              ref={input}
              id="yours-input"
              type="text"
              name="sentence"
              className="yours-input mono"
              maxLength={VISITOR_MAX}
              placeholder={c.placeholder}
              aria-label={c.placeholder}
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="go"
            />
            <button type="submit" className="mono link yours-button">{c.button}</button>
          </form>
          <p className="mono ink-dim mt-3">{c.hint}</p>
          {glFailed ? <VisitorHouseSvg /> : null}
          <p ref={clock} id="yours-clock" hidden={glFailed} className="mono mt-4" aria-live="off" />
          <p ref={tag} id="yours-tag" hidden={glFailed} className="mono mt-1" aria-live="polite" />
        </Reveal>
      </div>
    </section>
  );
}
