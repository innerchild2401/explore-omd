'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Business {
  id: string;
  name: string;
  type: string;
  is_omd_member?: boolean;
  featured_order?: number | null;
}

interface FeaturedBusinessOrderProps {
  businesses: Business[];
  omdId: string;
}

export default function FeaturedBusinessOrder({ businesses, omdId }: FeaturedBusinessOrderProps) {
  const supabase = createClient();
  const [featuredBusinesses, setFeaturedBusinesses] = useState<{
    1: Business | null;
    2: Business | null;
    3: Business | null;
  }>({
    1: null,
    2: null,
    3: null,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Initialize featured businesses from props
  useEffect(() => {
    const featured: { 1: Business | null; 2: Business | null; 3: Business | null } = {
      1: null,
      2: null,
      3: null,
    };

    businesses.forEach((business) => {
      if (business.featured_order && business.featured_order >= 1 && business.featured_order <= 3) {
        featured[business.featured_order as 1 | 2 | 3] = business;
      }
    });

    setFeaturedBusinesses(featured);
  }, [businesses]);

  // Get available businesses (not already featured)
  const getAvailableBusinesses = () => {
    const featuredIds = Object.values(featuredBusinesses)
      .filter((b) => b !== null)
      .map((b) => b!.id);
    return businesses.filter((b) => !featuredIds.includes(b.id));
  };

  const handleSetFeatured = async (position: 1 | 2 | 3, businessId: string | null) => {
    setSaving(true);
    setMessage(null);

    try {
      // First, clear the current business at this position (if any)
      const currentBusiness = featuredBusinesses[position];
      if (currentBusiness) {
        const { error: clearError } = await supabase
          .from('businesses')
          .update({ featured_order: null })
          .eq('id', currentBusiness.id);

        if (clearError) throw clearError;
      }

      // If a new business is selected, set it to this position
      if (businessId) {
        // Check if this business is already featured at another position
        const existingPosition = Object.entries(featuredBusinesses).find(
          ([pos, biz]) => biz?.id === businessId && Number(pos) !== position
        );

        if (existingPosition) {
          // Clear the existing position
          const { error: clearExistingError } = await supabase
            .from('businesses')
            .update({ featured_order: null })
            .eq('id', businessId);

          if (clearExistingError) throw clearExistingError;
        }

        // Set the new business to this position
        const { error: setError } = await supabase
          .from('businesses')
          .update({ featured_order: position })
          .eq('id', businessId);

        if (setError) throw setError;
      }

      // Update local state
      const updated = { ...featuredBusinesses };
      if (businessId) {
        const business = businesses.find((b) => b.id === businessId);
        updated[position] = business || null;
      } else {
        updated[position] = null;
      }
      setFeaturedBusinesses(updated);

      setMessage({ type: 'success', text: 'Featured order updated successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('Error updating featured order:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to update featured order' });
    } finally {
      setSaving(false);
    }
  };

  const availableBusinesses = getAvailableBusinesses();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Featured Business Order</h2>
        <p className="text-sm text-gray-600">
          Set the first 3 businesses to be displayed. These will always appear first, followed by remaining members (random) and non-members (random).
        </p>
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        {([1, 2, 3] as const).map((position) => (
          <div key={position} className="flex items-center gap-4">
            <div className="w-12 flex-shrink-0">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-800 font-semibold">
                #{position}
              </span>
            </div>
            <div className="flex-1">
              <select
                value={featuredBusinesses[position]?.id || ''}
                onChange={(e) => handleSetFeatured(position, e.target.value || null)}
                disabled={saving}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">-- Select Business --</option>
                {featuredBusinesses[position] && (
                  <option value={featuredBusinesses[position]!.id}>
                    {featuredBusinesses[position]!.name} (Currently #{position})
                  </option>
                )}
                {availableBusinesses.map((business) => (
                  <option key={business.id} value={business.id}>
                    {business.name} ({business.type})
                    {business.is_omd_member && ' - OMD Member'}
                  </option>
                ))}
              </select>
            </div>
            {featuredBusinesses[position] && (
              <button
                onClick={() => handleSetFeatured(position, null)}
                disabled={saving}
                className="px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          <strong>Note:</strong> Only one business can be featured at each position (1, 2, or 3). 
          The remaining businesses will be displayed randomly within their groups (members first, then non-members).
        </p>
      </div>
    </div>
  );
}

