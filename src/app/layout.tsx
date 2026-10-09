import localFont from 'next/font/local';
import './globals.css';
import type { Metadata } from 'next';
import { copy } from '@/site/copy';

// Archivo variable and JetBrains Mono variable, self-hosted (spec §9). One dark theme, no theme script (spec §2).
const display = localFont({
  src: './fonts/archivo-latin-wght-normal.woff2', variable: '--font-display', weight: '100 900', display: 'swap', adjustFontFallback: 'Arial',
});
const mono = localFont({
  src: './fonts/jetbrains-mono-latin-wght-normal.woff2', variable: '--font-mono', weight: '100 800', display: 'swap', adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: copy.meta.title,
  description: copy.meta.description,
  metadataBase: new URL('https://ethanwang.ai'),
  openGraph: { title: copy.meta.title, description: copy.meta.description, url: 'https://ethanwang.ai', type: 'website' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
