import { facts } from './facts';

// Every string on the site. Lowercase, no em or en dashes. The name is uppercase through CSS only.
// Voice source: Ethan's thesis paragraph (spec §6, §15). Experience says the role, work says the thing.
// The copy never narrates the effect (spec §17): no sentence says agents or cursors build the page. The HUD (cursor tags, status pill, build log lines) is the only place the word agent appears.
export const copy = {
  meta: {
    title: 'ethan wang',
    description: `i build things, then watch them run: a trading algorithm, a video factory, a board game solver. computer science and math at case western, class of ${facts.school.classOf}.`,
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
    name: ['ethan', 'wang'],
    headline: {
      plain: 'i build things, then watch them run.',
      bold: 'a\u00a0trading algorithm, a\u00a0video factory, a\u00a0board game solver.',
    },
    cta: 'see the work',
    ctaHref: '#work',
    cta2: 'email me ↗',
    cta2Href: 'mailto:ethan.wanq@gmail.com',
  },
  about: {
    h2: "hi. i'm ethan.",
    logTitle: 'build log',
    logLine: (agent: string, element: string, seconds: number): string => `${agent} · ${element} · ${seconds.toFixed(2)}s`,
    ledeMark: 'now is the best time in history to build\u00a0things.',
    lede: 'a few sentences of plain language turn into thousands of lines of code, and what used to take months takes an afternoon.',
    notes: [
      "this is the era of speed, and with it the era of diversification. the world doesn't need some master programmer who dreams in code. it needs well rounded people who have been exposed to so many ideas that they see new opportunities everywhere.",
      `i've always loved building things, but i never really liked coding. the best part was seeing something i built come alive, from my classmates in middle school using my discord bots to a trading algorithm i wrote climbing into the top ${facts.kalshi.leaderboardTop} on kalshi.`,
      `i study computer science and math at case western, class of ${facts.school.classOf}.`,
    ],
  },
  toolbox: {
    h2: 'what i build with',
    rows: [
      { label: 'languages', chips: ['python', 'typescript', 'rust', 'java', 'c', 'sql'] },
      { label: 'backend', chips: ['fastapi', 'node', 'websockets', 'rest apis', 'ffmpeg'] },
      { label: 'data', chips: ['postgresql', 'mongodb', 'pandas', 'numpy', 'pytorch'] },
      { label: 'infra', chips: ['linux', 'docker', 'git'] },
      { label: 'markets', chips: ['kalshi', 'order books', 'replay testing'] },
    ],
  },
  experience: {
    h2: "where i've been",
    // sub is the subject of the job, for the index; the card title carries name and role, the when line the dates.
    jobs: [
      {
        id: 'kalshi', name: 'kalshi', role: 'independent trader', sub: 'my own trading system', when: facts.kalshi.year, place: 'cleveland',
        lede: "i traded my own money on kalshi's crypto markets for most of 2026 with a system i wrote.",
        body: "it read kalshi's order book and prices from a few crypto exchanges, placed its own orders, and kept track of risk and fills. every idea ran on a replay of old market data before it touched real money.",
      },
      {
        id: 'wvu', name: 'wvu medicine', role: 'ml intern', sub: 'a pharmacy claims model', when: 'summer 2026', place: 'morgantown',
        lede: 'i built the core of a model that notices when pharmacy claim denials spike.',
        body: 'it learned from about a hundred million dollars a year of claims. i handed it to the team for production, and wrote the tooling that plugs their chat assistant into the rest of their systems.',
      },
      {
        id: 'darch', name: 'darch', role: 'co-founder', sub: 'a video pipeline', when: `${facts.darch.from} to ${facts.darch.to}`, place: 'remote',
        lede: 'i ran engineering. we made videos by the thousand.',
        body: 'i built the pipeline end to end in python, node and ffmpeg, and kept it running.',
      },
      {
        id: 'nist', name: 'nist', role: 'software intern', sub: 'a help-desk search tool', when: 'summer 2025', place: 'gaithersburg',
        lede: "i built the search behind a help-desk assistant for nist's internal docs.",
        body: 'it finds the right docs, ranks them, and searches again when the first pass comes up thin. i added the logging so we could see when it was wrong.',
      },
    ],
  },
  work: {
    h2: 'four things that ran',
    intro: 'trading, a board game, video and government docs, newest first.',
    cases: [
      {
        id: 'kalshi', year: facts.kalshi.year, kind: 'trading', title: 'kalshi algo', tag: 'it traded while i slept.',
        lede: `it quoted both sides and traded the price gaps between related crypto markets on kalshi. about ${facts.kalshi.trades.toLocaleString('en-US')} trades, and top ${facts.kalshi.leaderboardTop} all-time on the crypto profit leaderboard.`,
        chips: ['python', 'websockets', 'postgresql'], shot: 'book',
      },
      {
        id: 'barricades', year: facts.barricades.year, kind: 'research', title: 'barricades', tag: 'a board nobody had solved.',
        lede: `a rust solver that works out who wins ${facts.barricades.cols}×${facts.barricades.rows} quoridor with perfect play, for every wall count. ai wrote much of the code under my direction. i didn't trust it until it matched two separate rules engines and a brute-force search.`,
        chips: ['rust', 'python', 'search'], shot: 'board', link: { label: 'the code ↗', href: facts.barricades.repo },
      },
      {
        id: 'darch', year: '2025', kind: 'system', title: 'darch', tag: 'three thousand videos a month.',
        lede: 'scripts went in, finished videos came out and got posted. they were seen about twenty million times a month.',
        chips: ['python', 'node', 'ffmpeg'], shot: 'grid',
      },
      {
        id: 'nist', year: '2025', kind: 'tool', title: 'nist help desk', tag: "reads the docs so you don't.",
        lede: "an assistant that answers questions from nist's internal docs and says which doc it used.",
        chips: ['python', 'retrieval', 'docker'], shot: 'chat',
      },
    ],
  },
  rest: {
    h2: 'school, awards, the early stuff',
    cards: [
      {
        title: 'education',
        entries: [
          { name: 'b.s. computer science', line: `case western reserve university · secondary major in mathematics · class of ${facts.school.classOf}` },
          { name: 'mandarin chinese', line: 'spoken' },
        ],
      },
      {
        title: 'awards',
        entries: [
          { name: `top ${facts.kalshi.leaderboardTop} all-time`, line: 'kalshi crypto profit leaderboard · 2026' },
          { name: 'innovation award', line: 'tartanhacks 2025, for orbit' },
        ],
      },
      {
        title: 'the early stuff',
        entries: [
          { name: 'discord bots', line: 'i built them in middle school. they were the first thing i made that other people used.' },
          { name: 'orbit', line: 'a chrome extension i built in a\u00a0weekend, feb 2025.' },
        ],
      },
    ],
  },
  closer: {
    h2: ["i'm probably up", 'building something.'],
    p: 'email is the fastest way to reach me.',
    mail: 'ethan.wanq@gmail.com',
    links: [
      { label: 'github ↗', href: 'https://github.com/Not-Ethan' },
      { label: 'linkedin ↗', href: 'https://linkedin.com/in/edw173' },
    ],
    rebuild: 'rebuild ↻',
    rebuildLabel: 'rebuild the page',
  },
  footer: {
    left: 'ethan wang · cleveland',
    right: "that's everything.",
  },
  // What each agent was told to build (spec §13.4), keyed by the data-build name.
  prompts: {
    'mark': 'my initials, top left',
    'nav': 'links to the sections',
    'cta': 'a way to say hi',
    'h1 name': 'my name, huge',
    'headline': 'what i do, in one line',
    'actions': 'two buttons',
    'h2 about': 'a hello',
    'log': "a log of what you've built",
    'lede': 'the thesis',
    'notes': 'three notes about me',
    'h2 toolbox': 'a heading for the tools',
    'row languages': 'the languages',
    'row backend': 'the backend stuff',
    'row data': 'the data stuff',
    'row infra': 'the infra',
    'row markets': 'the markets',
    'h2 experience': 'a heading for the jobs',
    'index': 'a list of the jobs',
    'card kalshi': 'my kalshi trading',
    'card wvu': 'the wvu job',
    'card darch': 'the darch job',
    'card nist': 'the nist job',
    'h2 work': 'a heading for the work',
    'shot kalshi': 'draw an order book',
    'body kalshi': 'what the algo does',
    'shot barricades': 'draw a game board',
    'body barricades': 'what barricades proved',
    'shot darch': 'draw a grid of videos',
    'body darch': 'what darch did',
    'shot nist': 'draw a chat window',
    'body nist': 'what the help desk did',
    'h2 rest': 'a heading for the rest',
    'card education': 'where i went to school',
    'card awards': 'the awards',
    'card the early stuff': 'the early stuff',
    'h2 contact': 'a big goodbye',
    'p contact': 'how to reach me',
    'mail': 'my email, big',
    'links': 'github, linkedin and a rebuild button',
    'footer': 'a footer',
  } as Record<string, string>,
  totop: { aria: 'back to top', glyph: '↑' },
} as const;
