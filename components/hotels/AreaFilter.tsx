'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';

interface Area {
  id: string;
  name: string;
}

interface AreaFilterProps {
  areas: Area[];
}

export default function AreaFilter({ areas }: AreaFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentArea = searchParams.get('area') || '';

  const handleAreaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) {
      params.set('area', e.target.value);
    } else {
      params.delete('area');
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  if (!areas || areas.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2.5 text-sm shadow-sm">
      <span className="flex items-center gap-1 font-medium text-gray-700">
        <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.828 0L6.343 16.657a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Stațiuni
      </span>
      <select
        value={currentArea}
        onChange={handleAreaChange}
        className="appearance-none bg-transparent pr-6 pl-2 text-sm font-medium text-blue-700 focus:outline-none"
      >
        <option value="">Toate</option>
        {areas.map((area) => (
          <option key={area.id} value={area.id}>
            {area.name}
          </option>
        ))}
      </select>
    </div>
  );
}

