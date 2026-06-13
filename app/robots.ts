import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/constants';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Auth-only app pages redirect crawlers to /, so keep them out entirely.
      disallow: [
        '/api/',
        '/dashboard',
        '/bills',
        '/meals',
        '/expenses',
        '/settings',
        '/profile',
        '/reset-password/',
        '/reset-apartment-password/',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
