'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import NewReservationModal from './NewReservationModal';

interface BookingManagementProps {
  hotelId: string;
  rooms: any[];
  onClose: () => void;
}

interface Reservation {
  id: string;
  confirmation_number: string;
  check_in_date: string;
  check_out_date: string;
  adults: number;
  children: number;
  infants: number;
  reservation_status: 'tentative' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';
  payment_status: 'pending' | 'paid' | 'partial' | 'refunded' | 'failed';
  total_amount: number;
  currency: string;
  special_requests?: string;
  arrival_time?: string;
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
  individual_room?: {
    room_number: string;
    floor_number?: number;
    current_status?: string;
  };
}

interface BookingStats {
  total_reservations: number;
  confirmed_reservations: number;
  checked_in: number;
  pending_payments: number;
  total_revenue: number;
  occupancy_rate: number;
}

export default function BookingManagement({ hotelId, rooms, onClose }: BookingManagementProps) {
  const router = useRouter();
  const supabase = createClient();
  
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [individualRooms, setIndividualRooms] = useState<Record<string, any[]>>({});
  const [assigningRoom, setAssigningRoom] = useState<string | null>(null);
  const [stats, setStats] = useState<BookingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewReservationModal, setShowNewReservationModal] = useState(false);

  useEffect(() => {
    fetchReservations();
  }, [filterStatus, filterChannel]);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      
      // First, get the hotel record associated with this business
      const { data: hotelData, error: hotelError } = await supabase
        .from('hotels')
        .select('id')
        .eq('business_id', hotelId)
        .single();

      if (hotelError) throw hotelError;
      console.log('Hotel ID:', hotelData.id);
      
      let query = supabase
        .from('reservations')
        .select('*')
        .eq('hotel_id', hotelData.id);

      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          guest_profiles!guest_id(first_name, last_name, email, phone),
          rooms!room_id(name, room_type),
          booking_channels!channel_id(name, display_name, channel_type),
          individual_rooms!individual_room_id(room_number, floor_number, current_status)
        `)
        .eq('hotel_id', hotelData.id);
      
      console.log('Reservations with relations:', { data, error, hotelDataId: hotelData.id });

      if (error) {
        console.error('Query error:', error);
        throw error;
      }

      // Fetch individual rooms for each room type
      const roomsByType: Record<string, any[]> = {};
      for (const roomType of rooms || []) {
        const { data: indivRooms } = await supabase
          .from('individual_rooms')
          .select('*')
          .eq('room_id', roomType.id)
          .order('floor_number', { ascending: true })
          .order('room_number', { ascending: true });

        if (indivRooms) {
          roomsByType[roomType.id] = indivRooms;
        }
      }
      setIndividualRooms(roomsByType);

      // Calculate stats
      const totalReservations = data?.length || 0;
      const confirmedReservations = data?.filter(r => r.reservation_status === 'confirmed').length || 0;
      const checkedIn = data?.filter(r => r.reservation_status === 'checked_in').length || 0;
      const pendingPayments = data?.filter(r => r.payment_status === 'pending').length || 0;
      const totalRevenue = data?.reduce((sum, r) => sum + (r.total_amount || 0), 0) || 0;
      
      // Calculate occupancy rate (simplified)
      const today = new Date().toISOString().split('T')[0];
      const todayReservations = data?.filter(r => 
        r.check_in_date <= today && r.check_out_date > today && 
        r.reservation_status === 'checked_in'
      ).length || 0;
      
      // Get total rooms count for occupancy calculation
      const { data: roomsData } = await supabase
        .from('rooms')
        .select('quantity')
        .eq('hotel_id', hotelData.id)
        .eq('is_active', true);
      
      const totalRooms = roomsData?.reduce((sum, r) => sum + (r.quantity || 0), 0) || 1;
      const occupancyRate = (todayReservations / totalRooms) * 100;

      setReservations(data || []);
      console.log('Set reservations (detailed):', JSON.stringify(data?.map(r => ({
        id: r.id,
        confirmation_number: r.confirmation_number,
        individual_room_id: r.individual_room_id,
        individual_room: r.individual_rooms,
        rooms: r.rooms
      })), null, 2));
      setStats({
        total_reservations: totalReservations,
        confirmed_reservations: confirmedReservations,
        checked_in: checkedIn,
        pending_payments: pendingPayments,
        total_revenue: totalRevenue,
        occupancy_rate: occupancyRate
      });
    } catch (err: any) {
      console.error('Error fetching reservations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRoom = async (reservationId: string, individualRoomId: string) => {
    console.log('handleAssignRoom called with:', { reservationId, individualRoomId });
    setAssigningRoom(reservationId);
    try {
      // Get reservation details for date checking
      const reservation = reservations.find(r => r.id === reservationId);
      if (!reservation) {
        setError('Reservation not found');
        setAssigningRoom(null);
        return;
      }

      // First check if the room is available using the database function
      const { data: availabilityCheck, error: checkError } = await supabase
        .rpc('is_room_available_for_reservation', {
          p_individual_room_id: individualRoomId,
          p_check_in_date: reservation.check_in_date,
          p_check_out_date: reservation.check_out_date,
          p_reservation_id: reservationId
        });

      if (checkError) throw checkError;

      // If room is not available, show error
      if (!availabilityCheck) {
        setError('This room is already booked for these dates. Please select a different room.');
        setAssigningRoom(null);
        return;
      }

      // Room is available, proceed with assignment
      const { error, data } = await supabase
        .from('reservations')
        .update({ 
          individual_room_id: individualRoomId,
          assignment_method: 'manual'
        })
        .eq('id', reservationId)
        .select();

      console.log('Update result:', { error, data });

      if (error) throw error;

      console.log('Waiting for fetchReservations...');
      await fetchReservations();
      console.log('fetchReservations completed');
      router.refresh();
    } catch (err: any) {
      console.error('Error assigning room:', err);
      setError(err.message || 'Failed to assign room. Please try again.');
    } finally {
      setAssigningRoom(null);
    }
  };

  const handleStatusChange = async (reservationId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ reservation_status: newStatus })
        .eq('id', reservationId);

      if (error) throw error;

      await fetchReservations();
      router.refresh();
    } catch (err: any) {
      console.error('Error updating status:', err);
      setError(err.message);
    }
  };

  const handlePaymentStatusChange = async (reservationId: string, newPaymentStatus: string) => {
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ payment_status: newPaymentStatus })
        .eq('id', reservationId);

      if (error) throw error;

      await fetchReservations();
      router.refresh();
    } catch (err: any) {
      console.error('Error updating payment status:', err);
      setError(err.message);
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

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'partial': return 'bg-orange-100 text-orange-800';
      case 'refunded': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const filteredReservations = reservations.filter(reservation => {
    if (!reservation) return false;
    const matchesSearch = searchTerm === '' || 
      reservation.confirmation_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (reservation.guest_profiles && `${reservation.guest_profiles.first_name || ''} ${reservation.guest_profiles.last_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (reservation.guest_profiles?.email && reservation.guest_profiles.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[95vh] w-full max-w-7xl overflow-y-auto rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Booking Management</h2>
              <p className="text-sm text-gray-600">Manage reservations and guest bookings</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowNewReservationModal(true)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                + New Reservation
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-6">
              <div className="rounded-lg bg-blue-50 p-4">
                <div className="text-2xl font-bold text-blue-600">{stats.total_reservations}</div>
                <div className="text-sm text-blue-800">Total Bookings</div>
              </div>
              <div className="rounded-lg bg-green-50 p-4">
                <div className="text-2xl font-bold text-green-600">{stats.confirmed_reservations}</div>
                <div className="text-sm text-green-800">Confirmed</div>
              </div>
              <div className="rounded-lg bg-purple-50 p-4">
                <div className="text-2xl font-bold text-purple-600">{stats.checked_in}</div>
                <div className="text-sm text-purple-800">Checked In</div>
              </div>
              <div className="rounded-lg bg-yellow-50 p-4">
                <div className="text-2xl font-bold text-yellow-600">{stats.pending_payments}</div>
                <div className="text-sm text-yellow-800">Pending Payment</div>
              </div>
              <div className="rounded-lg bg-indigo-50 p-4">
                <div className="text-2xl font-bold text-indigo-600">{formatCurrency(stats.total_revenue)}</div>
                <div className="text-sm text-indigo-800">Total Revenue</div>
              </div>
              <div className="rounded-lg bg-pink-50 p-4">
                <div className="text-2xl font-bold text-pink-600">{stats.occupancy_rate.toFixed(1)}%</div>
                <div className="text-sm text-pink-800">Occupancy</div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Status:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-1 text-sm"
              >
                <option value="all">All</option>
                <option value="tentative">Tentative</option>
                <option value="confirmed">Confirmed</option>
                <option value="checked_in">Checked In</option>
                <option value="checked_out">Checked Out</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No Show</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Channel:</label>
              <select
                value={filterChannel}
                onChange={(e) => setFilterChannel(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-1 text-sm"
              >
                <option value="all">All</option>
                <option value="direct">Direct</option>
                <option value="booking_com">Booking.com</option>
                <option value="expedia">Expedia</option>
                <option value="airbnb">Airbnb</option>
                <option value="walk_in">Walk-in</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Search:</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Confirmation, guest name, email..."
                className="rounded-lg border border-gray-300 px-3 py-1 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="py-8 text-center text-gray-500">Loading reservations...</div>
          ) : error ? (
            <div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div>
          ) : (
            <div className="space-y-4">
              {filteredReservations.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  <p>No reservations found matching your criteria</p>
                </div>
              ) : (
                filteredReservations.map(reservation => (
                  <div key={reservation.id} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="grid gap-4 md:grid-cols-12">
                      {/* Guest Info */}
                      <div className="md:col-span-3">
                        <div className="font-medium text-gray-900">
                          {reservation.guest_profiles ? `${reservation.guest_profiles.first_name || ''} ${reservation.guest_profiles.last_name || ''}`.trim() : 'Unknown Guest'}
                        </div>
                        <div className="text-sm text-gray-600">{reservation.guest_profiles?.email || 'No email'}</div>
                        {reservation.guest_profiles?.phone && (
                          <div className="text-sm text-gray-600">{reservation.guest_profiles.phone}</div>
                        )}
                        <div className="mt-2 text-sm font-medium text-gray-900">
                          #{reservation.confirmation_number}
                        </div>
                      </div>

                      {/* Booking Details */}
                      <div className="md:col-span-3">
                        <div className="text-sm text-gray-600">Check-in</div>
                        <div className="font-medium text-gray-900">{formatDate(reservation.check_in_date)}</div>
                        <div className="mt-2 text-sm text-gray-600">Check-out</div>
                        <div className="font-medium text-gray-900">{formatDate(reservation.check_out_date)}</div>
                      </div>

                      {/* Room & Guests */}
                      <div className="md:col-span-2">
                        <div className="text-sm text-gray-600">Room</div>
                        <div className="font-medium text-gray-900">{reservation.rooms?.name || 'TBD'}</div>
                        <div className="text-sm text-gray-600 capitalize">
                          {reservation.rooms?.room_type?.replace('_', ' ') || ''}
                        </div>
                        {(reservation as any).individual_rooms || reservation.individual_room ? (
                          <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
                            🏠 Room {((reservation as any).individual_rooms || reservation.individual_room).room_number}
                            {((reservation as any).individual_rooms || reservation.individual_room).floor_number && ` (Floor ${((reservation as any).individual_rooms || reservation.individual_room).floor_number})`}
                          </div>
                        ) : (() => {
                          // Get room_id from reservation to find available individual rooms
                          const roomId = (reservation as any).room_id;
                          const availableRooms = roomId ? individualRooms[roomId] || [] : [];
                          
                          return availableRooms.length > 0 ? (
                            <select
                              disabled={assigningRoom === reservation.id}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value && value !== '') {
                                  handleAssignRoom(reservation.id, value);
                                  // Reset dropdown after selection
                                  e.target.value = '';
                                }
                              }}
                              className="mt-2 rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                              defaultValue=""
                            >
                              <option value="">Assign Room...</option>
                              {availableRooms.map(room => (
                                <option key={room.id} value={room.id}>
                                  Room {room.room_number}{room.floor_number ? ` (Floor ${room.floor_number})` : ''}
                                </option>
                              ))}
                            </select>
                          ) : null;
                        })()}
                        <div className="mt-1 text-sm text-gray-600">
                          {reservation.adults} adults
                          {reservation.children > 0 && `, ${reservation.children} children`}
                          {reservation.infants > 0 && `, ${reservation.infants} infants`}
                        </div>
                      </div>

                      {/* Channel */}
                      <div className="md:col-span-2">
                        <div className="text-sm text-gray-600">Channel</div>
                        <div className="font-medium text-gray-900">{reservation.booking_channels?.display_name || reservation.booking_channels?.name || 'Unknown'}</div>
                        <div className="text-sm text-gray-600 capitalize">
                          {reservation.booking_channels?.channel_type || ''}
                        </div>
                      </div>

                      {/* Status & Actions */}
                      <div className="md:col-span-2">
                        <div className="space-y-2">
                          <div>
                            <div className="text-sm text-gray-600">Status</div>
                            <select
                              value={reservation.reservation_status}
                              onChange={(e) => handleStatusChange(reservation.id, e.target.value)}
                              className={`mt-1 rounded-lg border px-2 py-1 text-sm font-medium ${getStatusColor(reservation.reservation_status)}`}
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
                            <div className="text-sm text-gray-600">Payment</div>
                            <select
                              value={reservation.payment_status}
                              onChange={(e) => handlePaymentStatusChange(reservation.id, e.target.value)}
                              className={`mt-1 rounded-lg border px-2 py-1 text-sm font-medium ${getPaymentStatusColor(reservation.payment_status)}`}
                            >
                              <option value="pending">Pending</option>
                              <option value="paid">Paid</option>
                              <option value="partial">Partial</option>
                              <option value="refunded">Refunded</option>
                              <option value="failed">Failed</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Special Requests */}
                    {reservation.special_requests && (
                      <div className="mt-4 rounded-lg bg-gray-50 p-3">
                        <div className="text-sm font-medium text-gray-700">Special Requests:</div>
                        <div className="text-sm text-gray-600">{reservation.special_requests}</div>
                      </div>
                    )}

                    {/* Amount */}
                    <div className="mt-4 flex items-center justify-between">
                      <div className="text-lg font-bold text-gray-900">
                        {formatCurrency(reservation.total_amount, reservation.currency)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Created: {formatDate(reservation.created_at)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Close Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="rounded-lg bg-gray-600 px-6 py-2 font-semibold text-white hover:bg-gray-700"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* New Reservation Modal */}
      {showNewReservationModal && (
        <NewReservationModal
          hotelId={hotelId}
          rooms={rooms}
          onClose={() => setShowNewReservationModal(false)}
          onSuccess={() => {
            fetchReservations();
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
