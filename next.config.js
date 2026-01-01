/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['three'],
  images: {
    domains: [],
  },
  // No custom experimental options needed for Turbopack in Next.js 14+
};

module.exports = nextConfig;
