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
    <select 
      value={currentArea}
      onChange={handleAreaChange}
      className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none bg-white"
    >
      <option value="">All Areas</option>
      {areas.map((area) => (
        <option key={area.id} value={area.id}>
          {area.name}
        </option>
      ))}
    </select>
  );
}

