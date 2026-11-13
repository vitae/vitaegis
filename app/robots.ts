import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/eve/'] }],
    sitemap: 'https://www.vitaegis.com/sitemap.xml',
  };
}
