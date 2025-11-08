'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import AmenityIcon from '@/components/ui/AmenityIcon';

interface Amenity {
  id: string;
  name: string;
  category: 'general' | 'room' | 'facility';
  icon: string | null;
}

interface AmenitiesManagerProps {
  amenities: Amenity[];
  omdId: string;
}

export default function AmenitiesManager({ amenities, omdId }: AmenitiesManagerProps) {
  const router = useRouter();
  const supabase = createClient();
  
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'general' | 'room' | 'facility'>('general');
  const [icon, setIcon] = useState('');

  const handleAdd = async () => {
    if (!name.trim()) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('omd_amenities')
        .insert({
          omd_id: omdId,
          name: name.trim(),
          category,
          icon: icon.trim() || null,
        });

      if (error) throw error;

      setName('');
      setIcon('');
      setShowAdd(false);
      router.refresh();
    } catch (error) {
      console.error('Error adding amenity:', error);
      alert('Failed to add amenity');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!name.trim()) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('omd_amenities')
        .update({
          name: name.trim(),
          category,
          icon: icon.trim() || null,
        })
        .eq('id', id);

      if (error) throw error;

      setName('');
      setIcon('');
      setEditingId(null);
      router.refresh();
    } catch (error) {
      console.error('Error updating amenity:', error);
      alert('Failed to update amenity');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this amenity?')) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('omd_amenities')
        .delete()
        .eq('id', id);

      if (error) throw error;
      router.refresh();
    } catch (error) {
      console.error('Error deleting amenity:', error);
      alert('Failed to delete amenity');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (amenity: Amenity) => {
    setEditingId(amenity.id);
    setName(amenity.name);
    setCategory(amenity.category);
    setIcon(amenity.icon || '');
    setShowAdd(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName('');
    setIcon('');
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'general': return 'bg-blue-100 text-blue-800';
      case 'room': return 'bg-green-100 text-green-800';
      case 'facility': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const groupedAmenities = {
    general: amenities.filter(a => a.category === 'general'),
    room: amenities.filter(a => a.category === 'room'),
    facility: amenities.filter(a => a.category === 'facility'),
  };

  return (
    <div className="space-y-6">
      {/* Add New Button */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            setShowAdd(!showAdd);
            setEditingId(null);
            setName('');
            setIcon('');
          }}
          className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
        >
          + Add Amenity
        </button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="rounded-lg bg-white p-6 shadow border border-gray-200">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Add New Amenity</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Amenity name"
              className="rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
            >
              <option value="general">General</option>
              <option value="room">Room</option>
              <option value="facility">Facility</option>
            </select>
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="Icon (emoji or text)"
              className="rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <button
              onClick={() => setShowAdd(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={loading || !name.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-blue-300"
            >
              {loading ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {/* Amenities by Category */}
      {(['general', 'room', 'facility'] as const).map((cat) => (
        <div key={cat} className="rounded-lg bg-white p-6 shadow border border-gray-200">
          <h3 className="mb-4 text-xl font-semibold text-gray-900 capitalize">
            {cat} Amenities ({groupedAmenities[cat].length})
          </h3>

          {groupedAmenities[cat].length === 0 ? (
            <p className="text-gray-500">No {cat} amenities yet</p>
          ) : (
            <div className="space-y-2">
              {groupedAmenities[cat].map((amenity) => (
                <div key={amenity.id}>
                  {editingId === amenity.id ? (
                    <div className="grid gap-3 rounded-lg border border-blue-300 bg-blue-50 p-3 md:grid-cols-3">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                      />
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as any)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="general">General</option>
                        <option value="room">Room</option>
                        <option value="facility">Facility</option>
                      </select>
                      <input
                        type="text"
                        value={icon}
                        onChange={(e) => setIcon(e.target.value)}
                        placeholder="Icon"
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                      />
                      <div className="flex gap-2 md:col-span-3">
                        <button
                          onClick={cancelEdit}
                          className="rounded-lg border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleUpdate(amenity.id)}
                          disabled={loading}
                          className="rounded-lg bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
                        >
                          {loading ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <div className="flex items-center gap-3">
                        <AmenityIcon icon={amenity.icon} variant="sm" className="bg-white text-blue-600 border border-blue-100" />
                        <span className="font-medium text-gray-900 leading-snug">{amenity.name}</span>
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${getCategoryColor(amenity.category)}`}>
                          {amenity.category}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(amenity)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(amenity.id)}
                          disabled={loading}
                          className="text-red-600 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

