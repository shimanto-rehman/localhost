import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/constants';

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ['', '/dashboard', '/bills', '/meals', '/expenses', '/settings'];
  return pages.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '' ? 'weekly' : 'daily',
    priority: path === '' ? 1 : 0.8,
  }));
}
