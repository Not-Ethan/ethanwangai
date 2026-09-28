'use client';
import { copy } from '@/site/copy';
import { facts } from '@/site/facts';
import { SECTIONS } from '@/bench/sections';
import { MACHINE } from '@/bench/types';
import { useScroll } from '@/scroll/ScrollProvider';
import { Plate } from '@/site/Plate';

export function Yours() {
  const { tier } = useScroll();
  const c = copy.yours;
  // Stage 5 rewrites the subject live from the typed sentence; empty means 'hi ethan'.
  const mailto = `mailto:${facts.links.email}?subject=${encodeURIComponent(c.mailSubject(''))}`;
  return (
    <section id="yours" style={{ minHeight: `${SECTIONS[8].vh[tier]}vh` }} className="relative">
      <div className="grid grid-cols-12 gap-4 px-4 pt-24 pb-16 md:px-8">
        <div className="col-span-12 md:col-span-5">
          <h2 className="h2" data-ink-source="yours" data-reveal>{c.heading}</h2>
          {/* Enter never submits: the sentence is only ever text content, never in a URL (spec §3.1 · 09). Stage 5 owns Enter/Escape. */}
          <form id="yours-form" className="mt-8" onSubmit={(e) => e.preventDefault()}>
            <label htmlFor="yours-input" className="mono pencil block">{c.label}</label>
            <div className="mt-2 flex items-baseline gap-4 border-b border-pencil">
              <input
                id="yours-input"
                type="text"
                maxLength={120}
                placeholder={c.placeholder}
                autoComplete="off"
                spellCheck={false}
                className="body w-full bg-transparent py-2 placeholder:text-pencil"
              />
              <button type="button" id="yours-clear" className="mono link">{c.clear}</button>
            </div>
          </form>
          <Plate machine={MACHINE.visitor}><span id="yours-plate">{c.plateEmpty}</span></Plate>
          <p className="mono pencil mt-2">{c.note}</p>
          <ul className="mt-12 space-y-2">
            <li><a id="mailto" className="font-mono text-2xl break-all md:text-3xl" href={mailto}>{facts.links.email}</a></li>
            <li><a className="mono" href={facts.links.github.href} target="_blank" rel="noopener noreferrer">{facts.links.github.label}</a></li>
            <li><a className="mono" href={facts.links.linkedin.href} target="_blank" rel="noopener noreferrer">{facts.links.linkedin.label}</a></li>
            <li><a className="mono" href={facts.links.resume.href} target="_blank" rel="noopener noreferrer">{facts.links.resume.label}</a></li>
            <li className="mono pencil">{c.school}</li>
          </ul>
          {/* 0 is a placeholder; Stage 3/5 write generated inked total + visitor parts here */}
          <footer className="mt-16"><p className="mono pencil" id="footer-total">{c.footer(0)}</p></footer>
        </div>
      </div>
    </section>
  );
}
