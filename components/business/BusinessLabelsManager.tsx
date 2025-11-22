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


  // Get all labels (both current and available) grouped by category
  const allLabelsByCategory = availableLabels.reduce((acc, label) => {
    const categoryName = label.label_categories?.name || 'Uncategorized';
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(label);
    return acc;
  }, {} as Record<string, Label[]>);

  // Helper to check if a label is currently selected
  const isLabelSelected = (labelId: string) => {
    return currentLabels.some((bl) => bl.label_id === labelId);
  };

  // Helper to get business label info
  const getBusinessLabel = (labelId: string) => {
    return currentLabels.find((bl) => bl.label_id === labelId);
  };

  // Handle label toggle
  const handleLabelToggle = async (labelId: string) => {
    const isSelected = isLabelSelected(labelId);
    if (isSelected) {
      await handleRemoveLabel(labelId);
    } else {
      await handleAddLabel(labelId);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Labels</h2>
        <p className="mt-1 text-gray-600">
          Labels help your business get visibility and appear in special sections and auto-generated pages.
          Click labels to add or remove them. Selected labels are highlighted.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800">
          {error}
        </div>
      )}

      {/* Category Filter */}
      <div className="rounded-lg bg-white p-4 shadow border border-gray-200">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Filter by category:</label>
          <select
            value={selectedCategoryId || ''}
            onChange={(e) => setSelectedCategoryId(e.target.value || null)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <div className="ml-auto text-sm text-gray-600">
            <span className="font-medium text-gray-900">{currentLabels.length}</span> selected
          </div>
        </div>
      </div>

      {/* Labels by Category */}
      <div className="rounded-lg bg-white p-6 shadow border border-gray-200">
        {Object.keys(allLabelsByCategory).length === 0 ? (
          <p className="text-gray-500">No labels available.</p>
        ) : (
          <div className="space-y-6">
            {Object.entries(allLabelsByCategory).map(([categoryName, labels]) => {
              // Filter labels based on category filter
              const filteredLabels = selectedCategoryId
                ? labels.filter(
                    (label) => label.label_categories?.id === selectedCategoryId
                  )
                : labels;

              if (filteredLabels.length === 0) return null;

              return (
                <div key={categoryName}>
                  <h3 className="mb-3 text-base font-semibold text-gray-900">{categoryName}</h3>
                  <div className="flex flex-wrap gap-2">
                    {filteredLabels.map((label) => {
                      const isSelected = isLabelSelected(label.id);
                      const businessLabel = getBusinessLabel(label.id);
                      const isOmdAwarded = businessLabel?.is_omd_awarded || false;

                      return (
                        <button
                          key={label.id}
                          onClick={() => !isOmdAwarded && handleLabelToggle(label.id)}
                          disabled={loading || isOmdAwarded}
                          title={label.description || undefined}
                          className={`
                            inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium
                            transition-all duration-200
                            ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                            }
                            ${isOmdAwarded ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'}
                            ${loading ? 'opacity-50 cursor-wait' : ''}
                          `}
                        >
                          <span>{label.display_name || label.name}</span>
                          {isOmdAwarded && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-200 text-purple-800">
                              OMD
                            </span>
                          )}
                          {isSelected && (
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info about OMD-awarded labels */}
      {currentLabels.some((bl) => bl.is_omd_awarded) && (
        <div className="rounded-lg bg-purple-50 border border-purple-200 p-4">
          <p className="text-sm text-purple-800">
            <span className="font-semibold">Note:</span> Labels marked with &quot;OMD&quot; are
            awarded by your OMD administrator and cannot be removed. Contact your OMD administrator
            if you believe a label is incorrect.
          </p>
        </div>
      )}
    </div>
  );
}

