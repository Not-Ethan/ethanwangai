// Every user-facing string on the site (spec §3.1, §3.2), in Ethan's voice: lowercase, full sentences, no italics,
// no title case, no em dashes. Agents do not improvise lines; change a string here only when the spec changes.
import type { SectionId } from '@/valley/types';

/** The ignition labels, in chain order (spec §3.1 · 01). Keys name what each label sits near. */
export type IgnitionLabelKey = 'hut' | 'nist' | 'mill' | 'kalshiLamp' | 'wvu' | 'bars' | 'hillside';

const NAV_ITEMS: readonly { label: string; section: SectionId }[] = [
  { label: 'kalshi', section: 'kalshi' },
  { label: 'heron', section: 'heron' },
  { label: 'darch', section: 'darch' },
  { label: 'summers', section: 'summers' },
  { label: 'contact', section: 'contact' },
];

const LABELS: Record<IgnitionLabelKey, string> = {
  hut: 'discord bots, middle school. my classmates used them.',
  nist: 'nist, summer 2025',
  mill: 'darch, june 2025 to may 2026',
  kalshiLamp: 'kalshi, since jan 2026',
  wvu: 'wvu medicine, summer 2026',
  bars: 'heron, since june 2026',
  hillside: 'things i built, one house each',
};

const HILLSIDE = [
  'a discord bot for my middle school server',
  'a trading algorithm for kalshi',
  'a pipeline that made three thousand videos a month',
  'a help-desk assistant that reads the docs for you',
  'a pricing model for free-drinks promos at bars',
] as const;

const CONTACT_LINKS: readonly { label: string; href: string; external: boolean }[] = [
  { label: 'email', href: 'mailto:ethan.wanq@gmail.com', external: false },
  { label: 'github', href: 'https://github.com/Not-Ethan', external: true },
  { label: 'linkedin', href: 'https://linkedin.com/in/edw173', external: true },
];

export const copy = {
  meta: {
    title: 'ethan wang',
    description: 'now is the best time in history to build things. everything lit on this page is something i built that people used.',
  },
  nav: {
    home: 'ethan wang',
    items: NAV_ITEMS,
    separator: '·',
  },
  open: {
    headline: 'now is the best time in history to build things.',
    deck: 'everything lit here is something i built that people used.',
    scrollCue: 'scroll',
    labels: LABELS,
  },
  kalshi: {
    heading: 'every light on that ridge is a trade my algorithm made.',
    body: 'about thirty thousand of them since january 2026. i built the whole thing: the feeds, the quoting, the risk checks, the replay stack i use to find out what went wrong. somewhere in there it climbed into the top 100 all-time on kalshi\'s crypto leaderboard.',
    figures: ['about 30,000 trades', 'top 100 all-time, crypto'],
    mono: 'jan 2026 → oct 2026 · as of oct 2026 · not live',
    /** The ridge counter (spec §3.1 · 02); n is already rounded and capped by the caller. */
    counter: (n: number) => `${n.toLocaleString('en-US')} trades`,
  },
  heron: {
    heading: 'if the home team wins tonight, your drinks are free.',
    body: 'the bar doesn\'t eat that. heron prices the promo, covers the payout, and hedges it on prediction markets. the lines from each bar run to the market. co-founded it this summer. we have bars signed in four cities.',
    mono: 'co-founder · since june 2026 · as of oct 2026',
  },
  darch: {
    heading: 'darch made three thousand videos a month. it ended in may 2026.',
    body: 'it ran on python, node and ffmpeg. what it made got about twenty million views a month. scroll back and it lights up again. that\'s the only thing on this page that does.',
    figures: ['3,000 videos a month', '20 million views a month'],
    mono: 'co-founder · june 2025 to may 2026',
  },
  summers: {
    heading: 'i spent two summers building things for other people.',
    body: 'at nist i built a help-desk assistant that searches the internal docs and answers from them. at wvu medicine i built a model over about a hundred million dollars a year of pharmacy claims. when denials spike, it notices.',
    figures: ['about $100m of claims a year'],
    mono: 'nist, summer 2025 · wvu medicine, summer 2026',
  },
  alive: {
    heading: 'a few sentences of plain language turn into thousands of lines of code now.',
    body: 'people kept making languages higher level so you could do more with less. this is the top of that. what used to take months takes an afternoon. the world doesn\'t need a master programmer who dreams in code. it needs people who\'ve seen so many ideas that they see opportunities everywhere. i never really liked the coding. i liked watching it run.',
  },
  yours: {
    heading: 'type one sentence about something you\'d build.',
    body: 'watch it turn into a house with the lights on. yours gets a light too.',
    placeholder: 'something you\'d build',
    button: 'build',
    maxLength: 140,
    /** The build clock (spec §3.1 · 07); t is already formatted 0.00. */
    clock: (t: string) => `${t} / 4.40`,
    /** The tag after the build; parts is the real parts.length of the house. */
    tag: (words: number, parts: number) => `${words} words in · ${parts.toLocaleString('en-US')} parts out · 4.40 s on the clock`,
    hint: 'it stays in this browser. nothing is sent anywhere.',
    hillside: HILLSIDE,
  },
  contact: {
    heading: 'it\'s late and i\'m probably up building something.',
    body: 'the first light on this page is still the discord bot.',
    links: CONTACT_LINKS,
    mono: 'ethan wang · cleveland · as of oct 2026',
  },
} as const;
