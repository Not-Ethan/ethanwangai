import { createElement, type ReactNode } from 'react';
export type BuiltTag = 'div' | 'section' | 'header' | 'footer' | 'nav' | 'ul' | 'ol' | 'li' | 'p' | 'h1' | 'h2' | 'article' | 'a' | 'span';
export interface BuiltProps { name: string; as?: BuiltTag; className?: string; id?: string; href?: string; children?: ReactNode }
/** A thing the agents build. Task 4 gives it behaviour; until then it only carries data-build. */
export function Built({ name, as = 'div', className, id, href, children }: BuiltProps) {
  return createElement(as, { 'data-build': name, className, id, href }, children);
}
