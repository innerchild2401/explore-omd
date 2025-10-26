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
              <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="font-medium text-gray-900">{landmark.name}</span>
          </div>
          <div className="flex items-center gap-1 text-gray-600">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <span className="text-sm">{landmark.distance_km} km</span>
          </div>
        </div>
      ))}
    </div>
  );
}

