'use client';
import { useState } from 'react';
import { copy } from '@/site/copy';
import { facts } from '@/site/facts';
import { useScroll } from '@/scroll/ScrollProvider';
import { ThemeToggle } from './ThemeToggle';

export function Nav() {
  const { scrollTo } = useScroll();
  const [open, setOpen] = useState(false);
  const go = (id: string) => { setOpen(false); scrollTo(id); };
  return (
    <header className="fixed inset-x-0 top-0 z-40 flex items-start justify-between px-4 py-4 md:px-8">
      <button type="button" className="mono link" onClick={() => go('sentence')}>{copy.nav.home}</button>
      <nav aria-label="sections" className="hidden items-center gap-5 md:flex">
        {copy.nav.items.map((it) => (
          <button key={it.section} type="button" className="mono link" onClick={() => go(it.section)}>{it.label}</button>
        ))}
        <a className="mono" href={facts.links.resume.href} target="_blank" rel="noopener noreferrer">{copy.nav.resume}</a>
        <ThemeToggle />
      </nav>
      <div className="flex items-center gap-4 md:hidden">
        <a className="mono" href={facts.links.resume.href} target="_blank" rel="noopener noreferrer">{copy.nav.resume}</a>
        <button type="button" className="mono link" aria-expanded={open} onClick={() => setOpen(!open)}>{copy.nav.menu}</button>
      </div>
      {open && (
        <div className="fixed inset-0 z-30 flex flex-col justify-center gap-6 bg-paper px-6 md:hidden">
          {copy.nav.items.map((it) => (
            <button key={it.section} type="button" className="h2 text-left" onClick={() => go(it.section)}>{it.label}</button>
          ))}
          <ThemeToggle />
        </div>
      )}
    </header>
  );
}
