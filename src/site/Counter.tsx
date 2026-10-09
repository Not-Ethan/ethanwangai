import { copy } from '@/site/copy';
import { facts } from '@/valley/facts';

/**
 * The ridge counter (spec §3.1 · 02), under the ridge figure. Static at the full count for now, which is also what
 * the no-WebGL tier shows. Stage 3 writes the live value into this node from the driver (round(reveal × trades / 10)
 * × 10, capped at the fact) and adds the digit scramble.
 */
export function Counter() {
  return <p className="mono ink-dim mt-2" data-counter>{copy.kalshi.counter(facts.kalshi.trades)}</p>;
}
