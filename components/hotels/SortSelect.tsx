'use client';

import { ChangeEvent } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const SORT_OPTIONS = [
  { value: 'featured', label: 'Recomandate' },
  { value: 'price', label: 'Preț crescător' },
  { value: 'rating', label: 'Rating descrescător' },
  { value: 'name', label: 'Nume A-Z' },
];

export default function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get('sort') || 'featured';

  const handleSortChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    const { value } = event.target;

    if (value && value !== 'featured') {
      params.set('sort', value);
    } else {
      params.delete('sort');
    }

    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  };

  return (
    <div className="flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2.5 text-sm shadow-sm">
      <span className="flex items-center gap-1 font-medium text-gray-700">
        <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 7a1 1 0 011-1h10a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zm0 7a1 1 0 011-1h6a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" />
        </svg>
        Sortare
      </span>
      <select
        value={currentSort}
        onChange={handleSortChange}
        className="appearance-none bg-transparent pr-6 pl-2 text-sm font-medium text-blue-700 focus:outline-none"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
