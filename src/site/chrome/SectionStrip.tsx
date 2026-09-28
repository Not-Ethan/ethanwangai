import { copy } from '@/site/copy';
import { SECTIONS } from '@/bench/sections';

export function SectionStrip() {
  return (
    <ol id="section-strip" className="mono pencil fixed bottom-4 left-4 z-40 hidden flex-col gap-1 md:flex" aria-label="progress">
      {SECTIONS.map((s, i) => (
        <li key={s.id} data-strip={s.id} className="transition-colors">{copy.chrome.strip[i]}</li>
      ))}
    </ol>
  );
}
