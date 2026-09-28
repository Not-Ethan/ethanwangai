// Public numbers only. Every figure is labelled with `asOf`. No private figures here, ever.

export const facts = {
  asOf: 'as of sept 2026',
  kalshi: {
    trades: '30,000', tradesLabel: 'live trades',
    contracts: '2M', contractsLabel: 'contracts traded',
    rank: 'top 100', rankLabel: 'all-time crypto profit leaderboard',
    since: 'live on kalshi since jan 2026',
  },
  heron: { cities: 'four', year: '2026' },
  darch: { jobs: '3,000', people: '20 million', margins: '85%', years: '2025–26' },
  wvu: { claims: 'about $100m' },
  school: 'case western, cs + math, may 2028.',
  links: {
    email: 'ethan.wanq@gmail.com',
    github: { href: 'https://github.com/Not-Ethan', label: 'github Not-Ethan' },
    linkedin: { href: 'https://linkedin.com/in/edw173', label: 'linkedin edw173' },
    resume: { href: '/resume.pdf', label: 'resume' },
  },
} as const;
