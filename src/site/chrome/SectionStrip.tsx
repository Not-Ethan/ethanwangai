import { copy } from '@/site/copy';
import { SECTIONS } from '@/bench/sections';

/**
 * Section rail: one line of nine items rotated up the left edge (`.section-rail` in globals.css
 * places it; phones hide it). Stage 6 toggles `.is-current` on the item whose section is on screen.
 */
export function SectionStrip() {
  return (
    <ol id="section-strip" className="section-rail mono z-40 hidden md:block" aria-label="progress">
      {SECTIONS.map((s, i) => (
        <li key={s.id} data-strip={s.id} className="transition-colors">
          {i > 0 && <span aria-hidden="true" className="pencil">{' · '}</span>}
          {copy.chrome.strip[i]}
        </li>
      ))}
    </ol>
  );
}
