'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface TopPage {
  page_type: string;
  business_type: string;
  time_period: string | null;
  url_slug: string;
  title_template: string;
}

interface TopPagesSectionProps {
  omdSlug: string;
  omdName: string;
  businessId: string;
  businessType: 'hotel' | 'restaurant' | 'experience';
}

export default function TopPagesSection({
  omdSlug,
  omdName,
  businessId,
  businessType,
}: TopPagesSectionProps) {
  const [topPages, setTopPages] = useState<TopPage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTopPages() {
      try {
        const res = await fetch(`/api/businesses/${businessId}/top-pages`);
        if (res.ok) {
          const data = await res.json();
          setTopPages(data.pages || []);
        }
      } catch (err) {
        console.error('Error fetching top pages:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchTopPages();
  }, [businessId]);

  if (loading) {
    return null;
  }

  if (topPages.length === 0) {
    return null;
  }

  const formatPageTitle = (page: TopPage): string => {
    return page.title_template
      .replace('{count}', '5')
      .replace('{destination}', omdName);
  };

  return (
    <section className="mt-12 pt-8 border-t border-gray-200">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Afișat în:</h2>
      <p className="text-gray-600 mb-4 text-sm">
        Această locație apare în următoarele pagini de top generate automat:
      </p>
      <div className="flex flex-wrap gap-3">
        {topPages.map((page) => {
          const pageUrl = `/${omdSlug}/top/${page.url_slug}`;
          const pageTitle = formatPageTitle(page);

          return (
            <Link
              key={`${page.page_type}-${page.time_period || 'all'}`}
              href={pageUrl}
              className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-sm font-medium border border-blue-200"
            >
              {pageTitle}
              <svg
                className="ml-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

