'use client';

import Link from 'next/link';

interface RoomCardProps {
  room: any;
  hotelSlug: string;
  omdSlug: string;
}

const formatBedConfiguration = (config: any): string => {
  if (typeof config === 'string') return config;
  if (!config || typeof config !== 'object') return '';
  
  // Convert object like {queen: 2, single: 1} to "2 Queen, 1 Single"
  return Object.entries(config)
    .map(([type, count]) => `${count} ${type.charAt(0).toUpperCase() + type.slice(1)}`)
    .join(', ');
};

export default function RoomCard({ room, hotelSlug, omdSlug }: RoomCardProps) {
  const mainImage = room.images?.[0] || '/placeholder-room.jpg';

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="grid gap-4 md:grid-cols-3">
        {/* Room Image */}
        <div className="relative h-64 md:h-full md:col-span-1">
          <img
            src={mainImage}
            alt={room.name}
            className="h-full w-full object-cover"
          />
        </div>

        {/* Room Info */}
        <div className="p-6 md:col-span-2">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="mb-2 text-2xl font-bold text-gray-900">{room.name}</h3>
              <p className="mb-4 text-sm capitalize text-gray-600">
                {room.room_type.replace('_', ' ')}
              </p>

              {/* Room Features */}
              <div className="mb-4 flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-gray-700">
                  <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span>{room.max_occupancy} {room.max_occupancy === 1 ? 'Guest' : 'Guests'}</span>
                </div>
                {room.size_sqm && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                    <span>{room.size_sqm} m²</span>
                  </div>
                )}
                {room.bed_configuration && formatBedConfiguration(room.bed_configuration) && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <span>{formatBedConfiguration(room.bed_configuration)}</span>
                  </div>
                )}
              </div>

              {/* Room Amenities */}
              {room.room_amenities && room.room_amenities.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    {room.room_amenities.slice(0, 5).map((amenity: string, idx: number) => (
                      <span
                        key={idx}
                        className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700"
                      >
                        {amenity}
                      </span>
                    ))}
                    {room.room_amenities.length > 5 && (
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
                        +{room.room_amenities.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Price & Booking */}
            <div className="ml-4 text-right">
              <div className="mb-2">
                <div className="text-3xl font-bold text-gray-900">€{room.base_price}</div>
                <div className="text-sm text-gray-600">per night</div>
              </div>
              {room.quantity && (
                <div className="mb-3 text-sm text-gray-600">
                  {room.quantity} {room.quantity === 1 ? 'room' : 'rooms'} available
                </div>
              )}
              <Link
                href={`/${omdSlug}/hotels/${hotelSlug}/book?room=${room.id}`}
                className="inline-block rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Book Now
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

