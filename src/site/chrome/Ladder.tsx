import { MACHINE } from '@/bench/types';
import { BAND_ROWS, PARTITION } from '@/gl/inkGeometry';
import { COUNTS } from '@/generated/counts';
import { copy } from '@/site/copy';

// The final counts, which the server renders and the SVG tier keeps (spec §11): every row the quoter's band prints,
// and the quoter's parts with the intake 04 adds. hudSync writes the scene's own counts over them from its first frame.
const FINAL_LINES = BAND_ROWS[PARTITION.quoter];
const FINAL_PARTS = COUNTS.desktop.byMachine[MACHINE.quoter] + COUNTS.desktop.byMachine[MACHINE.intake];

/** The ratio ladder under the deck; hudSync drives lines, parts and running from the scene while it is live. */
export function Ladder({ words }: { words: number }) {
  const l = copy.sentence.ladder;
  return (
    <p className="ladder mono mt-5 flex flex-wrap gap-x-2" aria-hidden="false">
      <span><b id="ladder-words">{words}</b> {l.words}</span><span className="pencil">·</span>
      <span><b id="ladder-lines">{FINAL_LINES}</b> {l.lines}</span><span className="pencil">·</span>
      <span><b id="ladder-parts">{FINAL_PARTS.toLocaleString('en-US')}</b> {l.parts}</span><span className="pencil">·</span>
      <span>{l.running} <b id="ladder-running">00:00:00</b></span>
    </p>
  );
}
