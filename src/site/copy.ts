import { facts } from './facts';

// Every string on the site. Lowercase, no em or en dashes. The name is uppercase through CSS only.
export const copy = {
  meta: {
    title: 'ethan wang',
    description: 'i build things, then watch them run. a trading algorithm, a video factory, a hedge for bar promos.',
  },
  bar: {
    mark: 'ew',
    links: [
      { label: 'about', href: '#about' },
      { label: 'work', href: '#work' },
      { label: 'experience', href: '#experience' },
      { label: 'contact', href: '#contact' },
    ],
    cta: 'say hi ↗',
    ctaHref: 'mailto:ethan.wanq@gmail.com',
    status: (agents: number, built: number, total: number): string => `${agents} agents · ${built}/${total} built`,
  },
  hero: {
    eyebrow: 'cleveland, ohio',
    name: ['ethan', 'wang'],
    headline: {
      plain: 'i build things, then watch them run.',
      bold: 'a trading algorithm, a video factory, a hedge for bar promos.',
    },
    cta: 'see the work',
    ctaHref: '#work',
    ghost: 'six agents are building this page while you read it',
    ghostPhone: 'three agents are building this page while you read it',
    ghostBadge: 'watch them',
    ghostHref: '#about',
  },
  about: {
    eyebrow: 'about',
    h2: "hi. i'm ethan.",
    logTitle: 'build log',
    logEmpty: 'waiting for the agents',
    logReduced: 'the agents are resting. you asked for less motion.',
    logLine: (agent: string, element: string, seconds: number): string => `${agent} · ${element} · ${seconds.toFixed(2)}s`,
    lede: "a few sentences of plain language turn into thousands of lines of code now. what used to take months takes an afternoon. i've always loved building things. i never really liked the coding.",
    notes: [
      'the best part is watching something i built come alive. my classmates in middle school using my discord bots. a trading algorithm i wrote climbing into the top 100 on kalshi.',
      "right now i trade on kalshi and i'm co-founding heron, which prices and hedges free-drink promos for bars. before that i co-founded darch, a video factory that ran for a year.",
      'cwru, computer science and math, class of 2028. i speak mandarin.',
    ],
  },
  toolbox: {
    eyebrow: 'toolbox',
    h2: 'what i build with',
    rows: [
      { label: 'languages', chips: ['python', 'typescript', 'java', 'c', 'sql'] },
      { label: 'backend', chips: ['fastapi', 'node', 'websockets', 'rest', 'ffmpeg'] },
      { label: 'data', chips: ['postgresql', 'mongodb', 'pandas', 'numpy', 'pytorch'] },
      { label: 'infra', chips: ['linux', 'docker', 'git'] },
      { label: 'markets', chips: ['kalshi', 'order books', 'hedging', 'prediction markets'] },
    ],
  },
  experience: {
    eyebrow: 'experience',
    h2: "where i've been",
    jobs: [
      {
        id: 'kalshi', name: 'kalshi', role: 'independent trader', sub: 'since jan 2026', when: 'jan 2026 to now', place: 'cleveland',
        lede: `a trading algorithm that climbed into the top ${facts.kalshi.leaderboardTop} all-time on kalshi's crypto markets.`,
        points: [
          "a python platform that reads kalshi's order book and crypto reference feeds from a few venues, places orders, checks risk and reconciles fills.",
          'a multi-terabyte research and replay stack, so every idea gets tested out of sample before it trades.',
          `about ${facts.kalshi.trades.toLocaleString('en-US')} live trades so far. it runs while i sleep.`,
        ],
        chips: ['python', 'websockets', 'postgresql', 'pandas'],
      },
      {
        id: 'heron', name: 'heron', role: 'co-founder', sub: 'since june 2026', when: 'june 2026 to now', place: 'four cities',
        lede: "if the home team wins tonight, your drinks are free. the bar doesn't eat that.",
        points: [
          'heron prices the promo, covers the payout and hedges it on prediction markets.',
          'i built the pricing, liability and hedge-execution models.',
          'bars signed in four cities.',
        ],
        chips: ['python', 'fastapi', 'kalshi'],
      },
      {
        id: 'wvu', name: 'wvu medicine', role: 'ml intern', sub: 'summer 2026', when: 'summer 2026', place: 'morgantown',
        lede: 'a model that watches about a hundred million dollars a year of pharmacy claims and notices when denials spike.',
        points: [
          'anomaly detection over the claims stream. the modeling core shipped for production integration.',
          'tooling to plug it into open webui so people could ask it questions.',
        ],
        chips: ['python', 'pytorch', 'pandas'],
      },
      {
        id: 'darch', name: 'darch', role: 'co-founder', sub: '2025 to 2026', when: 'june 2025 to may 2026', place: 'remote',
        lede: 'a video factory. three thousand videos a month, about twenty million views a month. it ended in may 2026.',
        points: [
          'python, node and ffmpeg end to end. scripts in, rendered videos out, distributed.',
          'i ran engineering. it ran for a year.',
        ],
        chips: ['python', 'fastapi', 'node', 'ffmpeg', 'mongodb'],
      },
      {
        id: 'nist', name: 'nist', role: 'software intern', sub: 'summer 2025', when: 'summer 2025', place: 'gaithersburg',
        lede: "a help-desk assistant that reads the internal docs so people don't have to.",
        points: [
          'retrieval, reranking and deep search inside a custom open webui fork.',
          'structured logging and failure analysis, so we knew when it was wrong.',
        ],
        chips: ['python', 'rag', 'docker'],
      },
    ],
  },
  work: {
    eyebrow: 'selected work',
    h2: 'four things that ran',
    intro: 'no write-ups. just what each one was and what it did.',
    cases: [
      {
        id: 'kalshi', no: '01', year: '2026', kind: 'trading', title: 'kalshi algo', tag: 'it trades while i sleep.',
        lede: `a market-making and stat-arb system on kalshi's crypto markets. top ${facts.kalshi.leaderboardTop} all-time, about ${facts.kalshi.trades.toLocaleString('en-US')} trades.`,
        chips: ['python', 'websockets', 'postgresql'], shot: 'book',
      },
      {
        id: 'heron', no: '02', year: '2026', kind: 'product', title: 'heron', tag: 'free drinks if the home team wins.',
        lede: "the bar doesn't eat that. heron prices the promo, covers the payout and hedges it on prediction markets. bars in four cities.",
        chips: ['python', 'fastapi'], shot: 'tab',
      },
      {
        id: 'darch', no: '03', year: '2025', kind: 'system', title: 'darch', tag: 'three thousand videos a month.',
        lede: 'a content pipeline on python, node and ffmpeg. about twenty million views a month for a year. it ended in may 2026.',
        chips: ['python', 'node', 'ffmpeg'], shot: 'grid',
      },
      {
        id: 'nist', no: '04', year: '2025', kind: 'tool', title: 'nist help desk', tag: "reads the docs so you don't.",
        lede: 'a retrieval assistant inside a custom open webui fork, with logging so we knew when it was wrong.',
        chips: ['python', 'rag', 'docker'], shot: 'chat',
      },
    ],
  },
  rest: {
    eyebrow: 'the rest of it',
    h2: 'school, awards, the early stuff',
    cards: [
      {
        title: 'education',
        entries: [
          { name: 'b.s. computer science', line: `case western reserve university · secondary major in mathematics · class of ${facts.school.classOf}` },
          { name: 'mandarin', line: 'fluent' },
        ],
      },
      {
        title: 'awards',
        entries: [
          { name: 'top 100 all-time', line: 'kalshi crypto profit leaderboard · 2026' },
          { name: 'innovation award', line: 'tartanhacks 2025, for orbit' },
        ],
      },
      {
        title: 'the early stuff',
        entries: [
          { name: 'discord bots', line: 'middle school. my classmates used them. the first thing i built that ran.' },
          { name: 'orbit', line: 'a chrome extension, built in a weekend at tartanhacks, feb 2025' },
        ],
      },
    ],
  },
  closer: {
    h2: ["i'm probably up", 'building something.'],
    p: 'email is the fastest way to reach me. i answer all of them.',
    mail: 'ethan.wanq@gmail.com',
    links: [
      { label: 'github ↗', href: 'https://github.com/Not-Ethan' },
      { label: 'linkedin ↗', href: 'https://linkedin.com/in/edw173' },
    ],
    door: {
      title: 'oh, and about the agents.',
      paragraphs: [
        'every element on this page was drawn in by a cursor as you scrolled. there are six of them. they don\'t exist.',
        "nothing is sent anywhere. there's no server behind this page. it's files on a cdn and some javascript.",
        "they'll do it again if you ask.",
      ],
      button: 'rebuild the page ↻',
      note: 'it takes about as long as reading it did.',
    },
  },
  footer: {
    left: 'ethan wang · cleveland',
    right: "that's everything. the agents are done.",
    credit: 'layout after',
    creditLink: { label: 'aahil-khan.xyz', href: 'https://www.aahil-khan.xyz/' },
  },
  totop: { aria: 'back to top', glyph: '↑' },
} as const;
