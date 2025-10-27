'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface IndividualRoom {
  id: string;
  room_number: string;
  floor_number?: number;
  current_status: 'clean' | 'occupied' | 'dirty' | 'maintenance' | 'out_of_order';
  room_id: string;
}

interface RoomType {
  id: string;
  name: string;
  room_type: string;
}

interface UnassignedReservation {
  id: string;
  confirmation_number: string;
  check_in_date: string;
  check_out_date: string;
  guests: number;
  guest_name: string;
  room_type_id: string;
}

interface ArrivalAlert {
  reservation_id: string;
  confirmation_number: string;
  guest_name: string;
  check_in_date: string;
  reservation_status: string;
  assigned_room?: string;
}

export default function IndividualRoomAvailabilityDashboard({ hotelId, onClose }: { hotelId: string; onClose: () => void }) {
  const router = useRouter();
  const supabase = createClient();
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [individualRooms, setIndividualRooms] = useState<Record<string, IndividualRoom[]>>({});
  const [unassignedReservations, setUnassignedReservations] = useState<UnassignedReservation[]>([]);
  const [arrivalAlerts, setArrivalAlerts] = useState<ArrivalAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReservation, setSelectedReservation] = useState<UnassignedReservation | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    fetchData();
    fetchArrivalAlerts();
  }, [selectedDate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Get hotel ID
      const { data: hotelData, error: hotelError } = await supabase
        .from('hotels')
        .select('id')
        .eq('business_id', hotelId)
        .single();

      if (hotelError) throw hotelError;
      
      // Fetch room types
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .eq('hotel_id', hotelData.id)
        .eq('is_active', true)
        .order('name');

      if (roomsError) throw roomsError;
      setRoomTypes(roomsData || []);

      // Fetch individual rooms grouped by room type
      const roomsByType: Record<string, IndividualRoom[]> = {};
      for (const roomType of roomsData || []) {
        const { data: indivRooms, error: indivError } = await supabase
          .from('individual_rooms')
          .select('*')
          .eq('room_id', roomType.id)
          .order('floor_number', { ascending: true })
          .order('room_number', { ascending: true });

        if (!indivError && indivRooms) {
          roomsByType[roomType.id] = indivRooms;
        }
      }
      setIndividualRooms(roomsByType);

      // Fetch unassigned reservations
      const { data: resData, error: resError } = await supabase
        .from('reservations')
        .select(`
          id,
          confirmation_number,
          check_in_date,
          check_out_date,
          adults,
          children,
          infants,
          room_id,
          guest_profiles(first_name, last_name)
        `)
        .is('individual_room_id', null)
        .eq('hotel_id', hotelData.id)
        .eq('reservation_status', 'confirmed');

      if (!resError && resData) {
        const unassigned = resData.map(r => ({
          id: r.id,
          confirmation_number: r.confirmation_number,
          check_in_date: r.check_in_date,
          check_out_date: r.check_out_date,
          guests: r.adults + r.children + r.infants,
          guest_name: Array.isArray(r.guest_profiles) 
            ? `${r.guest_profiles[0]?.first_name || ''} ${r.guest_profiles[0]?.last_name || ''}`.trim()
            : `${(r.guest_profiles as any)?.first_name || ''} ${(r.guest_profiles as any)?.last_name || ''}`.trim(),
          room_type_id: r.room_id
        }));
        setUnassignedReservations(unassigned);
      }

    } catch (err: any) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchArrivalAlerts = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: hotelData } = await supabase
        .from('hotels')
        .select('id')
        .eq('business_id', hotelId)
        .single();

      if (!hotelData) return;

      const { data: arrivals, error } = await supabase
        .from('reservations')
        .select(`
          id,
          confirmation_number,
          check_in_date,
          reservation_status,
          individual_rooms(room_number),
          guest_profiles(first_name, last_name)
        `)
        .eq('hotel_id', hotelData.id)
        .eq('check_in_date', today)
        .in('reservation_status', ['confirmed', 'tentative']);

      if (!error && arrivals) {
        const alerts: ArrivalAlert[] = arrivals.map(r => ({
          reservation_id: r.id,
          confirmation_number: r.confirmation_number,
          guest_name: Array.isArray(r.guest_profiles)
            ? `${r.guest_profiles[0]?.first_name || ''} ${r.guest_profiles[0]?.last_name || ''}`.trim()
            : `${(r.guest_profiles as any)?.first_name || ''} ${(r.guest_profiles as any)?.last_name || ''}`.trim(),
          check_in_date: r.check_in_date,
          reservation_status: r.reservation_status,
          assigned_room: Array.isArray(r.individual_rooms) ? r.individual_rooms[0]?.room_number : (r.individual_rooms as any)?.[0]?.room_number
        }));
        setArrivalAlerts(alerts);
      }
    } catch (err) {
      console.error('Error fetching arrivals:', err);
    }
  };

  const assignRoomToReservation = async (reservationId: string, individualRoomId: string) => {
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ individual_room_id: individualRoomId })
        .eq('id', reservationId);

      if (error) throw error;

      await fetchData();
      setSelectedReservation(null);
      router.refresh();
    } catch (err: any) {
      console.error('Error assigning room:', err);
      alert('Failed to assign room: ' + err.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'clean': return 'bg-green-100 text-green-800 border-green-300';
      case 'occupied': return 'bg-red-100 text-red-800 border-red-300';
      case 'dirty': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'maintenance': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'out_of_order': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="rounded-lg bg-white p-8">Loading...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-auto w-full max-w-7xl rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Individual Rooms Availability</h2>
              <p className="mt-1 text-blue-100">Date: {new Date(selectedDate).toLocaleDateString()}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative rounded-lg bg-white bg-opacity-20 px-4 py-2 text-white hover:bg-opacity-30"
              >
                🔔 Notifications
                {arrivalAlerts.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                    {arrivalAlerts.length}
                  </span>
                )}
              </button>
              <button
                onClick={onClose}
                className="rounded-lg bg-white bg-opacity-20 px-4 py-2 text-white hover:bg-opacity-30"
              >
                ✕ Close
              </button>
            </div>
          </div>
        </div>

        <div className="flex h-[calc(100vh-200px)]">
          {/* Main Calendar View */}
          <div className="flex-1 overflow-auto p-6">
            <div className="space-y-6">
              {roomTypes.map(roomType => {
                const rooms = individualRooms[roomType.id] || [];
                if (rooms.length === 0) return null;

                return (
                  <div key={roomType.id} className="rounded-lg border border-gray-200">
                    <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                      <h3 className="font-semibold text-gray-900">{roomType.name}</h3>
                      <p className="text-sm text-gray-600 capitalize">{roomType.room_type}</p>
                    </div>
                    <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
                      {rooms.map(room => {
                        const isUnassigned = unassignedReservations.some(
                          r => r.room_type_id === room.room_id && !selectedReservation
                        );

                        return (
                          <div
                            key={room.id}
                            className={`rounded-lg border-2 p-3 cursor-pointer transition-all ${
                              getStatusColor(room.current_status)
                            } ${
                              selectedReservation && unassignedReservations.some(r => r.room_type_id === room.room_id) 
                                ? 'ring-2 ring-blue-500' 
                                : ''
                            }`}
                            onClick={() => {
                              if (selectedReservation) {
                                assignRoomToReservation(selectedReservation.id, room.id);
                              }
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-semibold">Room {room.room_number}</div>
                                {room.floor_number && (
                                  <div className="text-xs opacity-75">Floor {room.floor_number}</div>
                                )}
                              </div>
                              <div className="text-xs capitalize font-medium">
                                {room.current_status}
                              </div>
                            </div>
                            {selectedReservation && (
                              <div className="mt-2 rounded bg-blue-200 px-2 py-1 text-xs font-medium text-blue-900">
                                Click to assign
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {roomTypes.length === 0 && (
                <div className="rounded-lg bg-gray-50 p-12 text-center">
                  <p className="text-gray-600">No rooms configured. Please add room types and create individual rooms.</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Unassigned Reservations */}
          <div className="w-80 border-l border-gray-200 bg-gray-50">
            <div className="border-b border-gray-200 bg-white px-4 py-3">
              <h3 className="font-semibold text-gray-900">Unassigned Reservations</h3>
              <p className="text-sm text-gray-600">{unassignedReservations.length} pending</p>
            </div>
            <div className="space-y-2 overflow-auto p-4">
              {unassignedReservations.map(reservation => (
                <div
                  key={reservation.id}
                  onClick={() => setSelectedReservation(reservation)}
                  className={`rounded-lg border-2 p-3 cursor-pointer transition-all ${
                    selectedReservation?.id === reservation.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-gray-900">#{reservation.confirmation_number}</div>
                  <div className="text-sm text-gray-600">{reservation.guest_name}</div>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span>Check-in: {new Date(reservation.check_in_date).toLocaleDateString()}</span>
                  </div>
                  <div className="text-xs text-gray-500">{reservation.guests} guests</div>
                </div>
              ))}
              {unassignedReservations.length === 0 && (
                <div className="py-8 text-center text-gray-500">
                  <p className="text-sm">All reservations assigned ✓</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notifications Panel */}
        {showNotifications && (
          <div className="absolute right-80 top-0 h-full w-80 border-l border-gray-200 bg-white shadow-xl">
            <div className="border-b border-gray-200 px-4 py-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Today&apos;s Arrivals</h3>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="space-y-2 overflow-auto p-4">
              {arrivalAlerts.map(alert => (
                <div
                  key={alert.reservation_id}
                  className="rounded-lg border border-blue-200 bg-blue-50 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-blue-900">#{alert.confirmation_number}</div>
                    {!alert.assigned_room && (
                      <span className="rounded-full bg-red-500 px-2 py-1 text-xs text-white">
                        ⚠️ No room assigned
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-blue-800">{alert.guest_name}</div>
                  {alert.assigned_room && (
                    <div className="mt-2 text-xs text-blue-700">
                      Room: {alert.assigned_room}
                    </div>
                  )}
                </div>
              ))}
              {arrivalAlerts.length === 0 && (
                <div className="py-8 text-center text-gray-500">
                  <p className="text-sm">No arrivals today ✓</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

