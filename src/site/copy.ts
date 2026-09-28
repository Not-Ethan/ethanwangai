import { facts as f } from './facts';

export const copy = {
  meta: {
    title: 'ethan wang',
    description: 'now is the best time in history to build things. so i build a lot of them. they run on their own.',
  },
  nav: {
    items: [
      { label: 'kalshi', section: 'kalshi' },
      { label: 'heron', section: 'heron' },
      { label: 'darch', section: 'darch' },
      { label: 'summers', section: 'summers' },
      { label: 'contact', section: 'yours' },
    ],
    resume: 'resume',
    menu: 'menu',
    theme: { light: 'light', dark: 'dark', ariaLabel: (name: string) => `switch to ${name} theme` },
    home: 'ethan wang',
  },
  sentence: {
    headline: 'now is the best time in history to build things.',
    inkFrom: 'build things',                // the words the ink lifts from
    deck: 'so i build a lot of them. they run on their own.',
    deckProven: 'this page is one of them.', // appended only when 60 fps is proven (Stage 6)
    ladder: { words: 'words', lines: 'lines', parts: 'parts', running: 'running' },
    plate: 'fig. 1 — the quoter. built from the sentence above.',
    rebuild: 'rebuild',
    honesty: 'seeded model of the strategy. not live data.',
    scrollCue: 'scroll',
  },
  more: {
    lines: [
      'people made languages higher and higher level so you could do more with less.',
      "that's the peak.",
      'now a few sentences of plain english turn into thousands of lines of code.',
      'what used to take a year takes an afternoon.',
    ],
    rungs: ['bits', 'machine code', 'c', 'python', 'a library', 'a sentence'],
  },
  first: {
    lines: [
      'the little one in the corner has been running since you got here.',
      'the first thing i built that people actually used was a discord bot. seventh grade. my classmates.',
      'i never really liked the coding. i liked watching it run.',
    ],
    // parts is a live count (MachineSummary.count for the bot machine), never hand-typed.
    plate: (parts: number) => `fig. 0 — v0. ${parts} ${parts === 1 ? 'part' : 'parts'}. still pinging.`,
  },
  kalshi: {
    heading: 'a trading algo i wrote climbed into the top 100 in the world on kalshi.',
    body: "it quotes crypto combos and arbs across kalshi's crypto markets. python, a multi-terabyte research set, order management, risk, reconciliation, monitoring. it runs without me.",
    figures: [
      { value: f.kalshi.trades, label: f.kalshi.tradesLabel },
      { value: f.kalshi.contracts, label: f.kalshi.contractsLabel },
      { value: f.kalshi.rank, label: f.kalshi.rankLabel },
    ],
    asOf: f.asOf,
    status: f.kalshi.since,
    plate: 'fig. 1 — the quoter. quoting.',
    plateIntake: 'fig. 1b — intake. risk, reconciliation, monitoring.',
    honesty: 'seeded model of the strategy. not live data.',
    readout: { market: 'market', bid: 'bid', ask: 'ask', fills: 'fills' },
  },
  heron: {
    heading: 'if the home team wins tonight, your drinks are free.',
    body: `the bar doesn't eat that. heron prices the promo, carries the liability, and hedges it on prediction markets. co-founded it this summer. bars signed in ${f.heron.cities} cities.`,
    mono: `co-founder · ${f.heron.year}`,
    plate: 'fig. 2 — the balance. tips, levels, clears.',
  },
  darch: {
    heading: `${f.darch.jobs} videos a month. ${f.darch.people} people.`,
    body: `darch was a video pipeline. jobs in one end, clips out the other, nobody touching it. i ran engineering. ${f.darch.margins} margins.`,
    mono: `co-founder, eng lead · ${f.darch.years} · python, fastapi, node, ffmpeg`,
    plate: 'fig. 3 — the splitter. 1 in, 12 out.',
  },
  summers: {
    heading: 'some machines just watch.',
    wvu: `wvu medicine: anomaly detection over a pharmacy doing ${f.wvu.claims} of claims a year. a spike in denials shows up as a spike. the model is going into production.`,
    nist: 'nist: a rag help-desk assistant and structured logging in an open webui fork.',
    orbit: 'orbit: semantic search over saved text, audio and video. won most innovative use of technology at tartanhacks 2025.',
    plate: 'fig. 4 — the watch.',
  },
  alive: {
    lines: [
      "i've always loved building things. the best part is watching something i made come alive and keep going without me.",
      "the world doesn't need one more guy who dreams in code. it needs people who've seen enough different things to spot the openings.",
      "so that's the plan. build a lot of things, fast, in a lot of different places.",
    ],
    running: 'running',
  },
  yours: {
    heading: "you're at the top of the stack too. type what you want to build.",
    label: 'what do you want to build?',
    placeholder: 'a sentence.',
    plate: (words: number, sentences: number, parts: number) =>
      `fig. 5 — yours. ${words} ${words === 1 ? 'word' : 'words'}, ${sentences} ${sentences === 1 ? 'sentence' : 'sentences'}. ${parts} parts.`,
    plateEmpty: 'fig. 5 — yours. empty slot.',
    note: '(one bar per word. one rail per sentence. the real one goes to my inbox.)',
    mailSubject: (sentence: string) => (sentence ? `i want to build: ${sentence}` : 'hi ethan'),
    school: f.school,
    footer: (n: number) => `this page is one bench, ${n.toLocaleString('en-US')} parts, built from the words on it.`,
    clear: 'clear',
  },
  chrome: {
    strip: ['01 sentence', '02 more with less', '03 the first thing', '04 kalshi', '05 heron', '06 darch', '07 summers', '08 alive', '09 yours'],
  },
} as const;
