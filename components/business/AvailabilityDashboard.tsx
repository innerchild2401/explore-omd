'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface AvailabilityDashboardProps {
  hotelId: string;
  onClose: () => void;
}

interface Room {
  id: string;
  name: string;
  room_type: string;
  max_occupancy: number;
  base_price: number;
  quantity: number;
  is_active: boolean;
}

interface RoomAvailability {
  id: string;
  room_id: string;
  date: string;
  available_quantity: number;
  availability_status: 'available' | 'booked' | 'blocked' | 'maintenance' | 'out_of_order';
  reservation_id?: string;
  blocked_reason?: string;
  housekeeping_status: 'clean' | 'dirty' | 'inspected' | 'out_of_order';
  housekeeping_notes?: string;
}

interface Reservation {
  id: string;
  confirmation_number: string;
  guest_id: string;
  check_in_date: string;
  check_out_date: string;
  adults: number;
  children: number;
  reservation_status: 'tentative' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';
  guest_name?: string;
}

export default function AvailabilityDashboard({ hotelId, onClose }: AvailabilityDashboardProps) {
  const router = useRouter();
  const supabase = createClient();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [availability, setAvailability] = useState<RoomAvailability[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Drag and drop states
  const [draggedReservation, setDraggedReservation] = useState<Reservation | null>(null);
  const [dragOverRoom, setDragOverRoom] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, [currentDate, viewMode]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Calculate date range based on view mode
      const startDate = getStartDate();
      const endDate = getEndDate();
      
      // First, get the hotel record associated with this business
      const { data: hotelData, error: hotelError } = await supabase
        .from('hotels')
        .select('id')
        .eq('business_id', hotelId)
        .single();

      if (hotelError) throw hotelError;
      
      // Now fetch rooms using the actual hotel.id
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .eq('hotel_id', hotelData.id)
        .eq('is_active', true)
        .order('name');

      if (roomsError) throw roomsError;

      // Fetch availability with reservations using proper foreign key relationship
      const { data: availabilityData, error: availabilityError } = await supabase
        .from('room_availability')
        .select(`
          *,
          reservations!left(
            id,
            confirmation_number,
            guest_id,
            check_in_date,
            check_out_date,
            adults,
            children,
            reservation_status,
            guest_profiles!inner(first_name, last_name)
          )
        `)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .in('room_id', roomsData?.map(r => r.id) || []);

      if (availabilityError) throw availabilityError;

      // Process reservations from joined availability data
      const reservationsMap = new Map<string, Reservation>();
      availabilityData?.forEach(avail => {
        if (avail.reservations) {
          const res = avail.reservations as any;
          reservationsMap.set(res.id, {
            id: res.id,
            confirmation_number: res.confirmation_number,
            guest_id: res.guest_id,
            check_in_date: res.check_in_date,
            check_out_date: res.check_out_date,
            adults: res.adults,
            children: res.children,
            reservation_status: res.reservation_status,
            guest_name: `${res.guest_profiles?.first_name || ''} ${res.guest_profiles?.last_name || ''}`.trim()
          });
        }
      });

      setRooms(roomsData || []);
      setAvailability(availabilityData || []);
      setReservations(Array.from(reservationsMap.values()));
      
      // Debug logging
      console.log('AvailabilityDashboard - Rooms:', roomsData?.length, roomsData);
      console.log('AvailabilityDashboard - Availability:', availabilityData?.length, availabilityData);
      console.log('AvailabilityDashboard - Reservations:', Array.from(reservationsMap.values()).length);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStartDate = () => {
    const date = new Date(currentDate);
    switch (viewMode) {
      case 'day':
        return date;
      case 'week':
        const dayOfWeek = date.getDay();
        date.setDate(date.getDate() - dayOfWeek);
        return date;
      case 'month':
        return new Date(date.getFullYear(), date.getMonth(), 1);
      default:
        return date;
    }
  };

  const getEndDate = () => {
    const date = new Date(currentDate);
    switch (viewMode) {
      case 'day':
        return date;
      case 'week':
        date.setDate(date.getDate() + (6 - date.getDay()));
        return date;
      case 'month':
        return new Date(date.getFullYear(), date.getMonth() + 1, 0);
      default:
        return date;
    }
  };

  const getDatesInRange = () => {
    const start = getStartDate();
    const end = getEndDate();
    const dates = [];
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }
    
    return dates;
  };

  const getAvailabilityForRoomAndDate = (roomId: string, date: string) => {
    return availability.find(avail => 
      avail.room_id === roomId && avail.date === date
    );
  };

  const getReservationForRoomAndDate = (roomId: string, date: string) => {
    const avail = getAvailabilityForRoomAndDate(roomId, date);
    if (avail?.reservation_id) {
      return reservations.find(res => res.id === avail.reservation_id);
    }
    return null;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 border-green-300 text-green-800';
      case 'booked': return 'bg-red-100 border-red-300 text-red-800';
      case 'blocked': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'maintenance': return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'out_of_order': return 'bg-gray-100 border-gray-300 text-gray-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return '✅';
      case 'booked': return '🔴';
      case 'blocked': return '🚫';
      case 'maintenance': return '🔧';
      case 'out_of_order': return '❌';
      default: return '❓';
    }
  };

  const handleDragStart = (e: React.DragEvent, reservation: Reservation) => {
    setDraggedReservation(reservation);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, roomId: string, date: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverRoom(roomId);
    setDragOverDate(date);
  };

  const handleDragLeave = () => {
    setDragOverRoom(null);
    setDragOverDate(null);
  };

  const handleDrop = async (e: React.DragEvent, targetRoomId: string, targetDate: string) => {
    e.preventDefault();
    
    if (!draggedReservation) return;

    // Check if target room is available for the entire stay
    const checkIn = new Date(draggedReservation.check_in_date);
    const checkOut = new Date(draggedReservation.check_out_date);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    
    let canMove = true;
    for (let i = 0; i < nights; i++) {
      const checkDate = new Date(checkIn);
      checkDate.setDate(checkIn.getDate() + i);
      const dateStr = checkDate.toISOString().split('T')[0];
      
      const avail = getAvailabilityForRoomAndDate(targetRoomId, dateStr);
      if (avail && avail.availability_status !== 'available') {
        canMove = false;
        break;
      }
    }

    if (!canMove) {
      setError('Cannot move reservation - room not available for entire stay');
      return;
    }

    try {
      // Update reservation with new room
      const { error: updateError } = await supabase
        .from('reservations')
        .update({ room_id: targetRoomId })
        .eq('id', draggedReservation.id);

      if (updateError) throw updateError;

      // Refresh data
      await fetchData();
      router.refresh();
    } catch (err: any) {
      console.error('Error moving reservation:', err);
      setError(err.message);
    } finally {
      setDraggedReservation(null);
      setDragOverRoom(null);
      setDragOverDate(null);
    }
  };

  const handleBlockRoom = async (roomId: string, date: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('room_availability')
        .upsert({
          room_id: roomId,
          date: date,
          available_quantity: 0, // Required field - 0 means blocked
          availability_status: 'blocked',
          blocked_reason: reason
        });

      if (error) throw error;

      await fetchData();
      router.refresh();
    } catch (err: any) {
      console.error('Error blocking room:', err);
      setError(err.message);
    }
  };

  const handleUnblockRoom = async (roomId: string, date: string) => {
    try {
      // Get the room's quantity to set proper available_quantity
      const room = rooms.find(r => r.id === roomId);
      const availableQuantity = room?.quantity || 1;

      const { error } = await supabase
        .from('room_availability')
        .upsert({
          room_id: roomId,
          date: date,
          available_quantity: availableQuantity, // Set to room quantity when available
          availability_status: 'available',
          blocked_reason: null
        });

      if (error) throw error;

      await fetchData();
      router.refresh();
    } catch (err: any) {
      console.error('Error unblocking room:', err);
      setError(err.message);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const dates = getDatesInRange();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[95vh] w-full max-w-7xl overflow-y-auto rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Availability Dashboard</h2>
              <p className="text-sm text-gray-600">Manage room availability and bookings</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Controls */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* View Mode Toggle */}
              <div className="flex rounded-lg bg-gray-100 p-1">
                {(['day', 'week', 'month'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      viewMode === mode 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>

              {/* Date Navigation */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const newDate = new Date(currentDate);
                    if (viewMode === 'day') newDate.setDate(newDate.getDate() - 1);
                    else if (viewMode === 'week') newDate.setDate(newDate.getDate() - 7);
                    else if (viewMode === 'month') newDate.setMonth(newDate.getMonth() - 1);
                    setCurrentDate(newDate);
                  }}
                  className="rounded-lg bg-gray-100 px-3 py-2 text-gray-700 hover:bg-gray-200"
                >
                  ← Previous
                </button>
                <span className="px-4 py-2 text-sm font-medium text-gray-900">
                  {currentDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
                <button
                  onClick={() => {
                    const newDate = new Date(currentDate);
                    if (viewMode === 'day') newDate.setDate(newDate.getDate() + 1);
                    else if (viewMode === 'week') newDate.setDate(newDate.getDate() + 7);
                    else if (viewMode === 'month') newDate.setMonth(newDate.getMonth() + 1);
                    setCurrentDate(newDate);
                  }}
                  className="rounded-lg bg-gray-100 px-3 py-2 text-gray-700 hover:bg-gray-200"
                >
                  Next →
                </button>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <span className="text-green-600">✅</span>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-red-600">🔴</span>
                <span>Booked</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-yellow-600">🚫</span>
                <span>Blocked</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-orange-600">🔧</span>
                <span>Maintenance</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="py-8 text-center text-gray-500">Loading availability...</div>
          ) : error ? (
            <div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              {/* Calendar Grid */}
              <div className="min-w-full">
                {/* Header Row */}
                <div className="grid gap-1 mb-2" style={{ gridTemplateColumns: `200px repeat(${dates.length}, 1fr)` }}>
                  <div className="p-3 font-medium text-gray-700 bg-gray-50 rounded-lg">
                    Room
                  </div>
                  {dates.map(date => (
                    <div key={date.toISOString()} className="p-3 text-center font-medium text-gray-700 bg-gray-50 rounded-lg">
                      <div className="text-sm">{formatDate(date)}</div>
                    </div>
                  ))}
                </div>

                {/* Room Rows */}
                {rooms.map(room => (
                  <div key={room.id} className="grid gap-1 mb-1" style={{ gridTemplateColumns: `200px repeat(${dates.length}, 1fr)` }}>
                    {/* Room Info */}
                    <div className="p-3 bg-white border border-gray-200 rounded-lg">
                      <div className="font-medium text-gray-900">{room.name}</div>
                      <div className="text-sm text-gray-600 capitalize">{room.room_type.replace('_', ' ')}</div>
                      <div className="text-sm text-gray-600">€{room.base_price}/night</div>
                    </div>

                    {/* Availability Cells */}
                    {dates.map(date => {
                      const dateStr = date.toISOString().split('T')[0];
                      const avail = getAvailabilityForRoomAndDate(room.id, dateStr);
                      const reservation = getReservationForRoomAndDate(room.id, dateStr);
                      const status = avail?.availability_status || 'available';
                      const isDragOver = dragOverRoom === room.id && dragOverDate === dateStr;

                      return (
                        <div
                          key={`${room.id}-${dateStr}`}
                          className={`p-2 border rounded-lg min-h-[60px] transition-colors ${
                            isDragOver ? 'bg-blue-100 border-blue-400' : ''
                          } ${getStatusColor(status)}`}
                          onDragOver={(e) => handleDragOver(e, room.id, dateStr)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, room.id, dateStr)}
                        >
                          <div className="flex flex-col h-full">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs">{getStatusIcon(status)}</span>
                              {status === 'blocked' && (
                                <button
                                  onClick={() => handleUnblockRoom(room.id, dateStr)}
                                  className="text-xs text-gray-500 hover:text-gray-700"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                            
                            {/* Show actual availability quantity */}
                            <div className="text-xs font-medium text-gray-700">
                              {avail?.available_quantity !== undefined ? 
                                `${avail.available_quantity}/${room.quantity}` : 
                                `${room.quantity}/${room.quantity}`
                              }
                            </div>
                            
                            {reservation && (
                              <div 
                                className="text-xs bg-white/80 rounded px-1 py-0.5 cursor-move"
                                draggable
                                onDragStart={(e) => handleDragStart(e, reservation)}
                              >
                                <div className="font-medium">{reservation.confirmation_number}</div>
                                <div className="text-gray-600">{reservation.guest_name}</div>
                                <div className="text-gray-500">{reservation.adults}p</div>
                              </div>
                            )}
                            
                            {status === 'available' && (
                              <button
                                onClick={() => {
                                  const reason = prompt('Reason for blocking:');
                                  if (reason) handleBlockRoom(room.id, dateStr, reason);
                                }}
                                className="text-xs text-gray-500 hover:text-gray-700 mt-auto"
                              >
                                Block
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-6 rounded-lg bg-blue-50 p-4">
            <h3 className="font-medium text-blue-900 mb-2">💡 How to use:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Drag & Drop:</strong> Move reservations between rooms by dragging the booking cards</li>
              <li>• <strong>Block Rooms:</strong> Click &quot;Block&quot; on available dates to mark rooms as unavailable</li>
              <li>• <strong>View Modes:</strong> Switch between Day, Week, and Month views</li>
              <li>• <strong>Real-time Updates:</strong> Changes sync automatically across all channels</li>
            </ul>
          </div>

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
    </div>
  );
}
