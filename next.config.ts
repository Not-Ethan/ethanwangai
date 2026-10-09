import type { NextConfig } from 'next';

// Static export (spec §2): the site is files on a CDN. No server, no API routes, no image optimizer.
const nextConfig: NextConfig = {
  output: 'export',
};

export default nextConfig;
