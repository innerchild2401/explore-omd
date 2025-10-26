import { MapPin, Navigation } from 'lucide-react';

interface LandmarksListProps {
  landmarks: Array<{
    name: string;
    distance_km: number;
  }>;
}

export default function LandmarksList({ landmarks }: LandmarksListProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {landmarks.map((landmark, index) => (
        <div
          key={index}
          className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2">
              <MapPin className="h-5 w-5 text-blue-600" />
            </div>
            <span className="font-medium text-gray-900">{landmark.name}</span>
          </div>
          <div className="flex items-center gap-1 text-gray-600">
            <Navigation className="h-4 w-4" />
            <span className="text-sm">{landmark.distance_km} km</span>
          </div>
        </div>
      ))}
    </div>
  );
}

