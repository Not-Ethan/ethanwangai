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

function Board() {
  const C = 36, G = 6, P = C + G, X0 = 30, Y0 = 33;
  const cx = (c: number) => X0 + c * P;
  const cy = (r: number) => Y0 + r * P;
  const cells = Array.from({ length: 30 }, (_, i) => ({ x: cx(i % 6), y: cy(Math.floor(i / 6)) }));
  // walls sit in the gaps: horizontal bars span two cells in a row gap, vertical bars span two cells in a column gap.
  const hw = [{ c: 1, r: 1 }, { c: 3, r: 3 }];
  const vw = [{ c: 3, r: 0 }, { c: 1, r: 3 }];
  return (
    <>
      {cells.map((t, i) => <rect key={i} x={t.x} y={t.y} width={C} height={C} rx="3" fill={HAIR} />)}
      <circle cx={cx(2) + C / 2} cy={cy(0) + C / 2} r="12" fill={INK} />
      <circle cx={cx(2) + C / 2} cy={cy(4) + C / 2} r="12" fill={YEL} stroke="var(--ink)" strokeWidth="1.5" className="step" />
      {hw.map((w, i) => <rect key={`h${i}`} x={cx(w.c)} y={cy(w.r) + C + G / 2 - 3} width={2 * C + G} height="6" rx="3" fill={INK} />)}
      {vw.map((w, i) => <rect key={`v${i}`} x={cx(w.c) - G / 2 - 3} y={cy(w.r)} width="6" height={2 * C + G} rx="3" fill={INK} />)}
      <text x="312" y="108" fontFamily={FONT} fontSize="12" fill={INK}>who wins · walls 0 to 10</text>
      {Array.from({ length: 11 }, (_, i) => <rect key={i} x={312 + i * 13} y={118} width="11" height="11" rx="2" fill={i < 4 ? INK : YEL} />)}
      <text x="312" y="152" fontFamily={FONT} fontSize="12" fill={INK}>6×5 · solved</text>
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
      <rect x="24" y="16" width="432" height="238" rx="10" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2" />
      <line x1="24" y1="44" x2="456" y2="44" stroke="var(--ink)" strokeWidth="2" />
      {[0, 1, 2].map((i) => <circle key={i} cx={42 + i * 16} cy="30" r="4" fill={i === 0 ? YEL : HAIR2} />)}
      <rect x="250" y="58" width="190" height="30" rx="12" fill={HAIR} />
      <rect x="264" y="69" width="120" height="8" rx="3" fill={HAIR2} />
      <rect x="40" y="100" width="340" height="52" rx="12" fill="var(--surface)" stroke="var(--ink)" strokeWidth="1.5" />
      <rect x="56" y="114" width="250" height="8" rx="3" fill={HAIR2} />
      <rect x="56" y="130" width="180" height="8" rx="3" fill={HAIR2} />
      <rect x="242" y="128" width="6" height="12" fill="var(--ink)" className="caret" />
      <rect x="40" y="162" width="64" height="24" rx="12" fill={YEL} />
      <text x="54" y="178" fontFamily={FONT} fontSize="11" fill="var(--ink)">cited</text>
      <rect x="290" y="204" width="150" height="30" rx="12" fill={HAIR} />
      <rect x="304" y="215" width="90" height="8" rx="3" fill={HAIR2} />
    </>
  );
}

export function Shot({ kind }: { kind: 'book' | 'board' | 'grid' | 'chat' }) {
  return (
    <svg viewBox="0 0 480 270" className={`shot shot--${kind}`} aria-hidden="true">
      <rect x="0.5" y="0.5" width="479" height="269" rx="10" fill="var(--canvas)" stroke="color-mix(in srgb, var(--ink) 12%, transparent)" />
      {kind === 'book' && <Book />}
      {kind === 'board' && <Board />}
      {kind === 'grid' && <Grid />}
      {kind === 'chat' && <Chat />}
    </svg>
  );
}
