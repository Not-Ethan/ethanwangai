'use client';
import { copy } from '@/site/copy';
import { useScroll } from '@/scroll/ScrollProvider';

/** Fixed mono chrome (spec §3.1 nav, §9): home mark top-left, `kalshi · heron · darch · summers · contact` top-right. No resume link: the resume stays private. */
export function Nav() {
  const { scrollTo } = useScroll();
  const n = copy.nav;
  return (
    <header className="nav" data-still-hide="">
      <button type="button" className="mono link nav-home" onClick={() => scrollTo('open')}>{n.home}</button>
      <nav className="flex flex-wrap justify-end gap-x-2 gap-y-1">
        {n.items.map((it, k) => (
          <span key={it.section} className="flex items-center gap-2">
            <button type="button" className="mono link" onClick={() => scrollTo(it.section)}>{it.label}</button>
            {k < n.items.length - 1 && <span className="mono ink-dim nav-sep" aria-hidden="true">{n.separator}</span>}
          </span>
        ))}
      </nav>
    </header>
  );
}
