import { copy } from '@/site/copy';

/**
 * The ignition labels (spec §3.1 · 01) as the static list the no-WebGL tier shows under the deck (spec §11), in chain
 * order. Stage 2 adds the projected label spans positioned from the driver; this list stays as the fallback.
 */
export function Labels() {
  return (
    <ul className="mono ink-dim mt-6 flex flex-col gap-1" data-labels>
      {Object.entries(copy.open.labels).map(([key, text]) => (
        <li key={key} data-label={key}>{text}</li>
      ))}
    </ul>
  );
}
