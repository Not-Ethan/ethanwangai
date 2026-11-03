import localFont from 'next/font/local';
import './globals.css';
import type { Metadata } from 'next';
import { copy } from '@/site/copy';

const display = localFont({ src: './fonts/space-grotesk-latin-wght-normal.woff2', variable: '--font-display', weight: '300 700', display: 'swap' });
const mono = localFont({ src: './fonts/jetbrains-mono-latin-wght-normal.woff2', variable: '--font-mono', weight: '100 800', display: 'swap', adjustFontFallback: false });

export const metadata: Metadata = {
  title: copy.meta.title, description: copy.meta.description, metadataBase: new URL('https://ethanwang.ai'),
  openGraph: { title: copy.meta.title, description: copy.meta.description, url: 'https://ethanwang.ai', type: 'website', images: [{ url: '/og.png', width: 1200, height: 630 }] },
  twitter: { card: 'summary_large_image', title: copy.meta.title, description: copy.meta.description, images: ['/og.png'] },
};

// Runs before the body is parsed: with JS and without reduced motion the page starts hidden and the swarm reveals it
// (spec §7.3). Without JS the attribute is never set and everything is visible.
// If the app never hydrates (a blocked or failed bundle) the page shows itself after 6 s: Swarm.tsx sets swarmReady on mount.
const SWARM_SCRIPT = "(function(){try{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;var d=document.documentElement;d.dataset.swarm='on';setTimeout(function(){if(!d.dataset.swarmReady){delete d.dataset.swarm}},6000)}catch(e){}})()";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${mono.variable} ${display.variable}`} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: SWARM_SCRIPT }} />
        {children}
      </body>
    </html>
  );
}
