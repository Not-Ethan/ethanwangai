'use client';
import type { FormEvent } from 'react';
import { copy } from '@/site/copy';
import { SECTIONS } from '@/valley/sections';
import { Reveal } from '@/site/Reveal';

const HEIGHT_VH = SECTIONS.find((s) => s.id === 'yours')?.heightVh ?? 100;

/** 07 · yours (spec §3.1): one sentence, max 140 characters. Enter or `build` submits; Stage 4 builds the house. */
export function Yours() {
  const c = copy.yours;
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };
  return (
    <section id="yours" className="section" style={{ minHeight: `${HEIGHT_VH}vh` }}>
      <div className="section-grid">
        <Reveal className="copy-col scrim">
          <h2 className="h2" data-reveal>{c.heading}</h2>
          <p className="body mt-5" data-reveal>{c.body}</p>
          <form id="yours-form" className="mt-6 flex items-end gap-4" onSubmit={onSubmit}>
            <input
              id="yours-input"
              type="text"
              name="sentence"
              className="yours-input mono"
              maxLength={c.maxLength}
              placeholder={c.placeholder}
              aria-label={c.placeholder}
              autoComplete="off"
              spellCheck={false}
            />
            <button type="submit" className="mono link">{c.button}</button>
          </form>
          <p className="mono ink-dim mt-3">{c.hint}</p>
        </Reveal>
      </div>
    </section>
  );
}
