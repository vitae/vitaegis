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
  async redirects() {
    // KeyCrate now lives at glowwitdaflow.com/keycrate, which proxies it from this deployment
    // (the GWDF site's next.config rewrites). Requests that arrive through that proxy carry
    // its host in X-Forwarded-Host and are served; anyone still typing vitaegis.com/keycrate
    // is sent to the new address. The API and share pages aren't redirected: the proxy and
    // existing links keep working either way.
    const notProxied = [
      { type: 'header', key: 'x-forwarded-host', value: '(www\\.)?vitaegis\\.com' },
    ];
    return [
      {
        source: '/keycrate',
        has: notProxied,
        destination: 'https://www.glowwitdaflow.com/keycrate',
        permanent: false,
      },
      {
        source: '/keycrate/study',
        has: notProxied,
        destination: 'https://www.glowwitdaflow.com/keycrate/study',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
