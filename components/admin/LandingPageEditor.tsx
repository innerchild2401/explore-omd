'use client';

import { useState, useEffect, useCallback } from 'react';
import { slugify } from '@/lib/utils';

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

interface LandingPageEditorProps {
  page: LandingPage | null;
  omdId: string | null;
  omdSlug: string | null;
  onClose: () => void;
}

export default function LandingPageEditor({ page, omdId, omdSlug, onClose }: LandingPageEditorProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingAI, setGeneratingAI] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    meta_description: '',
    header_text: '',
    url_slug: '',
    intro_text: '',
    is_published: false,
  });

  // Labels state
  const [availableLabels, setAvailableLabels] = useState<Label[]>([]);
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);

  // Businesses state
  const [matchingBusinesses, setMatchingBusinesses] = useState<Business[]>([]);
  const [selectedBusinessIds, setSelectedBusinessIds] = useState<string[]>([]);
  const [showBusinessSelection, setShowBusinessSelection] = useState(false);

  // Load initial data
  useEffect(() => {
    if (page) {
      setFormData({
        title: page.title,
        meta_description: page.meta_description,
        header_text: page.header_text,
        url_slug: page.url_slug,
        intro_text: page.intro_text || '',
        is_published: page.is_published,
      });
      setSelectedLabelIds(
        page.landing_page_labels?.map((lpl) => lpl.label_id) || []
      );
      setSelectedBusinessIds(
        page.landing_page_businesses?.map((lpb) => lpb.business_id) || []
      );
    }
    loadLabels();
  }, [page]);

  // Auto-generate slug from title
  useEffect(() => {
    if (!page && formData.title) {
      setFormData((prev) => ({
        ...prev,
        url_slug: slugify(formData.title),
      }));
    }
  }, [formData.title, page]);

  // Load matching businesses when labels change
  useEffect(() => {
    if (selectedLabelIds.length > 0) {
      loadMatchingBusinesses();
    } else {
      setMatchingBusinesses([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLabelIds]);

  const loadLabels = async () => {
    try {
      const res = await fetch('/api/labels');
      if (!res.ok) throw new Error('Failed to load labels');
      const data = await res.json();
      setAvailableLabels(data.labels || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load labels');
    }
  };

  const loadMatchingBusinesses = async () => {
    if (!omdId || selectedLabelIds.length === 0) return;

    setLoading(true);
    try {
      // Query businesses that have ALL selected labels
      const res = await fetch(
        `/api/businesses/match-labels?omd_id=${omdId}&label_ids=${selectedLabelIds.join(',')}`
      );
      if (!res.ok) throw new Error('Failed to load matching businesses');
      const data = await res.json();
      setMatchingBusinesses(data.businesses || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load businesses');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAI = async () => {
    if (selectedLabelIds.length === 0) {
      setError('Please select at least one label before generating content');
      return;
    }

    if (!omdSlug) {
      setError('OMD slug is required for AI generation');
      return;
    }

    setGeneratingAI(true);
    setError(null);

    try {
      const labelNames = selectedLabelIds
        .map((id) => availableLabels.find((l) => l.id === id)?.name)
        .filter(Boolean) as string[];

      // Get OMD name from slug (or use a default)
      const destinationName = omdSlug.charAt(0).toUpperCase() + omdSlug.slice(1);

      const res = await fetch('/api/ai/generate-landing-page-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label_names: labelNames,
          destination_name: destinationName,
          language: 'ro',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate content');
      }

      const data = await res.json();
      setFormData((prev) => ({
        ...prev,
        title: data.content.title,
        meta_description: data.content.meta_description,
        header_text: data.content.header_text,
        intro_text: data.content.intro_text,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate AI content');
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.meta_description || !formData.header_text || !formData.url_slug) {
      setError('Please fill in all required fields');
      return;
    }

    if (selectedLabelIds.length === 0) {
      setError('Please select at least one label');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        label_ids: selectedLabelIds,
        business_ids: selectedBusinessIds.length > 0 ? selectedBusinessIds : undefined,
      };

      const url = page ? `/api/landing-pages/${page.id}` : '/api/landing-pages';
      const method = page ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save landing page');
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save landing page');
    } finally {
      setSaving(false);
    }
  };

  const toggleLabel = (labelId: string) => {
    setSelectedLabelIds((prev) =>
      prev.includes(labelId)
        ? prev.filter((id) => id !== labelId)
        : [...prev, labelId]
    );
  };

  const toggleBusiness = (businessId: string) => {
    setSelectedBusinessIds((prev) =>
      prev.includes(businessId)
        ? prev.filter((id) => id !== businessId)
        : [...prev, businessId]
    );
  };

  const groupedLabels = availableLabels.reduce((acc, label) => {
    const categoryName = label.label_categories?.name || 'Uncategorized';
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(label);
    return acc;
  }, {} as Record<string, Label[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          {page ? 'Edit Landing Page' : 'Create Landing Page'}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-600 hover:text-gray-900"
        >
          ✕ Close
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-800">{error}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Form Fields */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="e.g., Weekend la mare"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              URL Slug <span className="text-red-500">*</span>
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-gray-500">
                /{omdSlug}/labels/
              </span>
              <input
                type="text"
                value={formData.url_slug}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, url_slug: slugify(e.target.value) }))
                }
                className="block w-full rounded-r-md border border-gray-300 px-3 py-2"
                placeholder="weekend-la-mare"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Meta Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.meta_description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, meta_description: e.target.value }))
              }
              rows={3}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="SEO meta description (150-160 characters)"
            />
            <p className="mt-1 text-xs text-gray-500">
              {formData.meta_description.length} / 160 characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Header (H1) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.header_text}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, header_text: e.target.value }))
              }
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="e.g., Weekend Perfect la Mare"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Introduction Text
            </label>
            <textarea
              value={formData.intro_text}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, intro_text: e.target.value }))
              }
              rows={4}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="Introduction paragraph for the landing page"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_published"
              checked={formData.is_published}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, is_published: e.target.checked }))
              }
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <label htmlFor="is_published" className="ml-2 text-sm text-gray-700">
              Publish immediately
            </label>
          </div>
        </div>

        {/* Right Column: Labels and Businesses */}
        <div className="space-y-6">
          {/* Label Selection */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Labels <span className="text-red-500">*</span>
              </label>
              <button
                onClick={handleGenerateAI}
                disabled={generatingAI || selectedLabelIds.length === 0}
                className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
              >
                {generatingAI ? 'Generating...' : '🤖 Generate with AI'}
              </button>
            </div>
            <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border border-gray-300 p-3">
              {Object.entries(groupedLabels).map(([categoryName, labels]) => (
                <div key={categoryName} className="space-y-1">
                  <div className="text-xs font-semibold text-gray-500">{categoryName}</div>
                  {labels.map((label) => (
                    <label
                      key={label.id}
                      className="flex items-center space-x-2 rounded px-2 py-1 hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedLabelIds.includes(label.id)}
                        onChange={() => toggleLabel(label.id)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">{label.name}</span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {selectedLabelIds.length} label(s) selected
            </p>
          </div>

          {/* Matching Businesses */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Matching Businesses
              </label>
              <button
                onClick={() => setShowBusinessSelection(!showBusinessSelection)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {showBusinessSelection ? 'Hide' : 'Select Manually'}
              </button>
            </div>
            {loading ? (
              <div className="text-sm text-gray-500">Loading businesses...</div>
            ) : matchingBusinesses.length === 0 ? (
              <div className="rounded-md border border-gray-300 p-3 text-sm text-gray-500">
                {selectedLabelIds.length === 0
                  ? 'Select labels to see matching businesses'
                  : 'No businesses match all selected labels'}
              </div>
            ) : (
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border border-gray-300 p-3">
                {matchingBusinesses.map((business) => (
                  <label
                    key={business.id}
                    className="flex items-center space-x-2 rounded px-2 py-1 hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedBusinessIds.includes(business.id)}
                      onChange={() => toggleBusiness(business.id)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">{business.name}</span>
                    <span className="text-xs text-gray-500">({business.type})</span>
                  </label>
                ))}
              </div>
            )}
            <p className="mt-1 text-xs text-gray-500">
              {selectedBusinessIds.length > 0
                ? `${selectedBusinessIds.length} business(es) manually selected`
                : 'Businesses will be auto-matched by labels if none selected'}
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-4 border-t pt-4">
        <button
          onClick={onClose}
          className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : page ? 'Update' : 'Create'}
        </button>
      </div>
    </div>
  );
}

