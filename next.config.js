/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // KeyCrate is proxied from glowwitdaflow.com/keycrate (rewrites in the GWDF site); its
  // scripts and styles must still load from this host, so production builds reference them
  // by absolute URL. KeyCrate also keeps working at vitaegis.com/keycrate.
  assetPrefix: process.env.VERCEL_ENV === 'production' ? 'https://www.vitaegis.com' : undefined,
  transpilePackages: ['three'],
  images: {
    domains: [],
  },
  // No custom experimental options needed for Turbopack in Next.js 14+
  async rewrites() {
    // Routes are case-sensitive; serve the shared /ED link from app/ed.
    return [{ source: '/ED', destination: '/ed' }];
  },
};

module.exports = nextConfig;
