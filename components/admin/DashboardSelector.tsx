'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

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
  const [selectedOMD, setSelectedOMD] = useState<string>(currentOMDId || '');
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setSelectedOMD(currentOMDId || '');
  }, [currentOMDId]);

  const handleOMDChange = (omdId: string) => {
    if (omdId === 'all') {
      // Switch to super admin global view
      router.push('/admin');
    } else {
      // Switch to specific OMD view
      const omd = omds.find(o => o.id === omdId);
      if (omd) {
        // Navigate to a OMD-specific admin view
        // For now, just show businesses for that OMD
        router.push(`/admin?omd=${omd.slug}`);
      }
    }
    setSelectedOMD(omdId);
  };

  const isGlobalView = pathname === '/admin' || pathname.startsWith('/admin/omd-approvals') || pathname.startsWith('/admin/contact-inquiries') || pathname.startsWith('/admin/users');

  return (
    <div className="mb-6 flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">View:</span>
        <div className="relative">
          <select
            value={selectedOMD}
            onChange={(e) => handleOMDChange(e.target.value)}
            className="appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2 pr-10 text-sm font-medium text-gray-900 focus:border-blue-500 focus:outline-none"
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
      
      {isGlobalView && (
        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
          Super Admin View
        </span>
      )}
    </div>
  );
}

