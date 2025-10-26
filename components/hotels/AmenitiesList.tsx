import { 
  Wifi, Coffee, Tv, Wind, Utensils, Car, 
  Dumbbell, Wine, Waves, Sparkles, Shield, 
  Clock, Baby, Briefcase, Dog 
} from 'lucide-react';

interface AmenitiesListProps {
  amenities: Array<{
    id: string;
    name: string;
    icon?: string;
    category?: string;
  }>;
}

const getAmenityIcon = (iconName?: string) => {
  const icons: { [key: string]: any } = {
    wifi: Wifi,
    coffee: Coffee,
    tv: Tv,
    ac: Wind,
    restaurant: Utensils,
    parking: Car,
    gym: Dumbbell,
    bar: Wine,
    pool: Waves,
    spa: Sparkles,
    security: Shield,
    reception: Clock,
    kids: Baby,
    business: Briefcase,
    pets: Dog,
  };

  const IconComponent = iconName ? icons[iconName.toLowerCase()] : null;
  
  if (IconComponent) {
    return <IconComponent className="h-5 w-5 text-blue-600" />;
  }
  
  // Default icon
  return (
    <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
};

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
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {items.map((amenity) => (
              <div key={amenity.id} className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                {getAmenityIcon(amenity.icon)}
                <span className="text-gray-700">{amenity.name}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

