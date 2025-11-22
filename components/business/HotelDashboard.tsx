'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import HotelBasicInfo from './HotelBasicInfo';
import RoomsList from './RoomsList';
import AvailabilityDashboard from './AvailabilityDashboard';
import IndividualRoomAvailabilityDashboard from './IndividualRoomAvailabilityDashboard';
import BookingManagement from './BookingManagement';
import PendingReservations from './PendingReservations';
import ToastNotification from './ToastNotification';
import BusinessSwitcher from './BusinessSwitcher';
import AddBusinessModal from './AddBusinessModal';
import BusinessLabelsManager from './BusinessLabelsManager';

interface Business {
  id: string;
  name: string;
  slug: string;
  description: string;
  images: string[];
  contact: any;
  location: any;
  omd_id: string;
  is_published: boolean;
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
  const [activeTab, setActiveTab] = useState<'info' | 'rooms' | 'availability' | 'bookings' | 'reservations' | 'analytics' | 'labels'>('info');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isPublished, setIsPublished] = useState<boolean>(business.is_published ?? false);
  const [publishLoading, setPublishLoading] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push(`/${omd.slug}/business/login`);
  };

  const handleTogglePublish = async () => {
    setPublishLoading(true);
    try {
      const nextValue = !isPublished;
      const updates: Record<string, any> = {
        is_published: nextValue,
      };

      if (!nextValue) {
        updates.featured_order = null;
      }

      const { error } = await supabase
        .from('businesses')
        .update(updates)
        .eq('id', business.id);

      if (error) throw error;

      setIsPublished(nextValue);
      router.refresh();
    } catch (error) {
      console.error('Failed to update publish status:', error);
      alert('Could not update visibility. Please try again.');
    } finally {
      setPublishLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast Notification */}
      <ToastNotification hotelId={hotel.id} />
      {/* Header */}
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
                <p className="text-sm text-gray-600">Hotel Management Dashboard</p>
              </div>
              <div className="flex items-center gap-4">
                {isPublished ? (
                  <Link
                    href={`/${omd.slug}/hotels/${business.slug}`}
                    className="text-sm text-blue-600 hover:text-blue-700"
                    target="_blank"
                  >
                    View Public Page →
                  </Link>
                ) : (
                  <span className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-500">
                    Public page hidden
                  </span>
                )}
                <button
                  onClick={handleSignOut}
                  className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300"
                >
                  Sign Out
                </button>
              </div>
            </div>
            
            <div className="flex items-center justify-between border-t border-gray-200 pt-4">
              <BusinessSwitcher currentBusinessSlug={business.slug} omdSlug={omd.slug} />
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
              >
                <span>+</span>
                Add New Business
              </button>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Visibility</p>
                  <p className="text-sm text-gray-600">
                    {isPublished
                      ? 'Your hotel is currently visible to visitors.'
                      : 'Finish setting up your profile, then publish when you are ready to go live.'}
                  </p>
                </div>
                <button
                  onClick={handleTogglePublish}
                  disabled={publishLoading}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    isPublished
                      ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {publishLoading
                    ? 'Updating...'
                    : isPublished
                    ? 'Hide from Visitors'
                    : 'Publish Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <AddBusinessModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        omdSlug={omd.slug}
        omdId={omd.id}
      />

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4">
          <nav className="flex space-x-8">
            {[
              { id: 'info', label: 'Basic Info', icon: '📋' },
              { id: 'rooms', label: 'Rooms', icon: '🛏️', badge: rooms.length },
              { id: 'availability', label: 'Availability', icon: '📅' },
              { id: 'bookings', label: 'Bookings', icon: '📝' },
              { id: 'reservations', label: 'Pending Reservations', icon: '⏳' },
              { id: 'analytics', label: 'Analytics', icon: '📊' },
              { id: 'labels', label: 'Labels', icon: '🏷️' },
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

        {activeTab === 'reservations' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Pending Reservations</h2>
                <p className="text-gray-600">Review and approve booking requests from website visitors</p>
              </div>
              <button
                onClick={() => setActiveTab('reservations')}
                className="rounded-lg bg-orange-600 px-6 py-3 font-semibold text-white hover:bg-orange-700"
              >
                Review Requests
              </button>
            </div>
            <div className="rounded-lg bg-white p-8 text-center shadow">
              <h3 className="text-lg font-semibold text-gray-900">Pending Reservations</h3>
              <p className="mt-2 text-gray-600">Click &quot;Review Requests&quot; to approve or reject booking requests</p>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="rounded-lg bg-white p-8 text-center shadow">
            <h3 className="text-lg font-semibold text-gray-900">Analytics</h3>
            <p className="mt-2 text-gray-600">Coming soon...</p>
          </div>
        )}

        {activeTab === 'labels' && (
          <BusinessLabelsManager businessId={business.id} businessType="hotel" />
        )}
      </main>

      {/* Modals */}
      {activeTab === 'availability' && (
        <IndividualRoomAvailabilityDashboard
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

        {activeTab === 'reservations' && (
          <PendingReservations
            hotelId={hotel.id}
            onClose={() => setActiveTab('info')}
          />
        )}
    </div>
  );
}

