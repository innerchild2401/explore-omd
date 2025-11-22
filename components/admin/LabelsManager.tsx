'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface LabelCategory {
  id: string;
  name: string;
  description: string | null;
  order_index: number;
  is_active: boolean;
}

interface Label {
  id: string;
  name: string;
  description: string | null;
  display_name: string | null;
  business_types: ('hotel' | 'restaurant' | 'experience')[];
  is_omd_awarded_only: boolean;
  order_index: number;
  is_active: boolean;
  label_categories?: {
    id: string;
    name: string;
    description: string | null;
  };
}

interface BusinessLabel {
  id: string;
  business_id: string;
  label_id: string;
  is_omd_awarded: boolean;
  created_at: string;
  labels?: Label;
}

interface Business {
  id: string;
  name: string;
  type: 'hotel' | 'restaurant' | 'experience';
  slug: string;
}

interface LabelsManagerProps {
  omdId: string | null;
  userRole: string;
}

type Tab = 'categories' | 'labels' | 'businesses';

export default function LabelsManager({ omdId, userRole }: LabelsManagerProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('categories');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Categories state
  const [categories, setCategories] = useState<LabelCategory[]>([]);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<LabelCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    order_index: 0,
    is_active: true,
  });

  // Labels state
  const [labels, setLabels] = useState<Label[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showLabelForm, setShowLabelForm] = useState(false);
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);
  const [labelForm, setLabelForm] = useState({
    category_id: '',
    name: '',
    description: '',
    display_name: '',
    business_types: [] as ('hotel' | 'restaurant' | 'experience')[],
    is_omd_awarded_only: false,
    order_index: 0,
    is_active: true,
  });

  // Business labels state
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [businessLabels, setBusinessLabels] = useState<BusinessLabel[]>([]);
  const [availableLabels, setAvailableLabels] = useState<Label[]>([]);

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 'categories') {
      loadCategories();
    } else if (activeTab === 'labels') {
      loadLabels();
      if (categories.length === 0) loadCategories();
    } else if (activeTab === 'businesses') {
      loadBusinesses();
      loadLabels();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Load business labels when business is selected
  useEffect(() => {
    if (activeTab === 'businesses' && selectedBusinessId) {
      loadBusinessLabels(selectedBusinessId);
      loadAvailableLabels(selectedBusinessId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBusinessId, activeTab]);

  const loadCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/labels/categories');
      if (!res.ok) throw new Error('Failed to load categories');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const loadLabels = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = selectedCategoryId
        ? `/api/labels?category_id=${selectedCategoryId}`
        : '/api/labels';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load labels');
      const data = await res.json();
      setLabels(data.labels || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load labels');
    } finally {
      setLoading(false);
    }
  };

  const loadBusinesses = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = omdId ? `/api/admin/businesses?omd_id=${omdId}` : '/api/admin/businesses';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load businesses');
      const data = await res.json();
      setBusinesses(data.businesses || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load businesses');
    } finally {
      setLoading(false);
    }
  };

  const loadBusinessLabels = async (businessId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/businesses/${businessId}/labels`);
      if (!res.ok) throw new Error('Failed to load business labels');
      const data = await res.json();
      setBusinessLabels(data.labels || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load business labels');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableLabels = async (businessId: string) => {
    // Get business type first
    const business = businesses.find(b => b.id === businessId);
    if (!business) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/labels?business_type=${business.type}`);
      if (!res.ok) throw new Error('Failed to load available labels');
      const data = await res.json();
      setAvailableLabels(data.labels || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load available labels');
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = editingCategory
        ? `/api/labels/categories/${editingCategory.id}`
        : '/api/labels/categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryForm),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save category');
      }

      setShowCategoryForm(false);
      setEditingCategory(null);
      setCategoryForm({ name: '', description: '', order_index: 0, is_active: true });
      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  const handleLabelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = editingLabel
        ? `/api/labels/${editingLabel.id}`
        : '/api/labels';
      const method = editingLabel ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(labelForm),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save label');
      }

      setShowLabelForm(false);
      setEditingLabel(null);
      setLabelForm({
        category_id: '',
        name: '',
        description: '',
        display_name: '',
        business_types: [],
        is_omd_awarded_only: false,
        order_index: 0,
        is_active: true,
      });
      await loadLabels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save label');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure? This will delete all labels in this category.')) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/labels/categories/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete category');
      await loadCategories();
      if (selectedCategoryId === id) {
        setSelectedCategoryId(null);
        await loadLabels();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLabel = async (id: string) => {
    if (!confirm('Are you sure? This will remove this label from all businesses.')) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/labels/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete label');
      await loadLabels();
      if (selectedBusinessId) {
        await loadBusinessLabels(selectedBusinessId);
        await loadAvailableLabels(selectedBusinessId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete label');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLabelToBusiness = async (labelId: string) => {
    if (!selectedBusinessId) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/businesses/${selectedBusinessId}/labels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label_ids: [labelId] }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add label');
      }

      await loadBusinessLabels(selectedBusinessId);
      await loadAvailableLabels(selectedBusinessId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add label');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLabelFromBusiness = async (labelId: string) => {
    if (!selectedBusinessId) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/businesses/${selectedBusinessId}/labels?label_id=${labelId}`,
        { method: 'DELETE' }
      );

      if (!res.ok) throw new Error('Failed to remove label');

      await loadBusinessLabels(selectedBusinessId);
      await loadAvailableLabels(selectedBusinessId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove label');
    } finally {
      setLoading(false);
    }
  };

  const startEditCategory = (category: LabelCategory) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      order_index: category.order_index,
      is_active: category.is_active,
    });
    setShowCategoryForm(true);
  };

  const startEditLabel = (label: Label) => {
    setEditingLabel(label);
    setLabelForm({
      category_id: label.label_categories?.id || '',
      name: label.name,
      description: label.description || '',
      display_name: label.display_name || '',
      business_types: label.business_types,
      is_omd_awarded_only: label.is_omd_awarded_only,
      order_index: label.order_index,
      is_active: label.is_active,
    });
    setShowLabelForm(true);
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {(['categories', 'labels', 'businesses'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 px-1 py-4 text-sm font-medium capitalize ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab === 'categories' && 'Categories'}
              {tab === 'labels' && 'Labels'}
              {tab === 'businesses' && 'Business Labels'}
            </button>
          ))}
        </nav>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800">
          {error}
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Label Categories</h2>
              <p className="mt-1 text-gray-600">
                Organize labels into categories. Categories help businesses find relevant labels.
              </p>
            </div>
            <button
              onClick={() => {
                setShowCategoryForm(true);
                setEditingCategory(null);
                setCategoryForm({ name: '', description: '', order_index: 0, is_active: true });
              }}
              className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
            >
              + Add Category
            </button>
          </div>

          {showCategoryForm && (
            <div className="rounded-lg bg-white p-6 shadow border border-gray-200">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h3>
              <form onSubmit={handleCategorySubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Order Index
                    </label>
                    <input
                      type="number"
                      value={categoryForm.order_index}
                      onChange={(e) => setCategoryForm({ ...categoryForm, order_index: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center pt-8">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={categoryForm.is_active}
                        onChange={(e) => setCategoryForm({ ...categoryForm, is_active: e.target.checked })}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Active</span>
                    </label>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCategoryForm(false);
                      setEditingCategory(null);
                    }}
                    className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !categoryForm.name.trim()}
                    className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-blue-300"
                  >
                    {loading ? 'Saving...' : editingCategory ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="rounded-lg bg-white p-6 shadow border border-gray-200">
            {categories.length === 0 ? (
              <p className="text-gray-500">No categories yet. Create your first category above.</p>
            ) : (
              <div className="space-y-3">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4"
                  >
                    <div>
                      <h4 className="font-semibold text-gray-900">{category.name}</h4>
                      {category.description && (
                        <p className="mt-1 text-sm text-gray-600">{category.description}</p>
                      )}
                      <div className="mt-2 flex gap-2">
                        <span className="text-xs text-gray-500">Order: {category.order_index}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          category.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {category.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEditCategory(category)}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-700 font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Labels Tab */}
      {activeTab === 'labels' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Labels</h2>
              <p className="mt-1 text-gray-600">
                Manage labels that businesses can use to describe their offerings.
              </p>
            </div>
            <button
              onClick={() => {
                setShowLabelForm(true);
                setEditingLabel(null);
                setLabelForm({
                  category_id: selectedCategoryId || '',
                  name: '',
                  description: '',
                  display_name: '',
                  business_types: [],
                  is_omd_awarded_only: false,
                  order_index: 0,
                  is_active: true,
                });
              }}
              className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
            >
              + Add Label
            </button>
          </div>

          {/* Category Filter */}
          <div className="rounded-lg bg-white p-4 shadow border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Category
            </label>
            <select
              value={selectedCategoryId || ''}
              onChange={(e) => {
                setSelectedCategoryId(e.target.value || null);
                loadLabels();
              }}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {showLabelForm && (
            <div className="rounded-lg bg-white p-6 shadow border border-gray-200">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                {editingLabel ? 'Edit Label' : 'Add New Label'}
              </h3>
              <form onSubmit={handleLabelSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={labelForm.category_id}
                    onChange={(e) => setLabelForm({ ...labelForm, category_id: e.target.value })}
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select a category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={labelForm.name}
                    onChange={(e) => setLabelForm({ ...labelForm, name: e.target.value })}
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={labelForm.display_name}
                    onChange={(e) => setLabelForm({ ...labelForm, display_name: e.target.value })}
                    placeholder="Optional custom display name"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={labelForm.description}
                    onChange={(e) => setLabelForm({ ...labelForm, description: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Types
                  </label>
                  <div className="flex gap-4">
                    {(['hotel', 'restaurant', 'experience'] as const).map((type) => (
                      <label key={type} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={labelForm.business_types.includes(type)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setLabelForm({
                                ...labelForm,
                                business_types: [...labelForm.business_types, type],
                              });
                            } else {
                              setLabelForm({
                                ...labelForm,
                                business_types: labelForm.business_types.filter(t => t !== type),
                              });
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700 capitalize">{type}</span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Leave empty to make available to all business types
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Order Index
                    </label>
                    <input
                      type="number"
                      value={labelForm.order_index}
                      onChange={(e) => setLabelForm({ ...labelForm, order_index: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center pt-8">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={labelForm.is_omd_awarded_only}
                        onChange={(e) => setLabelForm({ ...labelForm, is_omd_awarded_only: e.target.checked })}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">OMD Awarded Only</span>
                    </label>
                  </div>
                  <div className="flex items-center pt-8">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={labelForm.is_active}
                        onChange={(e) => setLabelForm({ ...labelForm, is_active: e.target.checked })}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Active</span>
                    </label>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowLabelForm(false);
                      setEditingLabel(null);
                    }}
                    className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !labelForm.name.trim() || !labelForm.category_id}
                    className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-blue-300"
                  >
                    {loading ? 'Saving...' : editingLabel ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="rounded-lg bg-white p-6 shadow border border-gray-200">
            {labels.length === 0 ? (
              <p className="text-gray-500">No labels yet. Create your first label above.</p>
            ) : (
              <div className="space-y-3">
                {labels.map((label) => (
                  <div
                    key={label.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900">
                          {label.display_name || label.name}
                        </h4>
                        {label.is_omd_awarded_only && (
                          <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800">
                            OMD Only
                          </span>
                        )}
                      </div>
                      {label.description && (
                        <p className="mt-1 text-sm text-gray-600">{label.description}</p>
                      )}
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {label.label_categories && (
                          <span className="text-xs text-gray-500">
                            Category: {label.label_categories.name}
                          </span>
                        )}
                        {label.business_types.length > 0 && (
                          <span className="text-xs text-gray-500">
                            Types: {label.business_types.join(', ')}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">Order: {label.order_index}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          label.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {label.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEditLabel(label)}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteLabel(label.id)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-700 font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Business Labels Tab */}
      {activeTab === 'businesses' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Business Labels</h2>
            <p className="mt-1 text-gray-600">
              View and manage labels assigned to businesses. You can add or remove labels to ensure relevance.
            </p>
          </div>

          {/* Business Selector */}
          <div className="rounded-lg bg-white p-4 shadow border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Business
            </label>
            <select
              value={selectedBusinessId || ''}
              onChange={(e) => setSelectedBusinessId(e.target.value || null)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Select a business...</option>
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name} ({business.type})
                </option>
              ))}
            </select>
          </div>

          {selectedBusinessId && (
            <>
              {/* Current Labels */}
              <div className="rounded-lg bg-white p-6 shadow border border-gray-200">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">Current Labels</h3>
                {businessLabels.length === 0 ? (
                  <p className="text-gray-500">This business has no labels yet.</p>
                ) : (
                  <div className="space-y-2">
                    {businessLabels.map((bl) => (
                      <div
                        key={bl.id}
                        className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3"
                      >
                        <div>
                          <span className="font-medium text-gray-900">
                            {bl.labels?.display_name || bl.labels?.name}
                          </span>
                          {bl.is_omd_awarded && (
                            <span className="ml-2 text-xs px-2 py-1 rounded bg-purple-100 text-purple-800">
                              OMD Awarded
                            </span>
                          )}
                          {bl.labels?.label_categories && (
                            <span className="ml-2 text-xs text-gray-500">
                              ({bl.labels.label_categories.name})
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveLabelFromBusiness(bl.label_id)}
                          disabled={loading}
                          className="text-red-600 hover:text-red-700 font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Available Labels */}
              <div className="rounded-lg bg-white p-6 shadow border border-gray-200">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">Available Labels</h3>
                {availableLabels.length === 0 ? (
                  <p className="text-gray-500">No available labels for this business type.</p>
                ) : (
                  <div className="space-y-2">
                    {availableLabels
                      .filter(
                        (label) =>
                          !businessLabels.some((bl) => bl.label_id === label.id)
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
                            {label.is_omd_awarded_only && (
                              <span className="ml-2 text-xs px-2 py-1 rounded bg-purple-100 text-purple-800">
                                OMD Only
                              </span>
                            )}
                            {label.label_categories && (
                              <span className="ml-2 text-xs text-gray-500">
                                ({label.label_categories.name})
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleAddLabelToBusiness(label.id)}
                            disabled={loading}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Add
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

