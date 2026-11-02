'use client';
import { useContext, useSyncExternalStore } from 'react';
import { SwarmContext } from './Swarm';
import { SERVER_SNAPSHOT, createSwarmStore, type LogLine, type SwarmSnapshot } from './swarmStore';

const fallbackStore = createSwarmStore();
const noop = (): void => {};

export type { LogLine };
export interface SwarmStats extends SwarmSnapshot { rebuild(): void }

export function useSwarmStats(): SwarmStats {
  const rt = useContext(SwarmContext);
  const store = rt?.store ?? fallbackStore;
  const snap = useSyncExternalStore(store.subscribe, store.get, () => SERVER_SNAPSHOT);
  return { ...snap, rebuild: rt?.rebuild ?? noop };
}

const subscribeNever = (): (() => void) => noop;
/** false on the server and during hydration, true afterwards. */
export function useMounted(): boolean {
  return useSyncExternalStore(subscribeNever, () => true, () => false);
}
