'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ReservationsListProps {
  hotelId: string;
}

export default function ReservationsList({ hotelId }: ReservationsListProps) {
  const supabase = createClient();
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'current' | 'past' | 'cancelled'>('upcoming');

  useEffect(() => {
    fetchReservations();
  }, [filter]);

  const fetchReservations = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('reservations')
        .select(`
          *,
          rooms (
            name,
            room_type
          ),
          guest_profiles (
            first_name,
            last_name,
            email
          )
        `)
        .eq('hotel_id', hotelId)
        .order('check_in_date', { ascending: true });

      // Apply filters
      const today = new Date().toISOString().split('T')[0];
      
      if (filter === 'upcoming') {
        query = query.eq('reservation_status', 'confirmed').gte('check_in_date', today);
      } else if (filter === 'current') {
        query = query.eq('reservation_status', 'confirmed').lte('check_in_date', today).gte('check_out_date', today);
      } else if (filter === 'past') {
        query = query.lt('check_out_date', today);
      } else if (filter === 'cancelled') {
        query = query.eq('reservation_status', 'cancelled');
      }

      const { data, error } = await query;

      if (error) throw error;
      setReservations(data || []);
    } catch (err) {
      console.error('Error fetching reservations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (reservationId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ reservation_status: newStatus })
        .eq('id', reservationId);

      if (error) throw error;

      // Refresh reservations
      fetchReservations();
    } catch (err) {
      console.error('Error updating reservation status:', err);
      alert('Failed to update reservation status');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: any = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      checked_in: 'bg-blue-100 text-blue-800',
      checked_out: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`rounded-full px-3 py-1 text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const calculateNights = (checkIn: string, checkOut: string) => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reservations</h2>
          <p className="text-gray-600">Manage your bookings and guest check-ins</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {[
          { key: 'upcoming', label: 'Upcoming', icon: '📅' },
          { key: 'current', label: 'Current', icon: '🏨' },
          { key: 'past', label: 'Past', icon: '✓' },
          { key: 'cancelled', label: 'Cancelled', icon: '✕' },
          { key: 'all', label: 'All', icon: '📋' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 font-medium transition-colors ${
              filter === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Reservations List */}
      {loading ? (
        <div className="rounded-lg bg-white p-12 text-center shadow">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading reservations...</p>
        </div>
      ) : reservations.length === 0 ? (
        <div className="rounded-lg bg-white p-12 text-center shadow">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="mb-2 text-xl font-semibold text-gray-900">No reservations found</h3>
          <p className="text-gray-600">
            {filter === 'upcoming' && 'No upcoming reservations at this time.'}
            {filter === 'current' && 'No guests are currently checked in.'}
            {filter === 'past' && 'No past reservations to display.'}
            {filter === 'cancelled' && 'No cancelled reservations.'}
            {filter === 'all' && 'No reservations yet. They will appear here once guests book your rooms.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reservations.map((reservation) => (
            <div key={reservation.id} className="rounded-lg border border-gray-200 bg-white p-6 shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {reservation.guest_info?.name || 'Guest'}
                    </h3>
                    {getStatusBadge(reservation.status)}
                  </div>

                  <div className="mb-4 grid gap-2 text-sm text-gray-600 md:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      <span className="font-medium">Room:</span> {reservation.rooms?.name}
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span className="font-medium">Guests:</span> {reservation.number_of_guests}
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="font-medium">Check-in:</span> {formatDate(reservation.check_in_date)}
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="font-medium">Check-out:</span> {formatDate(reservation.check_out_date)}
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium">Nights:</span> {calculateNights(reservation.check_in_date, reservation.check_out_date)}
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium">Total:</span> ${reservation.total_price}
                    </div>
                  </div>

                  {reservation.guest_info?.email && (
                    <div className="mb-2 text-sm text-gray-600">
                      <span className="font-medium">Email:</span> {reservation.guest_info.email}
                    </div>
                  )}
                  {reservation.guest_info?.phone && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Phone:</span> {reservation.guest_info.phone}
                    </div>
                  )}
                </div>

                {/* Actions */}
                {reservation.status !== 'cancelled' && reservation.status !== 'checked_out' && (
                  <div className="ml-4 flex flex-col gap-2">
                    {reservation.status === 'confirmed' && (
                      <button
                        onClick={() => handleUpdateStatus(reservation.id, 'checked_in')}
                        className="whitespace-nowrap rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        Check In
                      </button>
                    )}
                    {reservation.status === 'checked_in' && (
                      <button
                        onClick={() => handleUpdateStatus(reservation.id, 'checked_out')}
                        className="whitespace-nowrap rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                      >
                        Check Out
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm('Cancel this reservation?')) {
                          handleUpdateStatus(reservation.id, 'cancelled');
                        }
                      }}
                      className="whitespace-nowrap rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

