export interface LogLine { id: number; agent: number; name: string; /** what the agent was told to build (data-prompt), else the name */ prompt: string; seconds: number }
export interface SwarmSnapshot { on: boolean; agents: number; built: number; total: number; log: readonly LogLine[]; busy: boolean; reduced: boolean }

/** What the server renders and what the client's first render must also see (hydration). */
export const SERVER_SNAPSHOT: SwarmSnapshot = Object.freeze({ on: false, agents: 6, built: 0, total: 43, log: Object.freeze([] as LogLine[]), busy: false, reduced: false });

export interface SwarmStore {
  get(): SwarmSnapshot;
  subscribe(fn: () => void): () => void;
  set(partial: Partial<SwarmSnapshot>): void;
}

/** A tiny external store for useSyncExternalStore. `set` replaces the snapshot object and notifies; no-op if nothing changed. */
export function createSwarmStore(): SwarmStore {
  let snap: SwarmSnapshot = SERVER_SNAPSHOT;
  const listeners = new Set<() => void>();
  return {
    get: () => snap,
    subscribe(fn) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    set(partial) {
      const next = { ...snap, ...partial };
      if ((Object.keys(next) as (keyof SwarmSnapshot)[]).every((k) => next[k] === snap[k])) return;
      snap = next;
      listeners.forEach((fn) => fn());
    },
  };
}
