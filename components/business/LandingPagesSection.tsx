'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface LandingPage {
  id: string;
  title: string;
  url_slug: string;
}

interface LandingPagesSectionProps {
  omdSlug: string;
  businessId: string;
}

export default function LandingPagesSection({
  omdSlug,
  businessId,
}: LandingPagesSectionProps) {
  const [landingPages, setLandingPages] = useState<LandingPage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLandingPages() {
      try {
        const res = await fetch(`/api/businesses/${businessId}/landing-pages`);
        if (res.ok) {
          const data = await res.json();
          setLandingPages(data.pages || []);
        }
      } catch (err) {
        console.error('Error fetching landing pages:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchLandingPages();
  }, [businessId]);

  if (loading) {
    return null;
  }

  if (landingPages.length === 0) {
    return null;
  }

  return (
    <section className="mt-12 pt-8 border-t border-gray-200">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Afișat în:</h2>
      <p className="text-gray-600 mb-4 text-sm">
        Această locație apare în următoarele pagini tematice:
      </p>
      <div className="flex flex-wrap gap-3">
        {landingPages.map((page) => {
          const pageUrl = `/${omdSlug}/labels/${page.url_slug}`;

          return (
            <Link
              key={page.id}
              href={pageUrl}
              className="inline-flex items-center px-4 py-2 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors text-sm font-medium border border-purple-200"
            >
              {page.title}
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

