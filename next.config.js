/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // KeyCrate is proxied from glowwitdaflow.com/keycrate (rewrites in the GWDF site); its
  // scripts and styles must still load from this host, so production builds reference them
  // by absolute URL. KeyCrate also keeps working at vitaegis.com/keycrate.
  assetPrefix: process.env.VERCEL_ENV === 'production' ? 'https://www.vitaegis.com' : undefined,
  transpilePackages: ['three'],
  // /crypto's first build-time render walks Chainlink history when the Supabase cache is
  // cold, which can pass Next's default 60-second limit on a slow RPC.
  staticPageGenerationTimeout: 300,
  // The content worker shells out to ffmpeg and renders captions with resvg: keep both
  // packages (and their native binaries) out of the bundle, and ship the caption font.
  serverExternalPackages: ['ffmpeg-static', '@resvg/resvg-js'],
  outputFileTracingIncludes: {
    '/api/content/worker': [
      './lib/fonts/**',
      './lib/assets/intros/**',
      './node_modules/ffmpeg-static/ffmpeg',
      './node_modules/@resvg/**',
    ],
  },
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
