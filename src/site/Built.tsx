'use client';
import { createElement, useCallback, useContext, type ReactNode } from 'react';
import { SwarmContext } from '@/swarm/Swarm';

export type BuiltTag = 'div' | 'section' | 'header' | 'footer' | 'nav' | 'ul' | 'ol' | 'li' | 'p' | 'h1' | 'h2' | 'article' | 'a' | 'span';
export interface BuiltProps { name: string; as?: BuiltTag; className?: string; id?: string; href?: string; prompt?: string; label?: string; tabIndex?: number; children?: ReactNode }

/** A thing the agents build. Registers with the swarm; carries data-build. Never nest one inside another. */
export function Built({ name, as = 'div', className, id, href, prompt, label, tabIndex, children }: BuiltProps) {
  const swarm = useContext(SwarmContext);
  // React 19 ref callback with a cleanup: registers on attach, unregisters on detach. The swarm's runtime exists from render, so this works before its own effect runs.
  const ref = useCallback((el: HTMLElement | null) => (el && swarm ? swarm.register(el, name) : undefined), [swarm, name]);
  return createElement(as, { ref, 'data-build': name, 'data-prompt': prompt, 'aria-label': label, tabIndex, className, id, href }, children);
}
