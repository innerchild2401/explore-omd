import AmenityIcon from '@/components/ui/AmenityIcon';

interface AmenitiesListProps {
  amenities: Array<{
    id: string;
    name: string;
    icon?: string;
    category?: string;
  }>;
}

export default function AmenitiesList({ amenities }: AmenitiesListProps) {
  // Group amenities by category
  const grouped = amenities.reduce((acc, amenity) => {
    const category = amenity.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(amenity);
    return acc;
  }, {} as { [key: string]: typeof amenities });

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category}>
          <h3 className="mb-3 font-semibold text-gray-900 capitalize">{category}</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((amenity) => (
              <div
                key={amenity.id}
                className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white/70 p-3 shadow-sm transition hover:border-blue-100 hover:bg-blue-50/60"
              >
                <AmenityIcon icon={amenity.icon} variant="sm" />
                <span className="flex-1 min-w-0 text-sm font-medium text-gray-800 leading-snug">
                  {amenity.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

