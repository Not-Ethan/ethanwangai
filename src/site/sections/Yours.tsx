'use client';
import { useRef, type FormEvent, type KeyboardEvent } from 'react';
import { copy } from '@/site/copy';
import { facts } from '@/site/facts';
import { SECTIONS } from '@/bench/sections';
import { MACHINE, type Tier } from '@/bench/types';
import { COUNTS } from '@/generated/counts';
import { useScroll } from '@/scroll/ScrollProvider';
import { Plate } from '@/site/Plate';

/** The section's live nodes. The sentence only ever reaches them as text: value, textContent and the mailto subject. */
export interface YoursDom {
  input: { value: string; blur(): void };
  echo: { textContent: string | null };
  plate: { textContent: string | null };
  mailto: { href: string };
}

/** The contact link, with the typed sentence as its subject; empty means 'hi ethan'. */
export function mailtoHref(text: string): string {
  return `mailto:${facts.links.email}?subject=${encodeURIComponent(copy.yours.mailSubject(text))}`;
}

/** Escape, the clear control or an empty Enter: the slot, the echo, the plate and the subject go back to empty. */
export function clearSentence(dom: YoursDom): void {
  dom.input.value = '';
  dom.echo.textContent = '';
  dom.plate.textContent = copy.yours.plateEmpty;
  dom.mailto.href = mailtoHref('');
  window.dispatchEvent(new CustomEvent('dbso:visitor:clear'));
}

/**
 * Enter: the sentence goes into #yours-echo for the ink sampler, to the scene (Clocks lays it out and builds it), and
 * into the mailto subject; on phones the keyboard closes and the page reframes on the slot. The plate prints the
 * layout's own counts once visitor.ts, which loads on demand in the scene's chunk, has laid the sentence out, unless
 * the echo has moved on to another sentence or a clear by then.
 */
export async function submitSentence(dom: YoursDom, tier: Tier, scrollTo: (id: string) => void): Promise<void> {
  const text = dom.input.value.trim();
  if (!text) { clearSentence(dom); return; }
  dom.echo.textContent = text;
  window.dispatchEvent(new CustomEvent('dbso:visitor:build', { detail: { text } }));
  dom.mailto.href = mailtoHref(text);
  if (tier === 'phone') { dom.input.blur(); scrollTo('yours'); }
  const { planVisitor } = await import('@/gl/visitor');
  const plan = planVisitor(text, tier);
  if (plan && dom.echo.textContent === text) dom.plate.textContent = copy.yours.plate(plan.words, plan.sentences, plan.result.counts.total);
}

export function Yours() {
  const { tier, scrollTo } = useScroll();
  const c = copy.yours;
  const input = useRef<HTMLInputElement>(null);
  const echo = useRef<HTMLSpanElement>(null);
  const plate = useRef<HTMLSpanElement>(null);
  const mail = useRef<HTMLAnchorElement>(null);
  const dom = (): YoursDom | null => (input.current && echo.current && plate.current && mail.current
    ? { input: input.current, echo: echo.current, plate: plate.current, mailto: mail.current }
    : null);
  const clear = () => { const d = dom(); if (d) clearSentence(d); };
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = dom();
    if (d) void submitSentence(d, tier, scrollTo);
  };
  // Escape that cancels an IME composition is the composition's, not a clear.
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape' && !e.nativeEvent.isComposing) { e.preventDefault(); clear(); }
  };
  const onInput = () => window.dispatchEvent(new CustomEvent('dbso:visitor:key'));

  return (
    <section id="yours" style={{ minHeight: `${SECTIONS[8].vh[tier]}vh` }} className="relative">
      <div className="grid min-h-[inherit] grid-cols-12 gap-4 px-4 pt-24 pb-16 md:px-12">
        <div className="col-span-12 md:col-span-5">
          <div className="copy-track">
            <div className="copy-col sticky top-24 md:top-28">
              <h2 className="h2" data-ink-source="yours" data-reveal>{c.heading}</h2>
              {/* Enter never navigates: the sentence is only ever text content, never HTML, never stored, and in no URL but
                  the mailto subject (spec §3.1 · 09). Enter builds it in the slot, Escape and the clear control clear it. */}
              <form id="yours-form" className="mt-8" onSubmit={onSubmit}>
                <label htmlFor="yours-input" className="mono pencil block">{c.label}</label>
                <div className="relative mt-2 flex items-baseline gap-4 border-b border-pencil">
                  <input
                    ref={input}
                    id="yours-input"
                    type="text"
                    maxLength={120}
                    placeholder={c.placeholder}
                    autoComplete="off"
                    spellCheck={false}
                    onInput={onInput}
                    onKeyDown={onKeyDown}
                    className="body w-full bg-transparent py-2 placeholder:text-pencil"
                  />
                  <button type="button" id="yours-clear" className="mono link" onClick={clear}>{c.clear}</button>
                  {/* The ink sampler's source for the visitor partition: an <input> has no glyph pixels it can read, so on
                      Enter submitSentence writes the sentence here as textContent (never HTML, never stored) and the
                      upload re-samples it. Same face and padding as the input and laid over its row, so the ink lifts from
                      where the visitor sees their words; opacity, not display:none, so it is laid out and Range rects
                      exist; out of flow so the column keeps its height; inert so the input under it stays clickable. */}
                  <span ref={echo} id="yours-echo" className="body absolute inset-0 py-2 opacity-0 pointer-events-none select-none break-words" aria-hidden="true" />
                </div>
              </form>
              <Plate machine={MACHINE.visitor}><span ref={plate} id="yours-plate">{c.plateEmpty}</span></Plate>
              <p className="mono pencil mt-2">{c.note}</p>
              <ul className="mt-8 space-y-1">
                <li><a ref={mail} id="mailto" className="font-mono text-2xl break-all md:text-3xl" href={mailtoHref('')}>{facts.links.email}</a></li>
                <li><a className="mono" href={facts.links.github.href} target="_blank" rel="noopener noreferrer">{facts.links.github.label}</a></li>
                <li><a className="mono" href={facts.links.linkedin.href} target="_blank" rel="noopener noreferrer">{facts.links.linkedin.label}</a></li>
                <li><a className="mono" href={facts.links.resume.href} target="_blank" rel="noopener noreferrer">{facts.links.resume.label}</a></li>
                <li className="mono pencil">{c.school}</li>
              </ul>
              {/* the bench's final inked total, which the SVG tier keeps (spec §11); hudSync counts it, with the
                  visitor's built parts, from the scene's first frame */}
              <footer className="mt-8"><p className="mono pencil" id="footer-total">{c.footer(COUNTS.desktop.inkedAtEnd)}</p></footer>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
