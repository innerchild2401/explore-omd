'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/lib/utils';
import ReservationDetailModal from './ReservationDetailModal';
import NewReservationModal from './NewReservationModal';

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
  room_id?: string | null;
  guest_name?: string;
}

interface ReservationSpan {
  reservation: Reservation;
  startIdx: number;
  endIdx: number;
  colspan: number;
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
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockingRoomId, setBlockingRoomId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNewReservationModal, setShowNewReservationModal] = useState(false);
  
  // Date filtering and selection
  const [filterCheckIn, setFilterCheckIn] = useState<string>('');
  const [filterCheckOut, setFilterCheckOut] = useState<string>('');
  const [selectedCheckIn, setSelectedCheckIn] = useState<string | null>(null);
  const [selectedCheckOut, setSelectedCheckOut] = useState<string | null>(null);
  const [selectedRoomForBooking, setSelectedRoomForBooking] = useState<string | null>(null);

  // Drag and drop states
  const [draggedReservation, setDraggedReservation] = useState<Reservation | null>(null);
  const [dragOverRoom, setDragOverRoom] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const calendarRef = useRef<HTMLDivElement>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, [currentDate, viewMode, filterCheckIn, filterCheckOut]);

  // Handle filter date changes - update currentDate to show filtered period
  useEffect(() => {
    if (filterCheckIn && filterCheckOut) {
      const checkInDate = new Date(filterCheckIn);
      setCurrentDate(checkInDate);
      // Auto-switch to week view if dates span more than a week
      const daysDiff = Math.ceil((new Date(filterCheckOut).getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 7 && viewMode !== 'month') {
        setViewMode('month');
      }
    }
  }, [filterCheckIn, filterCheckOut]);

  // Handle fullscreen toggle
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    const dashboardElement = document.getElementById('availability-dashboard');
    if (!dashboardElement) return;

    if (!document.fullscreenElement) {
      await dashboardElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleDateCellClick = (date: Date, roomId: string) => {
    const dateStr = date.toISOString().split('T')[0];
    
    // If clicking on a reservation span, don't select dates
    const allSpans = getReservationSpans(roomId, dates);
    const dateStrings = dates.map(d => d.toISOString().split('T')[0]);
    const dateIdx = dateStrings.indexOf(dateStr);
    const isInSpan = allSpans.some(span => dateIdx >= span.startIdx && dateIdx <= span.endIdx);
    if (isInSpan) return;

    // Reset if clicking the same date
    if (selectedCheckIn === dateStr && !selectedCheckOut) {
      setSelectedCheckIn(null);
      setSelectedRoomForBooking(null);
      return;
    }

    // First click - set check-in
    if (!selectedCheckIn) {
      setSelectedCheckIn(dateStr);
      setSelectedRoomForBooking(roomId);
      setSelectedCheckOut(null);
      return;
    }

    // Second click - set check-out
    if (selectedCheckIn && !selectedCheckOut) {
      // Check-out must be after check-in
      if (new Date(dateStr) <= new Date(selectedCheckIn)) {
        // If clicked before check-in, reset
        setSelectedCheckIn(dateStr);
        setSelectedRoomForBooking(roomId);
        setSelectedCheckOut(null);
        return;
      }
      setSelectedCheckOut(dateStr);
      return;
    }

    // Third click - reset and start new selection
    if (selectedCheckIn && selectedCheckOut) {
      setSelectedCheckIn(dateStr);
      setSelectedRoomForBooking(roomId);
      setSelectedCheckOut(null);
    }
  };

  const clearDateSelection = () => {
    setSelectedCheckIn(null);
    setSelectedCheckOut(null);
    setSelectedRoomForBooking(null);
  };

  const openBookingModal = () => {
    if (selectedCheckIn && selectedCheckOut && selectedRoomForBooking) {
      setShowNewReservationModal(true);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Calculate date range based on view mode or filter dates
      let startDate = getStartDate();
      let endDate = getEndDate();
      
      // If filter dates are set, use them for fetching
      if (filterCheckIn && filterCheckOut) {
        startDate = new Date(filterCheckIn);
        endDate = new Date(filterCheckOut);
      }
      
      // hotelId is hotels.id
      console.log('Hotel ID:', hotelId);
      
      // Fetch rooms using the hotel.id
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .eq('hotel_id', hotelId)
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
            room_id,
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
            room_id: res.room_id || null,
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

  // Calculate reservation spans for a room type
  const getReservationSpans = (roomId: string, dates: Date[]): ReservationSpan[] => {
    const spans: ReservationSpan[] = [];
    const dateStrings = dates.map(d => d.toISOString().split('T')[0]);
    
    const reservationsForRoom = reservations.filter(res => 
      res.room_id === roomId &&
      res.reservation_status !== 'cancelled'
    );

    reservationsForRoom.forEach(reservation => {
      const checkInIdx = dateStrings.findIndex(d => d >= reservation.check_in_date);
      const checkOutIdx = dateStrings.findIndex(d => d >= reservation.check_out_date);
      
      if (checkInIdx !== -1 && checkOutIdx !== -1 && checkInIdx < checkOutIdx) {
        spans.push({
          reservation,
          startIdx: checkInIdx,
          endIdx: checkOutIdx - 1,
          colspan: checkOutIdx - checkInIdx
        });
      } else if (checkInIdx !== -1 && checkOutIdx === -1) {
        // Reservation extends beyond view
        spans.push({
          reservation,
          startIdx: checkInIdx,
          endIdx: dates.length - 1,
          colspan: dates.length - checkInIdx
        });
      }
    });

    // Sort by start index
    return spans.sort((a, b) => a.startIdx - b.startIdx);
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

  const getReservationStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-blue-500 hover:bg-blue-600';
      case 'checked_in': return 'bg-green-500 hover:bg-green-600';
      case 'tentative': return 'bg-yellow-500 hover:bg-yellow-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
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

  const handleBlockRoom = async (roomId: string, startDate: string, endDate: string, reason: string) => {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const dates: string[] = [];
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split('T')[0]);
      }

      // Get room quantity
      const room = rooms.find(r => r.id === roomId);
      const roomQuantity = room?.quantity || 1;

      // Block all dates in the range
      const blocks = dates.map(date => ({
        room_id: roomId,
        date,
        available_quantity: 0,
        availability_status: 'blocked' as const,
        blocked_reason: reason
      }));

      const { error } = await supabase
        .from('room_availability')
        .upsert(blocks, { onConflict: 'room_id,date' });

      if (error) throw error;

      await fetchData();
      router.refresh();
      setShowBlockModal(false);
      setBlockingRoomId(null);
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

  // Filter dates if filter dates are set
  const displayDates = filterCheckIn && filterCheckOut
    ? dates.filter(date => {
        const dateStr = date.toISOString().split('T')[0];
        return dateStr >= filterCheckIn && dateStr <= filterCheckOut;
      })
    : dates;

  // Check if a date is in the selected range
  const isDateSelected = (date: Date) => {
    if (!selectedCheckIn) return false;
    const dateStr = date.toISOString().split('T')[0];
    if (!selectedCheckOut) {
      return dateStr === selectedCheckIn;
    }
    return dateStr >= selectedCheckIn && dateStr <= selectedCheckOut;
  };

  const isDateCheckIn = (date: Date) => {
    if (!selectedCheckIn) return false;
    return date.toISOString().split('T')[0] === selectedCheckIn;
  };

  const isDateCheckOut = (date: Date) => {
    if (!selectedCheckOut) return false;
    return date.toISOString().split('T')[0] === selectedCheckOut;
  };

  // Get portal target - use fullscreen element if in fullscreen, otherwise document.body
  const getPortalTarget = () => {
    if (isFullscreen && dashboardRef.current) {
      return dashboardRef.current;
    }
    return typeof window !== 'undefined' ? document.body : null;
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 ${isFullscreen ? 'p-0' : ''}`}>
      <div 
        ref={dashboardRef}
        id="availability-dashboard"
        className={`${isFullscreen ? 'h-screen w-screen max-h-screen max-w-screen rounded-none' : 'max-h-[95vh] w-full max-w-7xl rounded-lg'} overflow-y-auto bg-white shadow-xl`}
      >
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
          <div className="mt-4 space-y-4">
            {/* Top Row: Date Filters and Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                {/* Date Filter Pickers */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Filter:</label>
                  <input
                    type="date"
                    value={filterCheckIn}
                    onChange={(e) => {
                      setFilterCheckIn(e.target.value);
                      if (e.target.value && filterCheckOut && e.target.value > filterCheckOut) {
                        setFilterCheckOut('');
                      }
                    }}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900"
                    placeholder="Check-in"
                  />
                  <span className="text-gray-500">→</span>
                  <input
                    type="date"
                    value={filterCheckOut}
                    onChange={(e) => setFilterCheckOut(e.target.value)}
                    min={filterCheckIn || undefined}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900"
                    placeholder="Check-out"
                  />
                  {(filterCheckIn || filterCheckOut) && (
                    <button
                      onClick={() => {
                        setFilterCheckIn('');
                        setFilterCheckOut('');
                      }}
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Selected Dates for Booking */}
                {selectedCheckIn && (
                  <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5">
                    <span className="text-sm font-medium text-blue-900">
                      Booking: {new Date(selectedCheckIn).toLocaleDateString()}
                      {selectedCheckOut && ` → ${new Date(selectedCheckOut).toLocaleDateString()}`}
                    </span>
                    {selectedCheckIn && selectedCheckOut && (
                      <button
                        onClick={openBookingModal}
                        className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                      >
                        Book Now
                      </button>
                    )}
                    <button
                      onClick={clearDateSelection}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* Fullscreen Toggle */}
              <button
                onClick={toggleFullscreen}
                className="rounded-lg bg-gray-100 px-3 py-2 text-gray-700 hover:bg-gray-200"
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              >
                {isFullscreen ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                )}
              </button>
            </div>

            {/* Bottom Row: View Mode and Navigation */}
            <div className="flex items-center justify-between">
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
              <div className="flex items-center gap-4 text-sm text-gray-900">
                <div className="flex items-center gap-1">
                  <span className="text-green-600">✅</span>
                  <span className="font-medium">Available</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-red-600">🔴</span>
                  <span className="font-medium">Booked</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-yellow-600">🚫</span>
                  <span className="font-medium">Blocked</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-orange-600">🔧</span>
                  <span className="font-medium">Maintenance</span>
                </div>
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
              {/* Calendar Table */}
              <table className="min-w-full border-collapse">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 min-w-[200px] border-r-2 border-gray-300 bg-gray-100 px-4 py-3 text-left text-sm font-bold text-gray-900">
                      Room
                    </th>
                    {displayDates.map(date => (
                      <th
                        key={date.toISOString()}
                        className="min-w-[120px] border-b border-gray-300 bg-gray-100 px-2 py-3 text-center text-xs font-bold text-gray-900"
                      >
                        {formatDate(date)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rooms.map(room => {
                    // Filter spans to only show those in displayDates
                    const allSpans = getReservationSpans(room.id, dates);
                    const dateStrings = dates.map(d => d.toISOString().split('T')[0]);
                    const displayDateStrings = displayDates.map(d => d.toISOString().split('T')[0]);
                    const displayStartIdx = displayDateStrings.length > 0 ? dateStrings.indexOf(displayDateStrings[0]) : 0;
                    
                    const spans = allSpans.filter(span => {
                      // Check if span overlaps with display dates
                      return span.startIdx < displayStartIdx + displayDateStrings.length && 
                             span.endIdx >= displayStartIdx;
                    }).map(span => ({
                      ...span,
                      startIdx: Math.max(0, span.startIdx - displayStartIdx),
                      endIdx: Math.min(displayDateStrings.length - 1, span.endIdx - displayStartIdx),
                      colspan: Math.min(span.colspan, displayDateStrings.length - Math.max(0, span.startIdx - displayStartIdx))
                    }));
                    
                    const occupiedDates = new Set<number>();
                    spans.forEach(span => {
                      for (let i = span.startIdx; i <= span.endIdx; i++) {
                        occupiedDates.add(i);
                      }
                    });

                    const isRoomSelected = selectedRoomForBooking === room.id;
                    const hasValidSelection = selectedCheckIn && selectedCheckOut && isRoomSelected;

                    return (
                      <tr key={room.id}>
                        <td className="sticky left-0 z-10 border-r-2 border-gray-300 bg-gray-50 px-4 py-3 font-medium shadow-sm">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-gray-900">{room.name}</div>
                              <div className="text-xs text-gray-600 capitalize">{room.room_type.replace('_', ' ')}</div>
                              <div className="text-xs text-gray-600">{formatPrice(room.base_price, 'RON')}/night</div>
                              <div className="text-xs text-gray-500 mt-1">{room.quantity} room{room.quantity !== 1 ? 's' : ''}</div>
                              {hasValidSelection && (
                                <button
                                  onClick={openBookingModal}
                                  className="mt-2 rounded bg-blue-600 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                                >
                                  Book Selected Dates
                                </button>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                setBlockingRoomId(room.id);
                                setShowBlockModal(true);
                              }}
                              className="text-xs text-orange-600 hover:text-orange-700"
                              title="Block dates for this room type"
                            >
                              🚫
                            </button>
                          </div>
                        </td>
                        {displayDates.map((date, displayIdx) => {
                          const dateStr = date.toISOString().split('T')[0];
                          const isToday = dateStr === new Date().toISOString().split('T')[0];
                          const avail = getAvailabilityForRoomAndDate(room.id, dateStr);
                          
                          // Check if this cell is part of a reservation span
                          const span = spans.find(s => s.startIdx === displayIdx);
                          
                          // Check if date is selected for booking
                          const isSelected = isDateSelected(date);
                          const isCheckIn = isDateCheckIn(date);
                          const isCheckOut = isDateCheckOut(date);
                          
                          if (span) {
                            // This is the start of a reservation span
                            const reservation = span.reservation;
                            const nights = Math.ceil(
                              (new Date(reservation.check_out_date).getTime() - new Date(reservation.check_in_date).getTime()) / (1000 * 60 * 60 * 24)
                            );
                            
                            return (
                              <td
                                key={dateStr}
                                colSpan={span.colspan}
                                className={`border-b border-l border-gray-200 px-2 py-2 text-center relative ${isToday ? 'border-blue-400' : ''}`}
                              >
                                <button
                                  onClick={() => setSelectedReservationId(reservation.id)}
                                  className="w-full rounded-lg bg-blue-500 hover:bg-blue-600 px-2 py-2 text-white shadow-sm transition-all hover:shadow-md"
                                >
                                  <div className="text-xs font-bold">#{reservation.confirmation_number}</div>
                                  <div className="text-[10px] mt-0.5 opacity-90">
                                    {reservation.guest_name || 'Guest'}
                                  </div>
                                  <div className="text-[10px] mt-0.5 opacity-75">
                                    {reservation.adults + reservation.children} guest{reservation.adults + reservation.children !== 1 ? 's' : ''} • {nights} night{nights !== 1 ? 's' : ''}
                                  </div>
                                </button>
                              </td>
                            );
                          } else if (occupiedDates.has(displayIdx)) {
                            // This cell is part of a span but not the start - skip it (handled by colspan)
                            return null;
                          } else {
                            // Empty cell - check for blocked status
                            const status = avail?.availability_status || 'available';
                            const isBlocked = status === 'blocked' || status === 'maintenance' || status === 'out_of_order';
                            const canSelect = status === 'available' && !isBlocked;
                            
                            return (
                              <td
                                key={dateStr}
                                onClick={() => canSelect && handleDateCellClick(date, room.id)}
                                className={`border-b border-l border-gray-200 px-1 py-3 text-center text-xs transition-colors ${
                                  isToday ? 'border-blue-400 bg-blue-50' : '' 
                                } ${
                                  isSelected && isRoomSelected ? 'bg-blue-100' : ''
                                } ${
                                  isCheckIn && isRoomSelected ? 'bg-blue-200 border-2 border-blue-500' : ''
                                } ${
                                  isCheckOut && isRoomSelected ? 'bg-blue-200 border-2 border-blue-500' : ''
                                } ${
                                  canSelect ? 'cursor-pointer hover:bg-gray-100' : ''
                                } ${getStatusColor(status)}`}
                              >
                                <div className="flex flex-col items-center gap-1">
                                  <span>{getStatusIcon(status)}</span>
                                  <div className="text-[10px] font-medium">
                                    {avail?.available_quantity !== undefined ? 
                                      `${avail.available_quantity}/${room.quantity}` : 
                                      `${room.quantity}/${room.quantity}`
                                    }
                                  </div>
                                  {isCheckIn && isRoomSelected && (
                                    <div className="text-[8px] font-bold text-blue-700">CHECK-IN</div>
                                  )}
                                  {isCheckOut && isRoomSelected && (
                                    <div className="text-[8px] font-bold text-blue-700">CHECK-OUT</div>
                                  )}
                                  {status === 'available' && !isSelected && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setBlockingRoomId(room.id);
                                        setShowBlockModal(true);
                                      }}
                                      className="text-[9px] text-gray-600 hover:text-gray-900 mt-1"
                                      title="Block this date"
                                    >
                                      Block
                                    </button>
                                  )}
                                  {isBlocked && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUnblockRoom(room.id, dateStr);
                                      }}
                                      className="text-[9px] text-red-600 hover:text-red-700 mt-1"
                                      title="Unblock"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              </td>
                            );
                          }
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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

      {/* Reservation Detail Modal - Rendered via Portal */}
      {selectedReservationId && getPortalTarget() && createPortal(
        <ReservationDetailModal
          reservationId={selectedReservationId}
          hotelId={hotelId}
          onClose={() => {
            setSelectedReservationId(null);
            fetchData();
          }}
          onUpdate={() => {
            fetchData();
          }}
        />,
        getPortalTarget()!
      )}

      {/* Block Dates Modal - Rendered via Portal */}
      {showBlockModal && blockingRoomId && getPortalTarget() && createPortal(
        <BlockDatesModal
          roomId={blockingRoomId}
          roomName={rooms.find(r => r.id === blockingRoomId)?.name || ''}
          hotelId={hotelId}
          onClose={() => {
            setShowBlockModal(false);
            setBlockingRoomId(null);
          }}
          onBlock={handleBlockRoom}
        />,
        getPortalTarget()!
      )}

      {/* New Reservation Modal - Rendered via Portal */}
      {showNewReservationModal && selectedCheckIn && selectedCheckOut && selectedRoomForBooking && getPortalTarget() && createPortal(
        <NewReservationModal
          hotelId={hotelId}
          rooms={rooms}
          onClose={() => {
            setShowNewReservationModal(false);
            clearDateSelection();
          }}
          onSuccess={() => {
            setShowNewReservationModal(false);
            clearDateSelection();
            fetchData();
            router.refresh();
          }}
          prefillDates={{
            checkIn: selectedCheckIn,
            checkOut: selectedCheckOut,
            roomId: selectedRoomForBooking
          }}
        />,
        getPortalTarget()!
      )}
    </div>
  );
}

// Block Dates Modal Component
function BlockDatesModal({
  roomId,
  roomName,
  hotelId,
  onClose,
  onBlock
}: {
  roomId: string;
  roomName: string;
  hotelId: string;
  onClose: () => void;
  onBlock: (roomId: string, startDate: string, endDate: string, reason: string) => Promise<void>;
}) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [blocking, setBlocking] = useState(false);

  useEffect(() => {
    // Set default dates to today
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
  }, []);

  const handleBlock = async () => {
    if (!startDate || !endDate) {
      alert('Please select start and end dates');
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      alert('End date must be after start date');
      return;
    }

    setBlocking(true);
    try {
      await onBlock(roomId, startDate, endDate, reason || 'Blocked by admin');
    } finally {
      setBlocking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-xl font-bold text-gray-900">Block Dates</h3>
        <p className="mb-4 text-sm text-gray-600">Blocking: {roomName}</p>
        
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Reason (optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Maintenance, Renovation, Private Event"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleBlock}
            disabled={blocking}
            className="rounded-lg bg-orange-600 px-4 py-2 font-medium text-white hover:bg-orange-700 disabled:bg-gray-400"
          >
            {blocking ? 'Blocking...' : 'Block Dates'}
          </button>
        </div>
      </div>
    </div>
  );
}
