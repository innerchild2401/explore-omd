'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface TimeSlotManagerProps {
  experienceId: string;
  businessId: string;
  onUpdate: () => void;
}

interface TimeSlot {
  id: string;
  experience_id: string;
  start_date: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  max_participants: number;
  price_per_person: number;
  is_available: boolean;
  notes: string | null;
}

export default function TimeSlotManager({ experienceId, businessId, onUpdate }: TimeSlotManagerProps) {
  const supabase = useMemo(() => createClient(), []);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    start_date: '',
    start_time: '',
    end_time: '',
    duration_minutes: '',
    max_participants: '10',
    price_per_person: '',
    notes: '',
  });

  const loadTimeSlots = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('experience_time_slots')
        .select('*')
        .eq('experience_id', experienceId)
        .order('start_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      setTimeSlots(data || []);
    } catch (error) {
      console.error('Error loading time slots:', error);
    }
  }, [experienceId, supabase]);

  useEffect(() => {
    void loadTimeSlots();
  }, [loadTimeSlots]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const slotData = {
        experience_id: experienceId,
        start_date: formData.start_date,
        start_time: formData.start_time,
        end_time: formData.end_time || null,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
        max_participants: parseInt(formData.max_participants),
        price_per_person: parseFloat(formData.price_per_person),
        notes: formData.notes || null,
        is_available: true,
      };

      if (editingId) {
        // Update existing slot
        const { error } = await supabase
          .from('experience_time_slots')
          .update(slotData)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        // Create new slot
        const { error } = await supabase
          .from('experience_time_slots')
          .insert(slotData);

        if (error) throw error;
      }

      // Reset form
      resetForm();
      loadTimeSlots();
      onUpdate();
    } catch (error) {
      console.error('Error saving time slot:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      start_date: '',
      start_time: '',
      end_time: '',
      duration_minutes: '',
      max_participants: '10',
      price_per_person: '',
      notes: '',
    });
    setEditingId(null);
    setShowAddForm(false);
  };

  const handleEdit = (slot: TimeSlot) => {
    setEditingId(slot.id);
    setFormData({
      start_date: slot.start_date,
      start_time: slot.start_time,
      end_time: slot.end_time || '',
      duration_minutes: slot.duration_minutes?.toString() || '',
      max_participants: slot.max_participants.toString(),
      price_per_person: slot.price_per_person.toString(),
      notes: slot.notes || '',
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this time slot?')) return;

    try {
      const { error } = await supabase
        .from('experience_time_slots')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadTimeSlots();
      onUpdate();
    } catch (error) {
      console.error('Error deleting time slot:', error);
    }
  };

  const toggleAvailability = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('experience_time_slots')
        .update({ is_available: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      loadTimeSlots();
      onUpdate();
    } catch (error) {
      console.error('Error toggling availability:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Time Slots</h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage scheduled times for your experience
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
          >
            {showAddForm ? 'Cancel' : '+ Add Time Slot'}
          </button>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 border border-blue-200 rounded-lg bg-blue-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingId ? 'Edit Time Slot' : 'Add New Time Slot'}
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time *
                </label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                  placeholder="e.g., 180"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Participants *
                </label>
                <input
                  type="number"
                  value={formData.max_participants}
                  onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
                  min="1"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price Per Person *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price_per_person}
                  onChange={(e) => setFormData({ ...formData, price_per_person: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                placeholder="e.g., Special requirements, instructions for guests..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>

            <div className="mt-4 flex gap-3">
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Time Slots List */}
        <div className="space-y-4">
          {timeSlots.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No time slots yet. Add your first time slot to get started.</p>
            </div>
          ) : (
            timeSlots.map((slot) => (
              <div key={slot.id} className={`p-4 border rounded-lg ${slot.is_available ? 'border-gray-200 bg-white' : 'border-gray-300 bg-gray-50'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold text-gray-900">
                        {new Date(slot.start_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="text-blue-600 font-medium">
                        {slot.start_time}
                        {slot.end_time && ` - ${slot.end_time}`}
                      </span>
                      {!slot.is_available && (
                        <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded">
                          Unavailable
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Price: </span>
                        ${slot.price_per_person}
                      </div>
                      <div>
                        <span className="font-medium">Capacity: </span>
                        {slot.max_participants}
                      </div>
                      {slot.duration_minutes && (
                        <div>
                          <span className="font-medium">Duration: </span>
                          {slot.duration_minutes} min
                        </div>
                      )}
                    </div>
                    {slot.notes && (
                      <p className="mt-2 text-sm text-gray-600">{slot.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(slot)}
                      className="px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggleAvailability(slot.id, slot.is_available)}
                      className={`px-3 py-1 text-sm font-medium rounded ${
                        slot.is_available
                          ? 'text-yellow-600 hover:bg-yellow-50'
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                    >
                      {slot.is_available ? 'Unavailable' : 'Available'}
                    </button>
                    <button
                      onClick={() => handleDelete(slot.id)}
                      className="px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50 rounded"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
