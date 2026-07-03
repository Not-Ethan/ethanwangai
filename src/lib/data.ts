export const siteConfig = {
  name: "Ethan Wang",
  tagline:
    "I build trading systems, video pipelines, and other machines that run while I sleep.",
  email: "ethan.wanq@gmail.com",
  github: "https://github.com/Not-Ethan",
  linkedin: "https://linkedin.com/in/edw173",
};

export const about = {
  lead: "I study CS and math at Case Western Reserve University. Most of what I know comes from two obsessions: Darch AI's video infrastructure, and a trading operation on Kalshi that never logs off.",
  body: "At Darch, the pipeline I built renders 3,000+ videos a month and pulls 20M+ monthly impressions. The Kalshi bots clear 500K contracts a month and sit in the top 100 on the all-time crypto leaderboard. Last summer I built RAG tooling at NIST.",
};

export const projectMetrics = [
  {
    name: "Darch AI",
    link: "https://darchai.com",
    metrics: [
      { value: "20M+", label: "monthly impressions" },
      { value: "3,000+", label: "monthly video jobs" },
      { value: "85%+", label: "profit margins" },
    ],
  },
  {
    name: "Kalshi Trading",
    metrics: [
      { value: "500K+", label: "monthly traded volume" },
      { value: "3,500+", label: "trades per month" },
      { value: "Top 100", label: "all-time crypto leaderboard" },
    ],
  },
];

export const experience = [
  {
    company: "Darch AI",
    link: "https://darchai.com",
    role: "Co-Founder & Engineering Lead",
    location: "Remote",
    dates: "June 2025 – Present",
    bullets: [
      "Designed the hybrid **Python/FastAPI and Node.js** service architecture and the **FFmpeg pipeline** behind **20M+ monthly impressions**.",
      "Tuned serverless allocation and caching so **3,000+ monthly video jobs** run at **85%+ margins**.",
      "Run the self-hosted, **multi-tenant B2B infrastructure** with custom auth flows, and handle solution architecture for enterprise accounts.",
    ],
    tags: ["Python", "FastAPI", "Node.js", "FFmpeg", "Docker"],
  },
  {
    company: "National Institute of Standards and Technology (NIST)",
    role: "Software Development Intern",
    location: "Gaithersburg, MD",
    dates: "June 2025 – August 2025",
    bullets: [
      "Built an internal help-desk chatbot on a **RAG pipeline**, from document ingestion through retrieval tuning.",
      "Added custom **logging** to an **Open WebUI fork** so staff could trace and debug model conversations.",
      "Shipped a **wildfire evacuation dashboard** for the Boulder campus, built to stakeholder requirements.",
    ],
    tags: ["Python", "RAG", "Open WebUI", "React"],
  },
];

export const projects = [
  {
    title: "Quantitative Trading on Kalshi",
    description:
      "An automated trading system for prediction markets. It runs market-making and momentum strategies, plus arbitrage that lives or dies on latency.",
    metric: "Top 100 all-time on Kalshi's crypto leaderboard",
    award: true,
    tags: ["Python", "WebSockets", "MongoDB"],
    featured: true,
    bullets: [
      "3,500+ trades a month across 500K contracts",
      "Low-latency pipeline that has chewed through hundreds of GBs of market data",
      "Signals built on Ornstein-Uhlenbeck processes, Hawkes models, and a modified Black-Scholes",
    ],
    dates: "May 2024 – Present",
  },
  {
    title: "Orbit Chrome Extension",
    description:
      "A Chrome extension for searching everything you save in the browser: text, audio, and video, queried in plain language over CLIP and CLAP embeddings.",
    metric: "Most Innovative Use of Groundbreaking Technology, TartanHacks 2025 @ CMU",
    award: true,
    tags: ["Flask", "PyTorch", "ChromaDB", "CLIP/CLAP"],
    featured: false,
    bullets: [
      "Won the innovation award at Carnegie Mellon's TartanHacks 2025",
      "Answers natural-language queries over anything captured while browsing",
      "Uses ChromaDB for real-time vector similarity search",
    ],
    dates: "February 2025",
  },
];

export const skills = {
  Languages: ["Python", "Java", "JavaScript/TypeScript", "C", "SQL"],
  Frameworks: ["React", "FastAPI", "Node.js", "PyTorch", "Next.js"],
  Infrastructure: ["Docker", "MongoDB", "PostgreSQL", "WebSockets", "FFmpeg", "Git"],
};

export const education = {
  school: "Case Western Reserve University",
  location: "Cleveland, OH",
  degree: "B.S. in Computer Science and Mathematics",
  graduation: "Expected May 2028",
};

export const contact = {
  heading: "The trail ends here.",
  body: "Email reaches me fastest. I read everything and answer most of it.",
};

export const awards = [
  { title: "Most Innovative Use of Groundbreaking Technology", org: "CMU TartanHacks 2025", date: "Feb 2025" },
  { title: "Generative AI Fundamentals", org: "Databricks Academy", date: "Jan 2026" },
  { title: "Maryland Seal of Biliteracy – Mandarin Chinese", org: "Maryland State Department of Education", date: "May 2024" },
];
