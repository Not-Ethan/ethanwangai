// Every public number on the site, hand-edited. Public numbers only: never a dollar profit figure, never an exact
// leaderboard rank, never trade-size or volume figures. The copy tests check strings against these.
export const facts = {
  kalshi: { trades: 30_000, leaderboardTop: 100, year: '2026' },
  darch: { videosPerMonth: 3_000, viewsPerMonth: 20_000_000, from: 'june 2025', to: 'may 2026' },
  wvu: { claimsPerYearUsd: 100_000_000 },
  barricades: { cols: 6, rows: 5, year: '2026', repo: 'https://github.com/Not-Ethan/barricades' },
  school: { classOf: 2028 },
} as const;
