'use client';
import { useTheme } from '@/theme/ThemeProvider';
import { copy } from '@/site/copy';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const next = theme === 'dark' ? copy.nav.theme.light : copy.nav.theme.dark;
  return (
    <button type="button" className="mono link" onClick={toggle} aria-label={copy.nav.theme.ariaLabel(next)}>
      {next}
    </button>
  );
}
