import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { THEME_SCRIPT } from '@/theme/themeScript';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { copy } from '@/site/copy';

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
  openGraph: { title: copy.meta.title, description: copy.meta.description, url: 'https://ethanwang.ai', type: 'website', images: ['/og.png'] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
