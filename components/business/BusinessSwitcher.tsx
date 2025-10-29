'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Business {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
}

interface BusinessSwitcherProps {
  currentBusinessSlug: string;
  omdSlug: string;
}

export default function BusinessSwitcher({ currentBusinessSlug, omdSlug }: BusinessSwitcherProps) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: omd } = await supabase
        .from('omds')
        .select('id')
        .eq('slug', omdSlug)
        .single();

      if (!omd) return;

      const { data: userBusinesses } = await supabase
        .from('businesses')
        .select('id, name, slug, type, status')
        .eq('owner_id', user.id)
        .eq('omd_id', omd.id)
        .order('name', { ascending: true });

      if (userBusinesses) {
        setBusinesses(userBusinesses);
      }
    } catch (error) {
      console.error('Error fetching businesses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBusinessChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSlug = e.target.value;
    if (newSlug !== currentBusinessSlug) {
      router.push(`/${omdSlug}/business/${newSlug}`);
    }
  };

  if (loading || businesses.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      <label htmlFor="business-select" className="text-sm font-medium text-gray-700">
        Business:
      </label>
      <select
        id="business-select"
        value={currentBusinessSlug}
        onChange={handleBusinessChange}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {businesses.map((business) => (
          <option key={business.id} value={business.slug}>
            {business.name} ({business.type.charAt(0).toUpperCase() + business.type.slice(1)})
            {business.status === 'pending' && ' - Pending'}
          </option>
        ))}
      </select>
    </div>
  );
}

