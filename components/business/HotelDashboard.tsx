'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import HotelBasicInfo from './HotelBasicInfo';
import RoomsList from './RoomsList';
import AvailabilityDashboard from './AvailabilityDashboard';
import BookingManagement from './BookingManagement';

interface Business {
  id: string;
  name: string;
  slug: string;
  description: string;
  images: string[];
  contact: any;
  location: any;
  omd_id: string;
}

interface Hotel {
  id: string;
  business_id: string;
  property_subtype: string | null;
  star_rating: number | null;
  check_in_time: string;
  check_out_time: string;
  languages_spoken: string[];
  selected_amenities: string[];
  policies: any;
  location_highlights: string | null;
}

interface Room {
  id: string;
  hotel_id: string;
  name: string;
  room_type: string;
  max_occupancy: number;
  bed_configuration: any;
  size_sqm: number | null;
  base_price: number;
  room_amenities: string[];
  images: string[];
  quantity: number;
  is_active: boolean;
}

interface Amenity {
  id: string;
  name: string;
  category: string;
  icon: string | null;
}

interface OMD {
  id: string;
  name: string;
  slug: string;
}

interface HotelDashboardProps {
  business: Business;
  hotel: Hotel;
  omd: OMD;
  rooms?: Room[];
  amenities?: Amenity[];
}

export default function HotelDashboard({
  business,
  hotel,
  omd,
  rooms = [],
  amenities = [],
}: HotelDashboardProps) {
  const router = useRouter();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<'info' | 'rooms' | 'availability' | 'bookings' | 'reservations' | 'analytics'>('info');

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push(`/${omd.slug}/business/login`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
              <p className="text-sm text-gray-600">Hotel Management Dashboard</p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href={`/${omd.slug}/hotels/${business.slug}`}
                className="text-sm text-blue-600 hover:text-blue-700"
                target="_blank"
              >
                View Public Page →
              </Link>
              <button
                onClick={handleSignOut}
                className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4">
          <nav className="flex space-x-8">
            {[
              { id: 'info', label: 'Basic Info', icon: '📋' },
              { id: 'rooms', label: 'Rooms', icon: '🛏️', badge: rooms.length },
              { id: 'availability', label: 'Availability', icon: '📅' },
              { id: 'bookings', label: 'Bookings', icon: '📝' },
              { id: 'reservations', label: 'Reservations', icon: '📋' },
              { id: 'analytics', label: 'Analytics', icon: '📊' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-700">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {activeTab === 'info' && (
          <HotelBasicInfo
            business={business}
            hotel={hotel}
            amenities={amenities}
          />
        )}

        {activeTab === 'rooms' && (
          <RoomsList
            hotelId={hotel.id}
            rooms={rooms}
            amenities={amenities}
          />
        )}

        {activeTab === 'availability' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Availability Dashboard</h2>
                <p className="text-gray-600">Manage room availability and bookings with drag & drop</p>
              </div>
              <button
                onClick={() => setActiveTab('availability')}
                className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
              >
                Open Calendar
              </button>
            </div>
            <div className="rounded-lg bg-white p-8 text-center shadow">
              <h3 className="text-lg font-semibold text-gray-900">Visual Availability Calendar</h3>
              <p className="mt-2 text-gray-600">Click &quot;Open Calendar&quot; to access the drag & drop availability dashboard</p>
            </div>
          </div>
        )}

        {activeTab === 'bookings' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Booking Management</h2>
                <p className="text-gray-600">Manage reservations, payments, and guest communications</p>
              </div>
              <button
                onClick={() => setActiveTab('bookings')}
                className="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700"
              >
                Open Bookings
              </button>
            </div>
            <div className="rounded-lg bg-white p-8 text-center shadow">
              <h3 className="text-lg font-semibold text-gray-900">Booking Management System</h3>
              <p className="mt-2 text-gray-600">Click &quot;Open Bookings&quot; to access the comprehensive booking management dashboard</p>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="rounded-lg bg-white p-8 text-center shadow">
            <h3 className="text-lg font-semibold text-gray-900">Analytics</h3>
            <p className="mt-2 text-gray-600">Coming soon...</p>
          </div>
        )}
      </main>

      {/* Modals */}
      {activeTab === 'availability' && (
        <AvailabilityDashboard
          hotelId={hotel.id}
          onClose={() => setActiveTab('info')}
        />
      )}

      {activeTab === 'bookings' && (
        <BookingManagement
          hotelId={hotel.id}
          rooms={rooms}
          onClose={() => setActiveTab('info')}
        />
      )}
    </div>
  );
}

