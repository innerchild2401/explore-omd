'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface OMD {
  id: string;
  name: string;
  slug: string;
}

interface DashboardSelectorProps {
  omds: OMD[];
  currentOMDId?: string | null;
}

export default function DashboardSelector({ omds, currentOMDId }: DashboardSelectorProps) {
  const [selectedOMD, setSelectedOMD] = useState<string>(currentOMDId ?? 'all');
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setSelectedOMD(currentOMDId ?? 'all');
  }, [currentOMDId]);

  const updateSelection = useCallback(
    async (omdId: string) => {
      if (isUpdating) {
        return;
      }

      setIsUpdating(true);
      try {
        if (omdId === 'all') {
          const response = await fetch('/api/admin/active-omd', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
          });

          if (!response.ok) {
            throw new Error('Failed to reset view');
          }

          setSelectedOMD('all');
          // Always go back to the global dashboard
          router.push('/admin');
        } else {
          const response = await fetch('/api/admin/active-omd', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ omdId }),
          });

          if (!response.ok) {
            throw new Error('Failed to switch OMD');
          }

          setSelectedOMD(omdId);

          router.refresh();
        }
      } catch (error) {
        console.error('Failed to switch admin view:', error);
      } finally {
        setIsUpdating(false);
      }
    },
    [isUpdating, router]
  );

  const handleOMDChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const omdId = event.target.value;
    void updateSelection(omdId);
  };

  const handleReset = () => {
    void updateSelection('all');
  };

  const isGlobalView = selectedOMD === 'all';

  return (
    <div className="mb-6 flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">View:</span>
        <div className="relative">
          <select
            value={selectedOMD}
            onChange={handleOMDChange}
            disabled={isUpdating}
            className="appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2 pr-10 text-sm font-medium text-gray-900 focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
          >
            <option value="all">All OMDs (Global View)</option>
            {omds.map((omd) => (
              <option key={omd.id} value={omd.id}>
                {omd.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
            </svg>
          </div>
        </div>
      </div>

      {isGlobalView ? (
        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
          Super Admin View
        </span>
      ) : (
        <button
          type="button"
          onClick={handleReset}
          disabled={isUpdating}
          className="inline-flex items-center rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ← Back to Super Admin View
        </button>
      )}
    </div>
  );
}

