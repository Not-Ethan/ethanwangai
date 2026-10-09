// Every public number on the site (spec §2), hand-edited, each labelled as of oct 2026. Public numbers only:
// never a dollar profit figure, never an exact leaderboard rank, never trade-size or volume figures.
export const AS_OF = 'oct 2026';

export const facts = {
  kalshi: { trades: 30_000, leaderboardTop: 100, since: 'jan 2026', asOf: AS_OF },
  heron: { cities: 4, since: 'june 2026', asOf: AS_OF },
  darch: { videosPerMonth: 3_000, viewsPerMonth: 20_000_000, from: 'june 2025', to: 'may 2026', asOf: AS_OF },
  wvu: { claimsPerYearUsd: 100_000_000, asOf: AS_OF },
} as const;
