'use client';
import { copy, RESUME_HREF } from '@/site/copy';
import { useScroll } from '@/scroll/ScrollProvider';

/** Fixed mono chrome (spec §3.1 nav, §9): home mark top-left, `kalshi · heron · darch · summers · contact · resume` top-right. */
export function Nav() {
  const { scrollTo } = useScroll();
  const n = copy.nav;
  return (
    <header className="nav">
      <button type="button" className="mono link" onClick={() => scrollTo('open')}>{n.home}</button>
      <nav className="flex items-center gap-2">
        {n.items.map((it) => (
          <span key={it.section} className={it.section === 'contact' ? 'flex items-center gap-2' : 'hidden items-center gap-2 md:flex'}>
            <button type="button" className="mono link" onClick={() => scrollTo(it.section)}>{it.label}</button>
            <span className="mono ink-dim" aria-hidden="true">{n.separator}</span>
          </span>
        ))}
        <a className="mono link" href={RESUME_HREF} target="_blank" rel="noopener noreferrer">{n.resume}</a>
      </nav>
    </header>
  );
}
