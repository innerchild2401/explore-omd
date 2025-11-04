'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/lib/utils';

interface ReservationDetailModalProps {
  reservationId: string;
  hotelId: string;
  onClose: () => void;
  onUpdate?: () => void;
  isFullscreen?: boolean;
}

interface ReservationDetails {
  id: string;
  confirmation_number: string;
  check_in_date: string;
  check_out_date: string;
  adults: number;
  children: number;
  infants: number;
  reservation_status: string;
  payment_status: string;
  base_rate: number;
  taxes: number;
  fees: number;
  total_amount: number;
  currency: string;
  special_requests?: string;
  guest_profiles?: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  };
  rooms?: {
    id: string;
    name: string;
    room_type: string;
  };
  individual_rooms?: {
    id: string;
    room_number: string;
    floor_number?: number;
  };
  channel?: {
    display_name: string;
  };
}

export default function ReservationDetailModal({ 
  reservationId, 
  hotelId, 
  onClose, 
  onUpdate,
  isFullscreen = false
}: ReservationDetailModalProps) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reservation, setReservation] = useState<ReservationDetails | null>(null);
  const [error, setError] = useState('');
  
  // Form state for edits
  const [reservationStatus, setReservationStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');

  useEffect(() => {
    fetchReservationDetails();
  }, [reservationId]);

  const fetchReservationDetails = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('reservations')
        .select(`
          *,
          guest_profiles(first_name, last_name, email, phone),
          rooms(id, name, room_type),
          individual_rooms(id, room_number, floor_number),
          booking_channels(display_name)
        `)
        .eq('id', reservationId)
        .single();

      if (fetchError) throw fetchError;

      if (data) {
        setReservation(data as any);
        setReservationStatus(data.reservation_status);
        setPaymentStatus(data.payment_status);
      }
    } catch (err: any) {
      console.error('Error fetching reservation:', err);
      setError(err.message || 'Failed to load reservation details');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!reservation) return;

    try {
      setSaving(true);
      setError('');

      const updates: any = {};
      if (reservationStatus !== reservation.reservation_status) {
        updates.reservation_status = reservationStatus;
      }
      if (paymentStatus !== reservation.payment_status) {
        updates.payment_status = paymentStatus;
      }

      if (Object.keys(updates).length === 0) {
        setSaving(false);
        return;
      }

      const { error: updateError } = await supabase
        .from('reservations')
        .update(updates)
        .eq('id', reservationId);

      if (updateError) throw updateError;

      // Refresh data
      await fetchReservationDetails();
      onUpdate?.();
      router.refresh();
    } catch (err: any) {
      console.error('Error updating reservation:', err);
      setError(err.message || 'Failed to update reservation');
    } finally {
      setSaving(false);
    }
  };

  const calculateNights = () => {
    if (!reservation) return 0;
    const checkIn = new Date(reservation.check_in_date);
    const checkOut = new Date(reservation.check_out_date);
    return Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
  };

  const positionClass = isFullscreen ? 'absolute' : 'fixed';

  if (loading) {
    return (
      <div className={`${positionClass} inset-0 z-[100] flex items-center justify-center bg-black/50`}>
        <div className="rounded-lg bg-white p-8">
          <p className="text-gray-600">Loading reservation details...</p>
        </div>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className={`${positionClass} inset-0 z-[100] flex items-center justify-center bg-black/50`}>
        <div className="rounded-lg bg-white p-8">
          <p className="text-red-600">Reservation not found</p>
          <button
            onClick={onClose}
            className="mt-4 rounded-lg bg-gray-600 px-4 py-2 text-white"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const nights = calculateNights();
  const guest = reservation.guest_profiles;

  return (
    <div className={`${positionClass} inset-0 z-[100] flex items-center justify-center bg-black/50 p-4`}>
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Reservation Details
              </h2>
              <p className="text-sm text-gray-600">
                Confirmation: {reservation.confirmation_number}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-600">{error}</div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {/* Guest Information */}
            <div className="rounded-lg border border-gray-200 p-4">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Guest Information</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Name:</span>
                  <span className="ml-2 text-gray-900">
                    {guest?.first_name} {guest?.last_name}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Email:</span>
                  <span className="ml-2 text-gray-900">{guest?.email}</span>
                </div>
                {guest?.phone && (
                  <div>
                    <span className="font-medium text-gray-700">Phone:</span>
                    <span className="ml-2 text-gray-900">{guest.phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Booking Details */}
            <div className="rounded-lg border border-gray-200 p-4">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Booking Details</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Check-in:</span>
                  <span className="ml-2 text-gray-900">
                    {new Date(reservation.check_in_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Check-out:</span>
                  <span className="ml-2 text-gray-900">
                    {new Date(reservation.check_out_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Nights:</span>
                  <span className="ml-2 text-gray-900">{nights}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Guests:</span>
                  <span className="ml-2 text-gray-900">
                    {reservation.adults} adult{reservation.adults !== 1 ? 's' : ''}
                    {reservation.children > 0 && `, ${reservation.children} child${reservation.children !== 1 ? 'ren' : ''}`}
                    {reservation.infants > 0 && `, ${reservation.infants} infant${reservation.infants !== 1 ? 's' : ''}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Room Assignment */}
            <div className="rounded-lg border border-gray-200 p-4">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Room Assignment</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Room Type:</span>
                  <span className="ml-2 text-gray-900 capitalize">
                    {reservation.rooms?.name || 'Not assigned'}
                  </span>
                  {reservation.rooms?.room_type && (
                    <span className="ml-2 text-gray-600 capitalize">
                      ({reservation.rooms.room_type.replace('_', ' ')})
                    </span>
                  )}
                </div>
                {reservation.individual_rooms && (
                  <div>
                    <span className="font-medium text-gray-700">Individual Room:</span>
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
                      🏠 Room {reservation.individual_rooms.room_number}
                      {reservation.individual_rooms.floor_number && ` (Floor ${reservation.individual_rooms.floor_number})`}
                    </span>
                  </div>
                )}
                {reservation.channel && (
                  <div>
                    <span className="font-medium text-gray-700">Booking Channel:</span>
                    <span className="ml-2 text-gray-900">{reservation.channel.display_name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Pricing */}
            <div className="rounded-lg border border-gray-200 p-4">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Pricing</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">Base Rate ({nights} night{nights !== 1 ? 's' : ''}):</span>
                  <span className="font-medium text-gray-900">
                    {formatPrice(reservation.base_rate, reservation.currency || 'RON')}
                  </span>
                </div>
                {reservation.taxes > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-700">Taxes:</span>
                    <span className="font-medium text-gray-900">
                      {formatPrice(reservation.taxes, reservation.currency || 'RON')}
                    </span>
                  </div>
                )}
                {reservation.fees > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-700">Fees:</span>
                    <span className="font-medium text-gray-900">
                      {formatPrice(reservation.fees, reservation.currency || 'RON')}
                    </span>
                  </div>
                )}
                <div className="mt-2 border-t border-gray-200 pt-2">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-900">Total:</span>
                    <span className="text-lg font-bold text-gray-900">
                      {formatPrice(reservation.total_amount, reservation.currency || 'RON')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Status Updates */}
          <div className="mt-6 rounded-lg border border-gray-200 p-4">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Update Status</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Reservation Status
                </label>
                <select
                  value={reservationStatus}
                  onChange={(e) => setReservationStatus(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                >
                  <option value="tentative">Tentative</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="checked_in">Checked In</option>
                  <option value="checked_out">Checked Out</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="no_show">No Show</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Payment Status
                </label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                  <option value="refunded">Refunded</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>
            <button
              onClick={handleStatusUpdate}
              disabled={saving || (reservationStatus === reservation.reservation_status && paymentStatus === reservation.payment_status)}
              className="mt-4 rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700 disabled:bg-gray-400"
            >
              {saving ? 'Saving...' : 'Update Status'}
            </button>
          </div>

          {/* Special Requests */}
          {reservation.special_requests && (
            <div className="mt-6 rounded-lg border border-gray-200 p-4">
              <h3 className="mb-2 text-lg font-semibold text-gray-900">Special Requests</h3>
              <p className="text-sm text-gray-700">{reservation.special_requests}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-6 py-2 font-medium text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

