'use client';

import { useMemo, useState } from 'react';
import { formatPrice } from '@/lib/utils';
import RoomImageCarousel from './RoomImageCarousel';
import BookingModal from './BookingModal';
import AmenityIcon from '@/components/ui/AmenityIcon';

interface RoomCardProps {
  room: any;
  hotelSlug: string;
  omdSlug: string;
  hotelId: string;
  amenities?: Array<{ id: string; name: string; icon?: string }>;
  searchParams?: {
    checkIn?: string;
    checkOut?: string;
    adults?: string;
    children?: string;
  };
}

const formatBedConfigurationList = (config: any): string[] => {
  if (!config) return [];

  if (typeof config === 'string') {
    return config
      .split(/[,;/]+|\s\+\s/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof config === 'object') {
    return Object.entries(config)
      .map(([type, count]) => {
        const countNumber = Number(count);
        const normalizedType = type.replace(/_/g, ' ');
        return `${countNumber} ${normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1)}${countNumber > 1 ? 's' : ''}`.trim();
      })
      .filter(Boolean);
  }

  return [];
};

export default function RoomCard({ room, hotelSlug, omdSlug, hotelId, amenities = [], searchParams }: RoomCardProps) {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const bedConfigurations = useMemo(() => formatBedConfigurationList(room.bed_configuration), [room.bed_configuration]);
  
  // Check if room is available
  const isAvailable = room.availability ? room.availability.is_available : true;
  const availableQuantity = room.availability ? room.availability.available_quantity : room.quantity;
  const dynamicPrice = room.availability ? room.availability.dynamic_price : room.base_price;
  const minStayNights = room.availability ? room.availability.min_stay_nights : room.min_stay_nights || 1;
  
  // Check minimum stay requirement if dates are provided
  const meetsMinStay = searchParams?.checkIn && searchParams?.checkOut ? 
    (new Date(searchParams.checkOut).getTime() - new Date(searchParams.checkIn).getTime()) / (1000 * 60 * 60 * 24) >= minStayNights :
    true;
  
  const canBook = isAvailable && meetsMinStay && availableQuantity > 0;

  const amenityLookup = useMemo(() => {
    const map = new Map<string, { id: string; name: string; icon?: string | null }>();
    (amenities || []).forEach((amenity) => {
      if (amenity?.id) {
        map.set(amenity.id, { id: amenity.id, name: amenity.name, icon: amenity.icon });
      }
    });
    return map;
  }, [amenities]);

  const normalizedRoomAmenities = useMemo(() => {
    const list = (room.room_amenities || []) as Array<string | Record<string, any>>;

    const toAmenity = (item: string | Record<string, any> | null | undefined) => {
      if (!item) return null;

      if (typeof item === 'string') {
        const match = amenityLookup.get(item);
        if (match) return match;
        return { id: item, name: item.replace(/_/g, ' '), icon: undefined };
      }

      if (typeof item === 'object') {
        const possibleId = item.id || item.amenity_id || item.key || item.slug;
        const id = typeof possibleId === 'string' ? possibleId : JSON.stringify(item);
        const match = typeof possibleId === 'string' ? amenityLookup.get(possibleId) : undefined;
        const nameCandidate = item.name || item.label || match?.name || id;
        return {
          id,
          name: typeof nameCandidate === 'string' ? nameCandidate : String(nameCandidate),
          icon: item.icon || match?.icon,
        };
      }

      return null;
    };

    return list
      .map(toAmenity)
      .filter((item): item is { id: string; name: string; icon?: string | null } => Boolean(item));
  }, [amenityLookup, room.room_amenities]);

  const formatAmenityName = (amenity: { id: string; name: string }) => {
    const candidates = [
      amenity.name,
      amenityLookup.get(amenity.id)?.name,
      amenity.id,
    ].filter((val): val is string => Boolean(val));

    const cleaned = candidates
      .map((val) => val.trim())
      .find((val) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val));

    return (cleaned || 'Amenity').replace(/_/g, ' ');
  };
  
  return (
    <div
      className={`overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-md ${
        !canBook ? 'opacity-75' : ''
      }`}
    >
      <RoomImageCarousel images={room.images || []} roomName={room.name} />

      <div className="p-6 space-y-5">
        {/* Row 1 */}
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <h3 className="text-2xl font-bold text-gray-900 break-words">{room.name}</h3>
          </div>
          <div className="text-left md:text-right">
            <div className="text-3xl font-bold text-gray-900">{formatPrice(dynamicPrice, 'RON')}</div>
            {dynamicPrice !== room.base_price && (
              <div className="text-xs text-gray-500 line-through">{formatPrice(room.base_price, 'RON')}</div>
            )}
          </div>
        </div>

        {/* Row 2 */}
        <div className="flex flex-col gap-2 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
          <span className="capitalize break-words">{room.room_type.replace('_', ' ')}</span>
          <span className="font-medium text-gray-900 break-words">Per night</span>
        </div>

        {/* Row 3 */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setIsBookingModalOpen(true)}
            disabled={!canBook}
            className={`w-full rounded-lg px-6 py-3 text-center text-sm font-semibold transition-colors ${
              canBook ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {canBook ? 'Book Now' : 'Not Available'}
          </button>
          <div className="text-sm">
            {!canBook ? (
              <span className="font-semibold text-red-600">
                {!isAvailable
                  ? 'Fully booked'
                  : !meetsMinStay
                  ? `Minimum ${minStayNights} night${minStayNights > 1 ? 's' : ''} required`
                  : 'Not available'}
              </span>
            ) : (
              <span className="text-green-600">
                {availableQuantity} {availableQuantity === 1 ? 'room' : 'rooms'} available
              </span>
            )}
          </div>
          {minStayNights > 1 && searchParams?.checkIn && searchParams?.checkOut && (
            <div className="text-xs text-gray-500">
              Min. {minStayNights} night{minStayNights > 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Row 4 */}
        <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3 text-sm text-gray-700">
          <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 break-words">
            <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            {room.max_occupancy} {room.max_occupancy === 1 ? 'Guest' : 'Guests'}
          </span>
          {room.size_sqm && (
            <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 break-words">
              <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
              {room.size_sqm} m²
            </span>
          )}
          {bedConfigurations.map((bed, index) => (
            <span
              key={`${bed}-${index}`}
              className="inline-flex max-w-full items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 break-words"
            >
              {bed}
            </span>
          ))}
        </div>

        {/* Amenities */}
        {normalizedRoomAmenities.length > 0 && (
          <div className="border-t border-gray-100 pt-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {normalizedRoomAmenities.map((amenity, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2"
                >
                  <AmenityIcon icon={amenity.icon} variant="xs" className="bg-white text-blue-600" />
                  <span className="text-sm font-medium text-gray-700 leading-snug break-words">
                    {formatAmenityName(amenity)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        hotelId={hotelId}
        roomId={room.id}
        roomName={room.name}
        roomPrice={dynamicPrice}
        searchParams={searchParams}
      />
    </div>
  );
}

