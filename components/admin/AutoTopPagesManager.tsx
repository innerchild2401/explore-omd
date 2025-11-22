'use client';

import { useState, useEffect } from 'react';

interface AutoTopPage {
  id: string;
  page_type: string;
  business_type: string;
  time_period: string | null;
  title_template: string;
  url_slug: string;
  count: number;
  is_active: boolean;
  last_generated_at: string | null;
}

export default function AutoTopPagesManager() {
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pages, setPages] = useState<AutoTopPage[]>([]);

  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auto-top-pages');
      if (!res.ok) throw new Error('Failed to load pages');
      const data = await res.json();
      setPages(data.pages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pages');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateAll = async () => {
    if (!confirm('Are you sure you want to regenerate all auto-generated top pages? This may take a few moments.')) {
      return;
    }

    setRegenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/auto-top-pages/regenerate-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to regenerate pages');
      }

      const data = await res.json();
      setSuccess(data.message || 'Pages regenerated successfully');
      
      // Reload pages to show updated timestamps
      await loadPages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate pages');
    } finally {
      setRegenerating(false);
    }
  };

  const formatPageType = (pageType: string) => {
    const types: Record<string, string> = {
      'most-booked-hotels': 'Most Booked Hotels',
      'cheapest-hotels': 'Cheapest Hotels',
      'highest-rated-hotels': 'Highest Rated Hotels',
      'resorts': 'Resorts',
      'bnb': 'B&B',
      'apartments': 'Apartments',
      '5-star-hotels': '5 Star Hotels',
      '4-star-hotels': '4 Star Hotels',
      'most-visited-restaurants': 'Most Visited Restaurants',
      'budget-restaurants': 'Budget Restaurants',
      'mid-range-restaurants': 'Mid-Range Restaurants',
      'fine-dining-restaurants': 'Fine Dining Restaurants',
      'highest-rated-restaurants': 'Highest Rated Restaurants',
      'most-booked-experiences': 'Most Booked Experiences',
      'cheapest-experiences': 'Cheapest Experiences',
      'highest-rated-experiences': 'Highest Rated Experiences',
      'easy-experiences': 'Easy Experiences',
      'moderate-experiences': 'Moderate Experiences',
      'challenging-experiences': 'Challenging Experiences',
      'newest-businesses': 'Newest Businesses',
    };
    return types[pageType] || pageType;
  };

  const formatTimePeriod = (period: string | null) => {
    if (!period) return '';
    const periods: Record<string, string> = {
      'all-time': 'All Time',
      'last-7-days': 'Last 7 Days',
      'this-month': 'This Month',
    };
    return periods[period] || period;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('ro-RO', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  // Group pages by business type
  const pagesByType = pages.reduce((acc, page) => {
    const type = page.business_type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(page);
    return acc;
  }, {} as Record<string, AutoTopPage[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Auto-Generated Top Pages</h2>
          <p className="mt-1 text-gray-600">
            These pages are automatically generated based on business data (bookings, ratings, prices).
            Click &quot;Regenerate All&quot; to update all pages with the latest data.
          </p>
        </div>
        <button
          onClick={handleRegenerateAll}
          disabled={regenerating || loading}
          className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
        >
          {regenerating ? 'Regenerating...' : 'Regenerate All'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-green-800">
          {success}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading pages...</div>
      ) : pages.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No pages configured. Pages will be initialized automatically on first regeneration.
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(pagesByType).map(([type, typePages]) => (
            <div key={type} className="rounded-lg bg-white p-6 shadow border border-gray-200">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 capitalize">
                {type === 'all' ? 'All Businesses' : type}
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Page Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time Period
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Count
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Generated
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {typePages.map((page) => (
                      <tr key={page.id}>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {formatPageType(page.page_type)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatTimePeriod(page.time_period)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          Top {page.count}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatDate(page.last_generated_at)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {page.is_active ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Inactive
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

