'use client';

import { useState } from 'react';

interface ReservationRating {
  id: string;
  reservation_id: string;
  hotel_id: string;
  rating: number;
  comment?: string;
  guest_email: string;
  created_at: string;
  reservations?: {
    confirmation_number: string;
    hotels?: {
      businesses?: {
        name: string;
      };
    };
  };
}

interface DestinationRating {
  id: string;
  omd_id: string;
  rating: number;
  comment?: string;
  name: string;
  email: string;
  created_at: string;
  omds?: {
    name: string;
    slug: string;
  } | null;
}

interface RatingsListProps {
  reservationRatings: ReservationRating[];
  destinationRatings: DestinationRating[];
}

export default function RatingsList({ reservationRatings, destinationRatings }: RatingsListProps) {
  const [activeTab, setActiveTab] = useState<'reservation' | 'destination'>('reservation');

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`text-2xl ${rating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('reservation')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === 'reservation'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Evaluări Serviciu Rezervări ({reservationRatings.length})
        </button>
        <button
          onClick={() => setActiveTab('destination')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === 'destination'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Evaluări Destinație ({destinationRatings.length})
        </button>
      </div>

      {/* Reservation Ratings */}
      {activeTab === 'reservation' && (
        <div className="space-y-4">
          {reservationRatings.length === 0 ? (
            <div className="rounded-lg bg-gray-50 p-8 text-center">
              <p className="text-gray-600">Nu există evaluări pentru serviciul de rezervări</p>
            </div>
          ) : (
            reservationRatings.map((rating) => (
              <div
                key={rating.id}
                className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-3">
                      {renderStars(rating.rating)}
                      <span className="text-lg font-semibold text-gray-900">
                        {rating.rating}/5
                      </span>
                    </div>
                    <p className="text-gray-600">{rating.guest_email}</p>
                    {rating.reservations && (
                      <div className="mt-1 text-sm text-gray-500">
                        <p>Rezervare: {rating.reservations.confirmation_number}</p>
                        {rating.reservations.hotels?.businesses && (
                          <p>Hotel: {rating.reservations.hotels.businesses.name}</p>
                        )}
                      </div>
                    )}
                    <p className="text-sm text-gray-500">
                      {new Date(rating.created_at).toLocaleString('ro-RO')}
                    </p>
                  </div>
                </div>

                {rating.comment && (
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-gray-700">{rating.comment}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Destination Ratings */}
      {activeTab === 'destination' && (
        <div className="space-y-4">
          {destinationRatings.length === 0 ? (
            <div className="rounded-lg bg-gray-50 p-8 text-center">
              <p className="text-gray-600">Nu există evaluări pentru destinații</p>
            </div>
          ) : (
            destinationRatings.map((rating) => (
              <div
                key={rating.id}
                className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-3">
                      {renderStars(rating.rating)}
                      <span className="text-lg font-semibold text-gray-900">
                        {rating.rating}/5
                      </span>
                    </div>
                    <p className="text-gray-900 font-medium">{rating.name}</p>
                    <p className="text-gray-600">{rating.email}</p>
                    {rating.omds && (
                      <p className="mt-1 text-sm text-blue-600 font-medium">
                        Destinație: {rating.omds.name}
                      </p>
                    )}
                    <p className="text-sm text-gray-500">
                      {new Date(rating.created_at).toLocaleString('ro-RO')}
                    </p>
                  </div>
                </div>

                {rating.comment && (
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-gray-700">{rating.comment}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

