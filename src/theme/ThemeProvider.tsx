'use client';
import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import type { ThemeName } from './palettes';

interface ThemeCtx { theme: ThemeName; setTheme: (t: ThemeName) => void; toggle: () => void }
const Ctx = createContext<ThemeCtx | null>(null);

function read(): ThemeName {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

/** Subscribes to the same `themechange` event GL listens for, so React and GL never disagree. */
function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener('themechange', onStoreChange);
  return () => window.removeEventListener('themechange', onStoreChange);
}

function getServerSnapshot(): ThemeName {
  return 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // useSyncExternalStore (not state+effect) keeps SSR's 'light' snapshot on the
  // hydration pass, then syncs to the DOM's real data-theme without a
  // setState-in-effect render cascade.
  const theme = useSyncExternalStore(subscribe, read, getServerSnapshot);
  const setTheme = useCallback((t: ThemeName) => {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('theme', t); } catch {}
    window.dispatchEvent(new CustomEvent('themechange', { detail: t }));
  }, []);
  const toggle = useCallback(() => setTheme(read() === 'dark' ? 'light' : 'dark'), [setTheme]);
  const value = useMemo(() => ({ theme, setTheme, toggle }), [theme, setTheme, toggle]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTheme outside ThemeProvider');
  return ctx;
}
