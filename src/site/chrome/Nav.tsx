'use client';
import { useEffect, useState } from 'react';
import { copy } from '@/site/copy';
import { facts } from '@/site/facts';
import { useScroll } from '@/scroll/ScrollProvider';
import { ThemeToggle } from './ThemeToggle';

/**
 * Site chrome. On phones the section links live in a full-screen overlay behind `menu`.
 * The header is `fixed z-40`, so it is its own stacking context: the overlay is rendered
 * first with no z-index of its own, and the controls that must stay tappable over it
 * (home, resume, menu) are `relative z-10`. `menu` therefore both opens and closes it;
 * Escape closes it too. `defaultOpen` is the uncontrolled initial state. The header is a solid paper band the full
 * width and its own height, no border, so copy scrolling under it is hidden rather than crossing the nav's text.
 */
export function Nav({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const { scrollTo } = useScroll();
  const [open, setOpen] = useState(defaultOpen);
  const go = (id: string) => { setOpen(false); scrollTo(id); };
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  return (
    <header className="fixed inset-x-0 top-0 z-40 flex items-start justify-between bg-paper px-4 py-4 md:px-8">
      {open && (
        <div className="fixed inset-0 flex flex-col justify-center gap-6 bg-paper px-6 md:hidden">
          {copy.nav.items.map((it) => (
            <button key={it.section} type="button" className="h2 text-left" onClick={() => go(it.section)}>{it.label}</button>
          ))}
          <ThemeToggle />
        </div>
      )}
      <button type="button" className="mono link relative z-10" onClick={() => go('sentence')}>{copy.nav.home}</button>
      <nav aria-label="sections" className="hidden items-center gap-5 md:flex">
        {copy.nav.items.map((it) => (
          <button key={it.section} type="button" className="mono link" onClick={() => go(it.section)}>{it.label}</button>
        ))}
        <a className="mono" href={facts.links.resume.href} target="_blank" rel="noopener noreferrer">{copy.nav.resume}</a>
        <ThemeToggle />
      </nav>
      <div className="relative z-10 flex items-center gap-4 md:hidden">
        <a className="mono" href={facts.links.resume.href} target="_blank" rel="noopener noreferrer">{copy.nav.resume}</a>
        <button type="button" className="mono link" aria-expanded={open} onClick={() => setOpen(!open)}>{copy.nav.menu}</button>
      </div>
    </header>
  );
}
