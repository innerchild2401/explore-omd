'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Area {
  id: string;
  name: string;
  description: string | null;
  order_index: number;
}

interface AreasManagerProps {
  areas: Area[];
  omdId: string;
}

export default function AreasManager({ areas, omdId }: AreasManagerProps) {
  const router = useRouter();
  const supabase = createClient();
  
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [orderIndex, setOrderIndex] = useState(0);

  const resetForm = () => {
    setName('');
    setDescription('');
    setOrderIndex(0);
    setShowAdd(false);
    setEditingId(null);
  };

  const startEdit = (area: Area) => {
    setName(area.name);
    setDescription(area.description || '');
    setOrderIndex(area.order_index);
    setEditingId(area.id);
    setShowAdd(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    
    setLoading(true);
    try {
      if (editingId) {
        // Update existing area
        const { error } = await supabase
          .from('areas')
          .update({
            name: name.trim(),
            description: description.trim() || null,
            order_index: orderIndex,
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        // Create new area
        const { error } = await supabase
          .from('areas')
          .insert({
            omd_id: omdId,
            name: name.trim(),
            description: description.trim() || null,
            order_index: orderIndex,
          });

        if (error) throw error;
      }

      resetForm();
      router.refresh();
    } catch (error) {
      console.error('Error saving area:', error);
      alert(`Failed to ${editingId ? 'update' : 'add'} area`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this area? Businesses assigned to this area will have their area unset.')) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('areas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      router.refresh();
    } catch (error) {
      console.error('Error deleting area:', error);
      alert('Failed to delete area');
    } finally {
      setLoading(false);
    }
  };

  const sortedAreas = [...areas].sort((a, b) => {
    if (a.order_index !== b.order_index) {
      return a.order_index - b.order_index;
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-6">
      {/* Add/Edit Form */}
      {showAdd && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            {editingId ? 'Edit Area' : 'Add New Area'}
          </h3>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., City Center, Beachfront, Old Town"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this area"
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="order_index" className="block text-sm font-medium text-gray-700 mb-1">
                Display Order
              </label>
              <input
                type="number"
                id="order_index"
                value={orderIndex}
                onChange={(e) => setOrderIndex(parseInt(e.target.value) || 0)}
                min="0"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                disabled={loading}
              />
              <p className="mt-1 text-xs text-gray-500">Lower numbers appear first in lists</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSubmit}
                disabled={loading || !name.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : editingId ? 'Update Area' : 'Add Area'}
              </button>
              <button
                onClick={resetForm}
                disabled={loading}
                className="rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Areas List */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="text-xl font-semibold text-gray-900">Areas ({sortedAreas.length})</h2>
          {!showAdd && (
            <button
              onClick={() => setShowAdd(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
            >
              + Add Area
            </button>
          )}
        </div>

        {sortedAreas.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No areas defined yet. Click &quot;Add Area&quot; to create your first area.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {sortedAreas.map((area) => (
              <div key={area.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">{area.name}</h3>
                      <span className="text-xs text-gray-500">Order: {area.order_index}</span>
                    </div>
                    {area.description && (
                      <p className="mt-1 text-sm text-gray-600">{area.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(area)}
                      disabled={loading}
                      className="rounded-lg border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(area.id)}
                      disabled={loading}
                      className="rounded-lg border border-red-300 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

