'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Label {
  id: string;
  name: string;
  description: string | null;
  label_categories?: {
    id: string;
    name: string;
  };
}

interface Business {
  id: string;
  name: string;
  slug: string;
  type: 'hotel' | 'restaurant' | 'experience';
  images: string[] | Array<{ url: string; description?: string }>;
}

interface LandingPage {
  id: string;
  title: string;
  meta_description: string;
  header_text: string;
  url_slug: string;
  intro_text: string | null;
  page_type: 'curated' | 'auto_generated';
  is_published: boolean;
  created_at: string;
  updated_at: string;
  landing_page_labels?: Array<{
    label_id: string;
    labels: Label;
  }>;
  landing_page_businesses?: Array<{
    business_id: string;
    order_index: number;
    is_manually_added: boolean;
    businesses: Business;
  }>;
}

interface LandingPagesManagerProps {
  omdId: string | null;
  omdSlug: string | null;
  userRole: string;
}

export default function LandingPagesManager({ omdId, omdSlug, userRole }: LandingPagesManagerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editingPage, setEditingPage] = useState<LandingPage | null>(null);

  const loadPages = useCallback(async () => {
    if (!omdId) return;
    
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/landing-pages');
      if (!res.ok) throw new Error('Failed to load landing pages');
      const data = await res.json();
      setPages(data.pages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load landing pages');
    } finally {
      setLoading(false);
    }
  }, [omdId]);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  const handleCreate = () => {
    setEditingPage(null);
    setShowEditor(true);
  };

  const handleEdit = (page: LandingPage) => {
    setEditingPage(page);
    setShowEditor(true);
  };

  const handleDelete = async (pageId: string) => {
    if (!confirm('Are you sure you want to delete this landing page? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/landing-pages/${pageId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete landing page');
      }

      await loadPages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete landing page');
    }
  };

  const handlePublish = async (pageId: string, isPublished: boolean) => {
    try {
      const res = await fetch(`/api/landing-pages/${pageId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !isPublished }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update publish status');
      }

      await loadPages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update publish status');
    }
  };

  const handleEditorClose = () => {
    setShowEditor(false);
    setEditingPage(null);
    loadPages();
  };

  const getLabelNames = (page: LandingPage) => {
    if (!page.landing_page_labels || page.landing_page_labels.length === 0) {
      return 'No labels';
    }
    return page.landing_page_labels.map((lpl) => lpl.labels.name).join(', ');
  };

  const getBusinessCount = (page: LandingPage) => {
    return page.landing_page_businesses?.length || 0;
  };

  if (showEditor) {
    // Dynamic import to avoid circular dependencies
    const LandingPageEditor = require('./LandingPageEditor').default;
    return (
      <LandingPageEditor
        page={editingPage}
        omdId={omdId}
        omdSlug={omdSlug}
        onClose={handleEditorClose}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Landing Pages</h1>
          <p className="mt-2 text-gray-600">
            Create curated landing pages based on label combinations for SEO and discovery.
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          + Create Landing Page
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-600">Loading landing pages...</div>
      ) : pages.length === 0 ? (
        <div className="rounded-lg bg-gray-50 p-8 text-center">
          <p className="text-gray-600">No landing pages yet. Create your first one!</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Labels
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Businesses
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Updated
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {pages.map((page) => (
                <tr key={page.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{page.title}</div>
                    <div className="text-xs text-gray-500">/{page.url_slug}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{getLabelNames(page)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{getBusinessCount(page)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        page.is_published
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {page.is_published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(page.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      {omdSlug && page.is_published && (
                        <a
                          href={`/${omdSlug}/labels/${page.url_slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View
                        </a>
                      )}
                      <button
                        onClick={() => handlePublish(page.id, page.is_published)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        {page.is_published ? 'Unpublish' : 'Publish'}
                      </button>
                      <button
                        onClick={() => handleEdit(page)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(page.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

