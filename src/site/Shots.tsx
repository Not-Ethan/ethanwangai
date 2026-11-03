import type { CSSProperties } from 'react';

// The four drawn schematics for the work cases (spec §6.7). No made-up UI text: line items are bars; colours are the site tokens.
const INK = 'var(--ink)';
const YEL = 'var(--accent)';
const HAIR = 'color-mix(in srgb, var(--ink) 8%, transparent)';
const HAIR2 = 'color-mix(in srgb, var(--ink) 20%, transparent)';
const FONT = 'var(--font-mono), ui-monospace, monospace';

const BIDS = [120, 96, 150, 72, 132, 60, 110, 84];
const ASKS = [84, 140, 66, 118, 52, 126, 90, 108];
const SPARK = [0, -6, -2, -8, -4, 3, 6, 1, -3, 5, 8, 2];

// Three bars breathe (scale on x, loops in globals.css): two bids anchored on the centre line, one ask.
const BREATH: Record<number, { cls: string; style: CSSProperties }> = {
  0: { cls: 'breath breath--bid', style: { animationDuration: '2.6s' } },
  4: { cls: 'breath breath--bid', style: { animationDuration: '3.4s' } },
  9: { cls: 'breath breath--ask', style: { animationDuration: '3s' } },
};

function Book() {
  const pts = SPARK.map((v, i) => `${40 + i * (400 / 11)},${256 + v * 0.75}`).join(' ');
  return (
    <>
      <line x1="240" y1="24" x2="240" y2="236" stroke="var(--ink)" strokeWidth="1.5" />
      {BIDS.map((w, i) => (
        <g key={i}>
          <rect x={240 - 6 - w} y={34 + i * 28} width={w} height="14" rx="2" fill={INK} className={BREATH[i]?.cls} style={BREATH[i]?.style} />
          <rect x={246} y={34 + i * 28} width={ASKS[i]} height="14" rx="2" fill={YEL} className={BREATH[i + 8]?.cls} style={BREATH[i + 8]?.style} />
        </g>
      ))}
      <polyline points={pts} fill="none" stroke="var(--ink)" strokeWidth="1.5" strokeLinejoin="round" />
    </>
  );
}

function Tab() {
  return (
    <>
      <rect x="90" y="20" width="300" height="230" rx="12" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2" />
      <rect x="114" y="46" width="104" height="10" rx="3" fill={INK} />
      <rect x="114" y="80" width="150" height="8" rx="3" fill={HAIR2} />
      <rect x="114" y="108" width="120" height="8" rx="3" fill={HAIR2} />
      <rect x="114" y="136" width="136" height="8" rx="3" fill={HAIR2} />
      <g className="pulse">
        <rect x="108" y="160" width="140" height="28" rx="14" fill="var(--ink)" />
        <text x="124" y="179" fontFamily={FONT} fontSize="13" fill={YEL}>drinks · free</text>
      </g>
      <line x1="108" y1="208" x2="372" y2="208" stroke={HAIR2} strokeWidth="1" strokeDasharray="4 4" />
      <rect x="108" y="216" width="64" height="22" rx="11" fill={HAIR} stroke={HAIR2} />
      <text x="140" y="231" textAnchor="middle" fontFamily={FONT} fontSize="11" fill="var(--ink)">hedged</text>
    </>
  );
}

function Grid() {
  const tiles = Array.from({ length: 12 }, (_, i) => ({ x: 30 + (i % 4) * 108, y: 30 + Math.floor(i / 4) * 66, hot: i === 5 }));
  return (
    <>
      {tiles.map((t, i) => (
        <g key={i}>
          <rect x={t.x} y={t.y} width="96" height="54" rx="4" fill={t.hot ? YEL : HAIR} />
          <path
            d={`M${t.x + 43} ${t.y + 22} L${t.x + 43} ${t.y + 32} L${t.x + 53} ${t.y + 27} Z`}
            fill={t.hot ? 'var(--ink)' : INK}
          />
        </g>
      ))}
      <rect x="30" y="246" width="420" height="6" rx="3" fill={HAIR} />
      <rect x="30" y="246" width="168" height="6" rx="3" fill={INK} className="crawl" />
    </>
  );
}

function Chat() {
  return (
    <>
      <rect x="40" y="30" width="400" height="210" rx="10" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2" />
      <line x1="40" y1="58" x2="440" y2="58" stroke="var(--ink)" strokeWidth="2" />
      {[0, 1, 2].map((i) => <circle key={i} cx={58 + i * 16} cy="44" r="4" fill={i === 0 ? YEL : HAIR2} />)}
      <rect x="230" y="74" width="190" height="34" rx="12" fill={HAIR} />
      <rect x="244" y="87" width="120" height="8" rx="3" fill={HAIR2} />
      <rect x="60" y="124" width="316" height="38" rx="12" fill="var(--surface)" stroke="var(--ink)" strokeWidth="1.5" />
      <rect x="74" y="139" width="210" height="8" rx="3" fill={HAIR2} />
      <rect x="364" y="135" width="6" height="15" fill="var(--ink)" className="caret" />
      <rect x="60" y="176" width="64" height="24" rx="12" fill={YEL} />
      <text x="74" y="192" fontFamily={FONT} fontSize="11" fill="var(--ink)">cited</text>
    </>
  );
}

export function Shot({ kind }: { kind: 'book' | 'tab' | 'grid' | 'chat' }) {
  return (
    <svg viewBox="0 0 480 270" className={`shot shot--${kind}`} aria-hidden="true">
      <rect x="0.5" y="0.5" width="479" height="269" rx="10" fill="var(--canvas)" stroke="color-mix(in srgb, var(--ink) 12%, transparent)" />
      {kind === 'book' && <Book />}
      {kind === 'tab' && <Tab />}
      {kind === 'grid' && <Grid />}
      {kind === 'chat' && <Chat />}
    </svg>
  );
}
