import { copy } from '@/site/copy';

/** The ratio ladder under the deck. Static now; Stage 3 drives lines, parts and running from the scene. */
export function Ladder({ words }: { words: number }) {
  const l = copy.sentence.ladder;
  return (
    <p className="mono mt-5 flex flex-wrap gap-x-2" aria-hidden="false">
      <span><b id="ladder-words">{words}</b> {l.words}</span><span className="pencil">·</span>
      <span><b id="ladder-lines">0</b> {l.lines}</span><span className="pencil">·</span>
      <span><b id="ladder-parts">0</b> {l.parts}</span><span className="pencil">·</span>
      <span>{l.running} <b id="ladder-running">00:00:00</b></span>
    </p>
  );
}
