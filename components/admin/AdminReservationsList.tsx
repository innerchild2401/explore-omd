'use client';

import { useState } from 'react';
import { formatPrice } from '@/lib/utils';

interface AdminReservationsListProps {
  reservations: any[];
  userRole: string;
}

export default function AdminReservationsList({ reservations, userRole }: AdminReservationsListProps) {
  const [filter, setFilter] = useState<'all' | 'tentative' | 'confirmed' | 'cancelled'>('all');
  const [selectedReservation, setSelectedReservation] = useState<any | null>(null);

  const filteredReservations = (reservations || []).filter(reservation => {
    if (!reservation) return false;
    if (filter === 'all') return true;
    return reservation.reservation_status === filter;
  });

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'tentative': return 'bg-yellow-100 text-yellow-800';
      case 'checked_in': return 'bg-blue-100 text-blue-800';
      case 'checked_out': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'no_show': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const cancelledCount = (reservations || []).filter(r => r?.reservation_status === 'cancelled').length;
  const tentativeCount = (reservations || []).filter(r => r?.reservation_status === 'tentative').length;
  const confirmedCount = (reservations || []).filter(r => r?.reservation_status === 'confirmed').length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Reservations Management</h1>
        <p className="mt-2 text-gray-600">View and manage all hotel reservations across the platform</p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm font-medium text-gray-600">Total Reservations</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">{reservations.length}</div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm font-medium text-gray-600">Tentative</div>
          <div className="mt-1 text-2xl font-bold text-yellow-600">{tentativeCount}</div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm font-medium text-gray-600">Confirmed</div>
          <div className="mt-1 text-2xl font-bold text-green-600">{confirmedCount}</div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm font-medium text-gray-600">Cancelled</div>
          <div className="mt-1 text-2xl font-bold text-red-600">{cancelledCount}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('tentative')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            filter === 'tentative'
              ? 'bg-yellow-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          Tentative ({tentativeCount})
        </button>
        <button
          onClick={() => setFilter('confirmed')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            filter === 'confirmed'
              ? 'bg-green-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          Confirmed ({confirmedCount})
        </button>
        <button
          onClick={() => setFilter('cancelled')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            filter === 'cancelled'
              ? 'bg-red-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          Cancelled ({cancelledCount})
        </button>
      </div>

      {/* Reservations List */}
      <div className="space-y-4">
        {filteredReservations.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow">
            <p className="text-gray-600">No reservations found</p>
          </div>
        ) : (
          filteredReservations.map((reservation) => (
            <div
              key={reservation.id}
              className="cursor-pointer rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              onClick={() => setSelectedReservation(reservation)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {reservation.guest_profiles?.first_name} {reservation.guest_profiles?.last_name}
                    </h3>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(reservation.reservation_status)}`}>
                      {reservation.reservation_status}
                    </span>
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
                      {reservation.confirmation_number}
                    </span>
                    {reservation.booking_channels && (
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800">
                        {reservation.booking_channels.display_name || reservation.booking_channels.name}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Hotel</p>
                      <p className="text-gray-900">{reservation.hotels?.businesses?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Room</p>
                      <p className="text-gray-900">{reservation.rooms?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Dates</p>
                      <p className="text-gray-900">
                        {formatDate(reservation.check_in_date)} - {formatDate(reservation.check_out_date)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Total Amount</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatPrice(reservation.total_amount, reservation.currency || 'RON')}
                      </p>
                    </div>
                  </div>

                  {reservation.reservation_status === 'cancelled' && reservation.cancellation_reason && (
                    <div className="mt-3 rounded-lg bg-red-50 border border-red-200 p-3">
                      <p className="text-sm font-medium text-red-800 mb-1">Cancellation Reason:</p>
                      <p className="text-sm text-red-700">{reservation.cancellation_reason}</p>
                    </div>
                  )}

                  <div className="text-sm text-gray-500 mt-3">
                    Created: {formatDate(reservation.created_at)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {selectedReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Reservation Details</h2>
                <button
                  onClick={() => setSelectedReservation(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Guest Info */}
              <div>
                <h3 className="mb-3 text-lg font-semibold text-gray-900">Guest Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Name</p>
                    <p className="text-gray-900">
                      {selectedReservation.guest_profiles?.first_name} {selectedReservation.guest_profiles?.last_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Email</p>
                    <p className="text-gray-900">{selectedReservation.guest_profiles?.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Phone</p>
                    <p className="text-gray-900">{selectedReservation.guest_profiles?.phone || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Booking Details */}
              <div>
                <h3 className="mb-3 text-lg font-semibold text-gray-900">Booking Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Confirmation Number</p>
                    <p className="text-gray-900">{selectedReservation.confirmation_number}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Status</p>
                    <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(selectedReservation.reservation_status)}`}>
                      {selectedReservation.reservation_status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Hotel</p>
                    <p className="text-gray-900">{selectedReservation.hotels?.businesses?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Room</p>
                    <p className="text-gray-900">{selectedReservation.rooms?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Check-in</p>
                    <p className="text-gray-900">{formatDate(selectedReservation.check_in_date)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Check-out</p>
                    <p className="text-gray-900">{formatDate(selectedReservation.check_out_date)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Guests</p>
                    <p className="text-gray-900">
                      {selectedReservation.adults} adult{selectedReservation.adults !== 1 ? 's' : ''}
                      {selectedReservation.children > 0 && `, ${selectedReservation.children} child${selectedReservation.children !== 1 ? 'ren' : ''}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Channel</p>
                    <p className="text-gray-900">
                      {selectedReservation.booking_channels?.display_name || selectedReservation.booking_channels?.name || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div>
                <h3 className="mb-3 text-lg font-semibold text-gray-900">Pricing</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Base Rate:</span>
                    <span className="font-medium text-gray-900">
                      {formatPrice(selectedReservation.base_rate, selectedReservation.currency || 'RON')}
                    </span>
                  </div>
                  {selectedReservation.taxes > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-700">Taxes:</span>
                      <span className="font-medium text-gray-900">
                        {formatPrice(selectedReservation.taxes, selectedReservation.currency || 'RON')}
                      </span>
                    </div>
                  )}
                  {selectedReservation.fees > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-700">Fees:</span>
                      <span className="font-medium text-gray-900">
                        {formatPrice(selectedReservation.fees, selectedReservation.currency || 'RON')}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-2 flex justify-between">
                    <span className="font-semibold text-gray-900">Total:</span>
                    <span className="text-lg font-bold text-gray-900">
                      {formatPrice(selectedReservation.total_amount, selectedReservation.currency || 'RON')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cancellation Reason */}
              {selectedReservation.reservation_status === 'cancelled' && selectedReservation.cancellation_reason && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                  <h3 className="mb-2 text-lg font-semibold text-red-900">Cancellation Reason</h3>
                  <p className="text-red-800">{selectedReservation.cancellation_reason}</p>
                </div>
              )}

              {/* Special Requests */}
              {selectedReservation.special_requests && (
                <div>
                  <h3 className="mb-2 text-lg font-semibold text-gray-900">Special Requests</h3>
                  <p className="text-gray-700">{selectedReservation.special_requests}</p>
                </div>
              )}

              {/* Timestamps */}
              <div className="text-sm text-gray-500 border-t border-gray-200 pt-4">
                <p>Created: {new Date(selectedReservation.created_at).toLocaleString()}</p>
                {selectedReservation.updated_at && (
                  <p>Last Updated: {new Date(selectedReservation.updated_at).toLocaleString()}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

