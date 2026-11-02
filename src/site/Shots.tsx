// The four drawn schematics for the work cases (spec §6.7). The words inside are decoration, not site copy.
const INK = 'rgba(22,22,22,.6)';
const YEL = '#facc00';
const FONT = 'var(--font-mono), ui-monospace, monospace';

const BIDS = [120, 96, 150, 72, 132, 60, 110, 84];
const ASKS = [84, 140, 66, 118, 52, 126, 90, 108];
const SPARK = [0, -6, -2, -8, -4, 3, 6, 1, -3, 5, 8, 2];

function Book() {
  const pts = SPARK.map((v, i) => `${40 + i * (400 / 11)},${250 + v}`).join(' ');
  return (
    <>
      <line x1="240" y1="24" x2="240" y2="236" stroke="#161616" strokeWidth="1.5" />
      {BIDS.map((w, i) => (
        <g key={i}>
          <rect x={240 - 6 - w} y={34 + i * 28} width={w} height="14" rx="2" fill={INK} />
          <rect x={246} y={34 + i * 28} width={ASKS[i]} height="14" rx="2" fill={YEL} />
        </g>
      ))}
      <polyline points={pts} fill="none" stroke="#161616" strokeWidth="1.5" strokeLinejoin="round" />
    </>
  );
}

function Tab() {
  return (
    <>
      <rect x="90" y="20" width="300" height="230" rx="12" fill="#fff" stroke="#161616" strokeWidth="2" />
      <g fontFamily={FONT} fontSize="13" fill="#161616">
        <text x="114" y="56" fontWeight="700">heron bar tab</text>
        <text x="114" y="88">2 pints · 14.00</text>
        <text x="114" y="116">wings · 12.00</text>
        <text x="114" y="144">home team won · yes</text>
      </g>
      <rect x="108" y="160" width="140" height="28" rx="14" fill="#161616" />
      <text x="124" y="179" fontFamily={FONT} fontSize="13" fill={YEL}>drinks · free</text>
      <line x1="108" y1="208" x2="372" y2="208" stroke="rgba(22,22,22,.2)" strokeWidth="1" strokeDasharray="4 4" />
      <text x="114" y="232" fontFamily={FONT} fontSize="11" fill="rgba(22,22,22,.6)">hedged on kalshi ✓</text>
    </>
  );
}

function Grid() {
  const tiles = Array.from({ length: 12 }, (_, i) => ({ x: 40 + (i % 4) * 108, y: 30 + Math.floor(i / 4) * 66, hot: i === 5 }));
  return (
    <>
      {tiles.map((t, i) => (
        <g key={i}>
          <rect x={t.x} y={t.y} width="96" height="54" rx="4" fill={t.hot ? YEL : 'rgba(22,22,22,.08)'} />
          <path
            d={`M${t.x + 43} ${t.y + 22} L${t.x + 43} ${t.y + 32} L${t.x + 53} ${t.y + 27} Z`}
            fill={t.hot ? '#161616' : INK}
          />
        </g>
      ))}
      <rect x="40" y="246" width="400" height="6" rx="3" fill="rgba(22,22,22,.12)" />
      <rect x="40" y="246" width="248" height="6" rx="3" fill={INK} />
    </>
  );
}

function Chat() {
  return (
    <>
      <rect x="40" y="30" width="400" height="210" rx="10" fill="#fff" stroke="#161616" strokeWidth="2" />
      <line x1="40" y1="58" x2="440" y2="58" stroke="#161616" strokeWidth="2" />
      {[0, 1, 2].map((i) => <circle key={i} cx={58 + i * 16} cy="44" r="4" fill={i === 0 ? YEL : 'rgba(22,22,22,.25)'} />)}
      <rect x="230" y="74" width="190" height="34" rx="12" fill="rgba(22,22,22,.08)" />
      <text x="244" y="95" fontFamily={FONT} fontSize="12" fill="#161616">{"where's the vpn doc?"}</text>
      <rect x="60" y="124" width="280" height="38" rx="12" fill="#fff" stroke="#161616" strokeWidth="1.5" />
      <text x="74" y="147" fontFamily={FONT} fontSize="12" fill="#161616">{"it-handbook, section 4. here's the link."}</text>
      <rect x="60" y="176" width="176" height="24" rx="12" fill={YEL} />
      <text x="74" y="192" fontFamily={FONT} fontSize="11" fill="#161616">cited: it-handbook.pdf</text>
    </>
  );
}

export function Shot({ kind }: { kind: 'book' | 'tab' | 'grid' | 'chat' }) {
  return (
    <svg viewBox="0 0 480 270" className="shot" aria-hidden="true">
      <rect x="0.5" y="0.5" width="479" height="269" rx="10" fill="#fbfaf6" stroke="rgba(22,22,22,.12)" />
      {kind === 'book' && <Book />}
      {kind === 'tab' && <Tab />}
      {kind === 'grid' && <Grid />}
      {kind === 'chat' && <Chat />}
    </svg>
  );
}
