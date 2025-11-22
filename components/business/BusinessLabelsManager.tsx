'use client';

import { useState, useEffect } from 'react';

interface Label {
  id: string;
  name: string;
  description: string | null;
  display_name: string | null;
  is_omd_awarded_only: boolean;
  label_categories?: {
    id: string;
    name: string;
    description: string | null;
  };
}

interface BusinessLabel {
  id: string;
  label_id: string;
  is_omd_awarded: boolean;
  created_at: string;
  labels?: Label;
}

interface BusinessLabelsManagerProps {
  businessId: string;
  businessType: 'hotel' | 'restaurant' | 'experience';
}

export default function BusinessLabelsManager({
  businessId,
  businessType,
}: BusinessLabelsManagerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLabels, setCurrentLabels] = useState<BusinessLabel[]>([]);
  const [availableLabels, setAvailableLabels] = useState<Label[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, businessType]);

  useEffect(() => {
    loadAvailableLabels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoryId, businessType]);

  const loadData = async () => {
    await Promise.all([loadCurrentLabels(), loadCategories(), loadAvailableLabels()]);
  };

  const loadCurrentLabels = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/businesses/${businessId}/labels`);
      if (!res.ok) throw new Error('Failed to load current labels');
      const data = await res.json();
      setCurrentLabels(data.labels || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load current labels');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await fetch('/api/labels/categories');
      if (!res.ok) return;
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (err) {
      // Non-critical error
    }
  };

  const loadAvailableLabels = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = selectedCategoryId
        ? `/api/labels?business_type=${businessType}&category_id=${selectedCategoryId}`
        : `/api/labels?business_type=${businessType}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load available labels');
      const data = await res.json();
      // Filter out OMD-awarded-only labels (businesses can't select these)
      const filtered = (data.labels || []).filter(
        (label: Label) => !label.is_omd_awarded_only
      );
      setAvailableLabels(filtered);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load available labels');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLabel = async (labelId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/businesses/${businessId}/labels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label_ids: [labelId] }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add label');
      }

      await loadCurrentLabels();
      await loadAvailableLabels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add label');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLabel = async (labelId: string) => {
    // Check if it's OMD-awarded (businesses can't remove these)
    const businessLabel = currentLabels.find((bl) => bl.label_id === labelId);
    if (businessLabel?.is_omd_awarded) {
      setError('Cannot remove OMD-awarded labels. Contact your OMD administrator.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/businesses/${businessId}/labels?label_id=${labelId}`,
        { method: 'DELETE' }
      );

      if (!res.ok) throw new Error('Failed to remove label');

      await loadCurrentLabels();
      await loadAvailableLabels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove label');
    } finally {
      setLoading(false);
    }
  };

  // Group labels by category
  const labelsByCategory = availableLabels.reduce((acc, label) => {
    const categoryName = label.label_categories?.name || 'Uncategorized';
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(label);
    return acc;
  }, {} as Record<string, Label[]>);

  const availableLabelsNotSelected = availableLabels.filter(
    (label) => !currentLabels.some((bl) => bl.label_id === label.id)
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Labels</h2>
        <p className="mt-1 text-gray-600">
          Labels help your business get visibility and appear in special sections and auto-generated pages.
          Select labels that accurately describe your business to improve discoverability.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800">
          {error}
        </div>
      )}

      {/* Current Labels */}
      <div className="rounded-lg bg-white p-6 shadow border border-gray-200">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Your Labels ({currentLabels.length})
        </h3>
        {currentLabels.length === 0 ? (
          <p className="text-gray-500">You haven&apos;t selected any labels yet.</p>
        ) : (
          <div className="space-y-2">
            {currentLabels.map((bl) => (
              <div
                key={bl.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">
                    {bl.labels?.display_name || bl.labels?.name}
                  </span>
                  {bl.is_omd_awarded && (
                    <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800">
                      OMD Awarded
                    </span>
                  )}
                  {bl.labels?.label_categories && (
                    <span className="text-xs text-gray-500">
                      ({bl.labels.label_categories.name})
                    </span>
                  )}
                </div>
                {!bl.is_omd_awarded && (
                  <button
                    onClick={() => handleRemoveLabel(bl.label_id)}
                    disabled={loading}
                    className="text-red-600 hover:text-red-700 font-medium text-sm"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available Labels */}
      <div className="rounded-lg bg-white p-6 shadow border border-gray-200">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Available Labels</h3>
          <select
            value={selectedCategoryId || ''}
            onChange={(e) => setSelectedCategoryId(e.target.value || null)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {availableLabelsNotSelected.length === 0 ? (
          <p className="text-gray-500">No additional labels available.</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(labelsByCategory)
              .filter(([_, labels]) =>
                labels.some((label) =>
                  availableLabelsNotSelected.some((al) => al.id === label.id)
                )
              )
              .map(([categoryName, labels]) => (
                <div key={categoryName}>
                  <h4 className="mb-2 text-sm font-semibold text-gray-700">{categoryName}</h4>
                  <div className="space-y-2">
                    {labels
                      .filter((label) =>
                        availableLabelsNotSelected.some((al) => al.id === label.id)
                      )
                      .map((label) => (
                        <div
                          key={label.id}
                          className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3"
                        >
                          <div>
                            <span className="font-medium text-gray-900">
                              {label.display_name || label.name}
                            </span>
                            {label.description && (
                              <p className="mt-1 text-xs text-gray-600">{label.description}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleAddLabel(label.id)}
                            disabled={loading}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-blue-300"
                          >
                            Add
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

