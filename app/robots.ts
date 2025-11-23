import { MetadataRoute } from 'next';
import { getBaseUrl } from '@/lib/seo/utils';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/business/',
          '/auth/',
          '/feedback/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/business/',
          '/auth/',
          '/feedback/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

