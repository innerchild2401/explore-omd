'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface PricingCalendarModalProps {
  room: any;
  onClose: () => void;
}

export default function PricingCalendarModal({ room, onClose }: PricingCalendarModalProps) {
  const router = useRouter();
  const supabase = createClient();
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [pricingRules, setPricingRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form for adding new pricing rule
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [pricePerNight, setPricePerNight] = useState('');
  const [minStay, setMinStay] = useState('1');

  useEffect(() => {
    fetchPricingRules();
  }, []);

  const fetchPricingRules = async () => {
    try {
      const { data, error } = await supabase
        .from('room_pricing')
        .select('*')
        .eq('room_id', room.id)
        .order('start_date', { ascending: true });

      if (error) throw error;
      setPricingRules(data || []);
    } catch (err: any) {
      console.error('Error fetching pricing rules:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPricingRule = async () => {
    if (!startDate || !endDate || !pricePerNight) {
      setError('Please fill in all required fields');
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setError('End date must be after start date');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const { error: insertError } = await supabase
        .from('room_pricing')
        .insert({
          room_id: room.id,
          start_date: startDate,
          end_date: endDate,
          price_per_night: parseFloat(pricePerNight),
          min_stay: parseInt(minStay),
        });

      if (insertError) throw insertError;

      // Clear form
      setStartDate('');
      setEndDate('');
      setPricePerNight('');
      setMinStay('1');

      // Refresh pricing rules
      await fetchPricingRules();
      router.refresh();
    } catch (err: any) {
      console.error('Error adding pricing rule:', err);
      setError(err.message || 'Failed to add pricing rule');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Delete this pricing rule?')) return;

    try {
      const { error } = await supabase
        .from('room_pricing')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;

      await fetchPricingRules();
      router.refresh();
    } catch (err: any) {
      console.error('Error deleting rule:', err);
      setError(err.message);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTodayString = () => {
    return new Date().toISOString().split('T')[0];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Pricing Calendar</h2>
            <p className="text-sm text-gray-600">
              {room.name} • Base Price: ${room.base_price}/night
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Add New Pricing Rule */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Add Pricing Rule</h3>
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min={getTodayString()}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate || getTodayString()}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Price per Night *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={pricePerNight}
                    onChange={(e) => setPricePerNight(e.target.value)}
                    placeholder={`Default: $${room.base_price}`}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Min Stay (nights)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={minStay}
                    onChange={(e) => setMinStay(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
              )}

              <button
                onClick={handleAddPricingRule}
                disabled={saving}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300"
              >
                {saving ? 'Adding...' : 'Add Pricing Rule'}
              </button>
            </div>

            <div className="mt-4 rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
              <p className="font-medium">💡 How it works:</p>
              <ul className="ml-4 mt-2 list-disc space-y-1">
                <li>Set custom prices for specific date ranges (holidays, seasons, events)</li>
                <li>If no rule exists for a date, base price applies</li>
                <li>Most specific (shortest) date range takes priority if overlapping</li>
              </ul>
            </div>
          </div>

          {/* Existing Pricing Rules */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Pricing Rules ({pricingRules.length})
            </h3>

            {loading ? (
              <div className="py-8 text-center text-gray-500">Loading...</div>
            ) : pricingRules.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-gray-500">No custom pricing rules yet</p>
                <p className="mt-2 text-sm text-gray-400">
                  Base price of ${room.base_price} applies to all dates
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pricingRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {formatDate(rule.start_date)} → {formatDate(rule.end_date)}
                        </span>
                        {rule.min_stay > 1 && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                            Min {rule.min_stay}N
                          </span>
                        )}
                      </div>
                      <div className="text-lg font-bold text-blue-600">
                        ${rule.price_per_night}/night
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="ml-4 rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Pricing Templates */}
        <div className="mt-6 rounded-lg border border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50 p-6">
          <h3 className="mb-3 text-lg font-semibold text-gray-900">💡 Pro Tips</h3>
          <div className="grid gap-3 text-sm md:grid-cols-3">
            <div className="rounded-lg bg-white p-3">
              <p className="font-medium text-gray-900">🌴 Summer Season</p>
              <p className="text-gray-600">June-August: +30-50% higher prices</p>
            </div>
            <div className="rounded-lg bg-white p-3">
              <p className="font-medium text-gray-900">🎉 Holidays & Events</p>
              <p className="text-gray-600">Christmas, New Year: +50-100% surge</p>
            </div>
            <div className="rounded-lg bg-white p-3">
              <p className="font-medium text-gray-900">🍂 Low Season</p>
              <p className="text-gray-600">Off-peak: -20-30% to attract bookings</p>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-gray-600 px-6 py-2 font-semibold text-white hover:bg-gray-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

