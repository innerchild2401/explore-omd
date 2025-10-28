'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface PendingReservationsProps {
  hotelId: string;
  onClose: () => void;
}

interface PendingReservation {
  id: string;
  confirmation_number: string;
  check_in_date: string;
  check_out_date: string;
  adults: number;
  children: number;
  infants: number;
  reservation_status: 'tentative';
  payment_status: 'pending';
  total_amount: number;
  currency: string;
  special_requests?: string;
  created_at: string;
  guest_profiles: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  };
  rooms: {
    name: string;
    room_type: string;
  };
  booking_channels: {
    name: string;
    display_name: string;
    channel_type: string;
  };
}

export default function PendingReservations({ hotelId, onClose }: PendingReservationsProps) {
  const supabase = createClient();
  const [reservations, setReservations] = useState<PendingReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingReservation, setProcessingReservation] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingReservations();
  }, [hotelId]);

  const fetchPendingReservations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          guest_profiles!inner(
            first_name,
            last_name,
            email,
            phone
          ),
          rooms!inner(
            name,
            room_type
          ),
          booking_channels!inner(
            name,
            display_name,
            channel_type
          )
        `)
        .eq('hotel_id', hotelId)
        .eq('reservation_status', 'tentative')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReservations(data || []);
    } catch (err: any) {
      console.error('Error fetching pending reservations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReservation = async (reservationId: string) => {
    setProcessingReservation(reservationId);
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ 
          reservation_status: 'confirmed',
          confirmation_sent: true
        })
        .eq('id', reservationId);

      if (error) throw error;
      
      await fetchPendingReservations();
    } catch (err: any) {
      console.error('Error approving reservation:', err);
      setError(err.message);
    } finally {
      setProcessingReservation(null);
    }
  };

  const handleRejectReservation = async (reservationId: string) => {
    setProcessingReservation(reservationId);
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ 
          reservation_status: 'cancelled',
          cancellation_reason: 'Rejected by hotel admin'
        })
        .eq('id', reservationId);

      if (error) throw error;
      
      await fetchPendingReservations();
    } catch (err: any) {
      console.error('Error rejecting reservation:', err);
      setError(err.message);
    } finally {
      setProcessingReservation(null);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateNights = (checkIn: string, checkOut: string) => {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[95vh] w-full max-w-6xl overflow-y-auto rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Pending Reservations</h2>
              <p className="text-sm text-gray-600">Review and approve booking requests from website visitors</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-orange-100 px-3 py-1">
                <span className="text-sm font-semibold text-orange-800">
                  {reservations.length} Pending
                </span>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="py-8 text-center text-gray-500">Loading pending reservations...</div>
          ) : error ? (
            <div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div>
          ) : reservations.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Reservations</h3>
              <p className="text-gray-600">All booking requests have been processed</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reservations.map((reservation) => (
                <div key={reservation.id} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {reservation.guest_profiles.first_name} {reservation.guest_profiles.last_name}
                        </h3>
                        <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-800">
                          {reservation.booking_channels.display_name}
                        </span>
                        <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
                          {reservation.confirmation_number}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Room Type</p>
                          <p className="text-gray-900">{reservation.rooms.name}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Dates</p>
                          <p className="text-gray-900">
                            {formatDate(reservation.check_in_date)} - {formatDate(reservation.check_out_date)}
                            <span className="text-sm text-gray-600 ml-2">
                              ({calculateNights(reservation.check_in_date, reservation.check_out_date)} nights)
                            </span>
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Guests</p>
                          <p className="text-gray-900">
                            {reservation.adults} adult{reservation.adults !== 1 ? 's' : ''}
                            {reservation.children > 0 && `, ${reservation.children} child${reservation.children !== 1 ? 'ren' : ''}`}
                            {reservation.infants > 0 && `, ${reservation.infants} infant${reservation.infants !== 1 ? 's' : ''}`}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Total Amount</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {formatCurrency(reservation.total_amount, reservation.currency)}
                          </p>
                        </div>
                      </div>

                      {reservation.special_requests && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700">Special Requests</p>
                          <p className="text-gray-900">{reservation.special_requests}</p>
                        </div>
                      )}

                      <div className="text-sm text-gray-500">
                        Submitted: {formatDate(reservation.created_at)}
                      </div>
                    </div>

                    <div className="ml-6 flex flex-col gap-2">
                      <button
                        onClick={() => handleApproveReservation(reservation.id)}
                        disabled={processingReservation === reservation.id}
                        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        {processingReservation === reservation.id ? 'Processing...' : '✓ Approve'}
                      </button>
                      <button
                        onClick={() => handleRejectReservation(reservation.id)}
                        disabled={processingReservation === reservation.id}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        ✗ Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
