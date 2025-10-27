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

interface Reservation {
  id: string;
  check_in_date: string;
  check_out_date: string;
  adults: number;
  children: number;
  infants: number;
  individual_room_id: string | null;
  room_id: string | null;
  reservation_status: string;
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
  
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [individualRooms, setIndividualRooms] = useState<Record<string, IndividualRoom[]>>({});
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [arrivalAlerts, setArrivalAlerts] = useState<ArrivalAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    fetchArrivalAlerts();
  }, [currentDate, viewMode]);

  const getDateRange = () => {
    const start = new Date(currentDate);
    if (viewMode === 'week') {
      start.setDate(start.getDate() - start.getDay()); // Start of week
      return { start, days: 7 };
    } else {
      start.setDate(1); // First day of month
      const lastDay = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      return { start, days: lastDay.getDate() };
    }
  };

  const getDates = () => {
    const { start, days } = getDateRange();
    const dates = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

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

      // Fetch all reservations from reservations table
      const { data: resData, error: resError } = await supabase
        .from('reservations')
        .select(`
          id,
          check_in_date,
          check_out_date,
          adults,
          children,
          infants,
          individual_room_id,
          room_id,
          reservation_status
        `)
        .eq('hotel_id', hotelData.id)
        .in('reservation_status', ['confirmed', 'checked_in']);

      if (!resError && resData) {
        setAllReservations(resData as any);
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

      const { data: arrivals } = await supabase
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

      if (arrivals) {
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

  const getReservationForRoomAndDate = (roomId: string, date: Date): Reservation | null => {
    const dateStr = date.toISOString().split('T')[0];
    // Only show reservations that are assigned to this specific individual room
    return allReservations.find(res => {
      if (res.individual_room_id !== roomId) return false;
      return res.check_in_date <= dateStr && res.check_out_date > dateStr;
    }) || null;
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

  const dates = getDates();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-auto w-full max-w-[95vw] rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  const newDate = new Date(currentDate);
                  if (viewMode === 'week') {
                    newDate.setDate(newDate.getDate() - 7);
                  } else {
                    newDate.setMonth(newDate.getMonth() - 1);
                  }
                  setCurrentDate(newDate);
                }}
                className="rounded-lg bg-white bg-opacity-20 px-3 py-1 text-white hover:bg-opacity-30"
              >
                ‹
              </button>
              <div>
                <h2 className="text-2xl font-bold text-white">Individual Rooms Availability</h2>
                <p className="text-blue-100">{currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
              </div>
              <button
                onClick={() => {
                  const newDate = new Date(currentDate);
                  if (viewMode === 'week') {
                    newDate.setDate(newDate.getDate() + 7);
                  } else {
                    newDate.setMonth(newDate.getMonth() + 1);
                  }
                  setCurrentDate(newDate);
                }}
                className="rounded-lg bg-white bg-opacity-20 px-3 py-1 text-white hover:bg-opacity-30"
              >
                ›
              </button>
            </div>
            <div className="flex gap-3">
              <div className="flex rounded-lg bg-white bg-opacity-20 p-1">
                <button
                  onClick={() => setViewMode('week')}
                  className={`rounded px-4 py-2 text-sm font-semibold ${
                    viewMode === 'week' ? 'bg-white text-blue-700' : 'text-white'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setViewMode('month')}
                  className={`rounded px-4 py-2 text-sm font-semibold ${
                    viewMode === 'month' ? 'bg-white text-blue-700' : 'text-white'
                  }`}
                >
                  Month
                </button>
              </div>
              <button
                onClick={fetchArrivalAlerts}
                className="relative rounded-lg bg-white bg-opacity-20 px-4 py-2 text-white hover:bg-opacity-30"
              >
                🔔
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

        {/* Calendar Grid */}
        <div className="overflow-auto p-6" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          <div className="inline-block min-w-full">
            {roomTypes.map(roomType => {
              const rooms = individualRooms[roomType.id] || [];
              if (rooms.length === 0) return null;

              return (
                <div key={roomType.id} className="mb-8">
                  {/* Room Type Header */}
                  <div className="sticky top-0 z-10 border-b-2 border-gray-300 bg-gray-50 pb-2 mb-4">
                    <h3 className="font-bold text-gray-900">{roomType.name}</h3>
                    <p className="text-sm text-gray-600 capitalize">{roomType.room_type}</p>
                  </div>

                  {/* Calendar Table */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="sticky left-0 z-10 min-w-[180px] border-r-2 border-gray-300 bg-gray-100 px-4 py-3 text-left text-sm font-bold text-gray-900">
                            Room
                          </th>
                          {dates.map(date => (
                            <th
                              key={date.toISOString()}
                              className="min-w-[100px] border-b border-gray-300 bg-gray-100 px-2 py-3 text-center text-xs font-bold text-gray-900"
                            >
                              {date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rooms.map(room => (
                          <tr key={room.id}>
                            <td className="sticky left-0 z-10 border-r-2 border-gray-300 bg-gray-50 px-4 py-3 font-medium shadow-sm">
                              <div className="font-semibold text-gray-900">Room {room.room_number}</div>
                              {room.floor_number && (
                                <div className="text-xs text-gray-600 mt-0.5">Floor {room.floor_number}</div>
                              )}
                              <div className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold border ${getStatusColor(room.current_status)}`}>
                                {room.current_status}
                              </div>
                            </td>
                            {dates.map(date => {
                              const reservation = getReservationForRoomAndDate(room.id, date);
                              const dateStr = date.toISOString().split('T')[0];
                              const isToday = dateStr === new Date().toISOString().split('T')[0];

                              return (
                                <td
                                  key={dateStr}
                                  className={`border-b border-l border-gray-200 px-1 py-3 text-center text-xs hover:bg-gray-50 transition-colors ${
                                    isToday ? 'bg-blue-50 border-blue-200' : 'bg-white'
                                  } ${!reservation && 'text-gray-300'}`}
                                >
                                  {reservation ? (
                                    <div className="rounded-md bg-gradient-to-br from-blue-500 to-blue-600 p-1.5 text-white shadow-sm hover:shadow-md transition-all">
                                      <div className="font-bold text-[10px]">#{reservation.id.slice(-6)}</div>
                                      <div className="text-[9px] mt-0.5 opacity-90">
                                        {reservation.adults + reservation.children + reservation.infants} {reservation.adults + reservation.children + reservation.infants === 1 ? 'guest' : 'guests'}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-gray-300">—</div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Arrival Alerts - Fixed Panel */}
        {arrivalAlerts.length > 0 && (
          <div className="absolute bottom-4 right-4 w-80 rounded-lg border-2 border-red-500 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 bg-red-50 px-4 py-3">
              <h3 className="font-bold text-red-900">⚠️ Today&apos;s Arrivals</h3>
              <span className="rounded-full bg-red-500 px-2 py-1 text-xs text-white">
                {arrivalAlerts.length}
              </span>
            </div>
            <div className="max-h-64 space-y-2 overflow-auto p-4">
              {arrivalAlerts.map(alert => (
                <div key={alert.reservation_id} className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-red-900">#{alert.confirmation_number}</div>
                    {!alert.assigned_room && (
                      <span className="rounded-full bg-red-500 px-2 py-1 text-xs text-white">⚠️</span>
                    )}
                  </div>
                  <div className="text-sm text-red-800">{alert.guest_name}</div>
                  {alert.assigned_room && (
                    <div className="mt-2 text-xs text-red-700">
                      Room: {alert.assigned_room} ✓
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
