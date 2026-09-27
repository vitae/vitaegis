/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
