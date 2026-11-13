import type { MetadataRoute } from 'next';
import { projects } from '@/components/projects';

const BASE = 'https://www.vitaegis.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    '/',
    '/health',
    '/stealth',
    '/wealth',
    '/projects',
    ...projects.map((p) => p.href),
    '/donate',
    '/privacy',
    '/terms',
  ];
  return [...new Set(pages)].map((path) => ({
    url: `${BASE}${path === '/' ? '' : path}`,
    changeFrequency: path === '/' ? 'daily' : 'weekly',
    priority: path === '/' ? 1 : 0.7,
  }));
}
