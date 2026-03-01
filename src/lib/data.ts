export const siteConfig = {
  name: "Ethan Wang",
  tagline: "AI infrastructure · quantitative trading · startups",
  email: "ethan.wanq@gmail.com",
  github: "https://github.com/Not-Ethan",
  linkedin: "https://linkedin.com/in/edw173",
};

export const projectMetrics = [
  {
    name: "Darch AI",
    link: "https://darchai.com",
    accent: "accent",
    metrics: [
      { value: "20M+", label: "Monthly Impressions" },
      { value: "3,000+", label: "Monthly Video Jobs" },
      { value: "85%+", label: "Profit Margins" },
    ],
  },
  {
    name: "Kalshi Trading",
    accent: "gold",
    metrics: [
      { value: "500K+", label: "Monthly Traded Volume" },
      { value: "3,500+", label: "Trades / Month" },
      { value: "Top 100", label: "Kalshi Leaderboard" },
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
      "Architected a **hybrid microservices system** (Python/FastAPI, Node.js) and **high-throughput FFmpeg media pipeline** to automate cross-platform content distribution, supporting **20M+ monthly impressions**.",
      "Optimized serverless resource allocation for **3,000+ monthly video jobs**, maintaining **85%+ profit margins** through aggressive caching and stateless execution.",
      "Maintaining custom **self-hosted infrastructure** with modified authentication flows for **multi-tenant B2B scheduling**, while leading solution architecture for enterprise accounts.",
    ],
    tags: ["Python", "FastAPI", "Node.js", "FFmpeg", "Docker"],
  },
  {
    company: "National Institute of Standards and Technology (NIST)",
    role: "Software Development Intern",
    location: "Gaithersburg, MD",
    dates: "June 2025 – August 2025",
    bullets: [
      "Built **AI-driven internal tools** including a help desk chatbot powered by a **RAG pipeline**, engineering document ingestion and optimizing retrieval strategies.",
      "Developed and integrated a **custom logging feature** into an **Open WebUI fork** to enhance monitoring and debugging capabilities.",
      "Collaborated with Boulder campus staff to deliver a **wildfire evacuation dashboard** based on stakeholder requirements.",
    ],
    tags: ["Python", "RAG", "Open WebUI", "React"],
  },
];

export const projects = [
  {
    title: "Quantitative Trading on Kalshi",
    description: "Automated trading system executing across prediction markets with market making, momentum, arbitrage, and latency-sensitive strategies.",
    metric: "Top 100 all-time on Kalshi crypto leaderboard",
    award: true,
    tags: ["Python", "WebSockets", "MongoDB"],
    featured: true,
    bullets: [
      "3,500+ monthly trades totaling 500k contracts",
      "Low-latency infrastructure processing hundreds of GBs of market data",
      "Predictive models using Ornstein-Uhlenbeck SDEs, Hawkes processes, and modified Black-Scholes",
    ],
    dates: "May 2024 – Present",
  },
  {
    title: "Orbit Chrome Extension",
    description: "Multimodal semantic search engine for saved text, audio, and video using CLIP/CLAP embeddings.",
    metric: "Most Innovative Use of Groundbreaking Technology — TartanHacks 2025 @ CMU",
    award: true,
    tags: ["Flask", "PyTorch", "ChromaDB", "CLIP/CLAP"],
    featured: false,
    bullets: [
      "Won TartanHacks 2025 at Carnegie Mellon University for most innovative use of groundbreaking technology",
      "Natural language queries over captured browser content",
      "ChromaDB integration for real-time vector similarity search",
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

export const awards = [
  { title: "Most Innovative Use of Groundbreaking Technology", org: "CMU TartanHacks 2025", date: "Feb 2025" },
  { title: "Generative AI Fundamentals", org: "Databricks Academy", date: "Jan 2026" },
  { title: "Maryland Seal of Biliteracy – Mandarin Chinese", org: "Maryland State Department of Education", date: "May 2024" },
];
