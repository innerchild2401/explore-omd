'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import ReservationDetailModal from './ReservationDetailModal';
import NewReservationModal from './NewReservationModal';

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
  confirmation_number: string;
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

interface ReservationSpan {
  reservation: Reservation;
  startIdx: number;
  endIdx: number;
  colspan: number;
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
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockingRoomId, setBlockingRoomId] = useState<string | null>(null);
  const [blockingRoomTypeId, setBlockingRoomTypeId] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [showNewReservationModal, setShowNewReservationModal] = useState(false);
  
  // Date filtering and selection
  const [filterCheckIn, setFilterCheckIn] = useState<string>('');
  const [filterCheckOut, setFilterCheckOut] = useState<string>('');
  const [selectedCheckIn, setSelectedCheckIn] = useState<string | null>(null);
  const [selectedCheckOut, setSelectedCheckOut] = useState<string | null>(null);
  const [selectedIndividualRoomId, setSelectedIndividualRoomId] = useState<string | null>(null);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string | null>(null);
  
  const alertsDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
    fetchArrivalAlerts();
  }, [currentDate, viewMode, filterCheckIn, filterCheckOut]);

  // Handle filter date changes - update currentDate to show filtered period
  useEffect(() => {
    if (filterCheckIn && filterCheckOut) {
      const checkInDate = new Date(filterCheckIn);
      setCurrentDate(checkInDate);
      // Auto-switch to month view if dates span more than a week
      const daysDiff = Math.ceil((new Date(filterCheckOut).getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 7 && viewMode !== 'month') {
        setViewMode('month');
      }
    }
  }, [filterCheckIn, filterCheckOut]);


  const handleDateCellClick = (date: Date, individualRoomId: string, roomTypeId: string) => {
    const dateStr = date.toISOString().split('T')[0];
    
    // If clicking on a reservation span, don't select dates
    const allSpans = getReservationSpans(individualRoomId, dates);
    const dateStrings = dates.map(d => d.toISOString().split('T')[0]);
    const dateIdx = dateStrings.indexOf(dateStr);
    const isInSpan = allSpans.some(span => dateIdx >= span.startIdx && dateIdx <= span.endIdx);
    if (isInSpan) return;

    // Reset if clicking the same date
    if (selectedCheckIn === dateStr && !selectedCheckOut && selectedIndividualRoomId === individualRoomId) {
      setSelectedCheckIn(null);
      setSelectedIndividualRoomId(null);
      setSelectedRoomTypeId(null);
      return;
    }

    // First click - set check-in
    if (!selectedCheckIn) {
      setSelectedCheckIn(dateStr);
      setSelectedIndividualRoomId(individualRoomId);
      setSelectedRoomTypeId(roomTypeId);
      setSelectedCheckOut(null);
      return;
    }

    // If clicking different room, reset selection
    if (selectedIndividualRoomId !== individualRoomId) {
      setSelectedCheckIn(dateStr);
      setSelectedIndividualRoomId(individualRoomId);
      setSelectedRoomTypeId(roomTypeId);
      setSelectedCheckOut(null);
      return;
    }

    // Second click - set check-out
    if (selectedCheckIn && !selectedCheckOut) {
      // Check-out must be after check-in
      if (new Date(dateStr) <= new Date(selectedCheckIn)) {
        // If clicked before check-in, reset
        setSelectedCheckIn(dateStr);
        setSelectedCheckOut(null);
        return;
      }
      setSelectedCheckOut(dateStr);
      return;
    }

    // Third click - reset and start new selection
    if (selectedCheckIn && selectedCheckOut) {
      setSelectedCheckIn(dateStr);
      setSelectedCheckOut(null);
    }
  };

  const clearDateSelection = () => {
    setSelectedCheckIn(null);
    setSelectedCheckOut(null);
    setSelectedIndividualRoomId(null);
    setSelectedRoomTypeId(null);
  };

  const openBookingModal = () => {
    if (selectedCheckIn && selectedCheckOut && selectedRoomTypeId) {
      setShowNewReservationModal(true);
    }
  };

  // Close alerts dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (alertsDropdownRef.current && !alertsDropdownRef.current.contains(event.target as Node)) {
        setShowAlertsDropdown(false);
      }
    };

    if (showAlertsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAlertsDropdown]);

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
      
      // Calculate date range based on view mode or filter dates
      const { start, days } = getDateRange();
      let startDate = start;
      let endDate = new Date(start);
      endDate.setDate(start.getDate() + days - 1);
      
      // If filter dates are set, use them for fetching
      if (filterCheckIn && filterCheckOut) {
        startDate = new Date(filterCheckIn);
        endDate = new Date(filterCheckOut);
      }
      
      // Fetch room types
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .eq('hotel_id', hotelId)
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

      // Fetch all reservations with more details (overlapping with date range)
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
          individual_room_id,
          room_id,
          reservation_status
        `)
        .eq('hotel_id', hotelId)
        .in('reservation_status', ['confirmed', 'checked_in', 'tentative'])
        .lte('check_in_date', endDate.toISOString().split('T')[0])
        .gte('check_out_date', startDate.toISOString().split('T')[0]);

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
      
      const { data: arrivals } = await supabase
        .from('reservations')
        .select(`
          id,
          confirmation_number,
          check_in_date,
          reservation_status,
          individual_room_id,
          guest_id,
          guest_profiles(first_name, last_name)
        `)
        .eq('hotel_id', hotelId)
        .eq('check_in_date', today)
        .in('reservation_status', ['confirmed', 'tentative']);
      
      if (arrivals && arrivals.length > 0) {
        const roomIds = arrivals.filter(r => r.individual_room_id).map(r => r.individual_room_id);
        let roomData: any[] = [];
        
        if (roomIds.length > 0) {
          const { data: rooms } = await supabase
            .from('individual_rooms')
            .select('id, room_number')
            .in('id', roomIds);
          
          roomData = rooms || [];
        }
        
        const roomMap = new Map(roomData.map(r => [r.id, r.room_number]));
        
        const alerts: ArrivalAlert[] = arrivals.map(r => {
          const guest = r.guest_profiles as any;
          return {
            reservation_id: r.id,
            confirmation_number: r.confirmation_number,
            guest_name: guest
              ? `${guest.first_name || ''} ${guest.last_name || ''}`.trim()
              : 'Unknown',
            check_in_date: r.check_in_date,
            reservation_status: r.reservation_status,
            assigned_room: r.individual_room_id ? roomMap.get(r.individual_room_id) : undefined
          };
        });
        
        setArrivalAlerts(alerts);
      } else {
        setArrivalAlerts([]);
      }

    } catch (err) {
      console.error('Error fetching arrivals:', err);
    }
  };

  // Calculate reservation spans for a room
  const getReservationSpans = (roomId: string, dates: Date[]): ReservationSpan[] => {
    const spans: ReservationSpan[] = [];
    const dateStrings = dates.map(d => d.toISOString().split('T')[0]);
    
    const reservations = allReservations.filter(res => 
      res.individual_room_id === roomId &&
      res.reservation_status !== 'cancelled'
    );

    reservations.forEach(reservation => {
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
      case 'clean': return 'bg-green-50';
      case 'occupied': return 'bg-red-50';
      case 'dirty': return 'bg-yellow-50';
      case 'maintenance': return 'bg-orange-50';
      case 'out_of_order': return 'bg-gray-50';
      default: return 'bg-gray-50';
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

  const handleBlockRoom = async (roomId: string | null, startDate: string, endDate: string, reason: string) => {
    try {
      const currentRoomTypeId = blockingRoomTypeId || (roomId ? Object.values(individualRooms).flat().find(r => r.id === roomId)?.room_id : null);
      
      if (!roomId && !currentRoomTypeId) {
        alert('Please select a room to block');
        return;
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      const dates: string[] = [];
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split('T')[0]);
      }

      if (roomId) {
        // Block individual room
        const blocks = dates.map(date => ({
          individual_room_id: roomId,
          date,
          status: 'blocked' as const,
          reservation_id: null
        }));

        const { error } = await supabase
          .from('individual_room_availability')
          .upsert(blocks, { onConflict: 'individual_room_id,date' });

        if (error) throw error;
      } else if (currentRoomTypeId) {
        // Block all rooms of this type
        const roomsToBlock = individualRooms[currentRoomTypeId] || [];
        
        for (const room of roomsToBlock) {
          const blocks = dates.map(date => ({
            individual_room_id: room.id,
            date,
            status: 'blocked' as const,
            reservation_id: null
          }));

          const { error } = await supabase
            .from('individual_room_availability')
            .upsert(blocks, { onConflict: 'individual_room_id,date' });

          if (error) throw error;
        }
      }

      await fetchData();
      router.refresh();
      setShowBlockModal(false);
      setBlockingRoomId(null);
      setBlockingRoomTypeId(null);
    } catch (err: any) {
      console.error('Error blocking room:', err);
      alert(`Failed to block room: ${err.message}`);
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

  // Get rooms array for NewReservationModal
  const roomsArray = roomTypes.map(rt => ({
    id: rt.id,
    name: rt.name,
    room_type: rt.room_type,
    base_price: 0, // Will be fetched by modal
    quantity: individualRooms[rt.id]?.length || 0,
    max_occupancy: 2, // Default
    is_active: true
  }));

  return (
    <>
      <div className={`fixed inset-0 z-50 ${isMaximized ? 'p-0' : 'flex items-center justify-center bg-black bg-opacity-50 p-4'}`}>
        <div 
          id="individual-room-availability-dashboard"
          className={`${isMaximized ? 'fixed inset-0 h-screen w-screen rounded-none overflow-y-auto' : 'mx-auto w-full max-w-[95vw] rounded-lg'} bg-white shadow-xl`}
          onDoubleClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
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
                
                {/* Notification Bell with Dropdown */}
                <div className="relative" ref={alertsDropdownRef}>
                  <button
                    onClick={() => {
                      setShowAlertsDropdown(!showAlertsDropdown);
                      fetchArrivalAlerts();
                    }}
                    className="relative rounded-lg bg-white bg-opacity-20 px-4 py-2 text-white hover:bg-opacity-30"
                  >
                    🔔
                    {arrivalAlerts.length > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                        {arrivalAlerts.length}
                      </span>
                    )}
                  </button>
                  
                  {showAlertsDropdown && (
                    <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border-2 border-red-500 bg-white shadow-xl z-50">
                      <div className="flex items-center justify-between border-b border-gray-200 bg-red-50 px-4 py-3">
                        <h3 className="font-bold text-red-900">⚠️ Today&apos;s Arrivals</h3>
                        <span className="rounded-full bg-red-500 px-2 py-1 text-xs font-bold text-white">
                          {arrivalAlerts.length}
                        </span>
                      </div>
                      <div className="max-h-64 space-y-2 overflow-auto p-4">
                        {arrivalAlerts.length === 0 ? (
                          <p className="text-center text-gray-500 py-4">No arrivals today</p>
                        ) : (
                          arrivalAlerts.map(alert => (
                            <button
                              key={alert.reservation_id}
                              onClick={() => {
                                setSelectedReservationId(alert.reservation_id);
                                setShowAlertsDropdown(false);
                              }}
                              className="w-full rounded-lg border border-red-200 bg-red-50 p-3 text-left hover:bg-red-100 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="font-semibold text-red-900">#{alert.confirmation_number}</div>
                                {!alert.assigned_room && (
                                  <span className="rounded-full bg-red-500 px-2 py-1 text-xs text-white">⚠️</span>
                                )}
                              </div>
                              <div className="text-sm text-red-800">{alert.guest_name}</div>
                              {alert.assigned_room && (
                                <div className="mt-1 text-xs text-red-700">
                                  Room: {alert.assigned_room} ✓
                                </div>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Maximize Toggle - Using div to avoid browser fullscreen detection */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Maximize button clicked, current state:', isMaximized);
                    setIsMaximized(prev => {
                      const newState = !prev;
                      console.log('Setting isMaximized to:', newState);
                      return newState;
                    });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setIsMaximized(prev => !prev);
                    }
                  }}
                  className="cursor-pointer rounded-lg bg-white bg-opacity-20 px-4 py-2 text-white hover:bg-opacity-30 focus:outline-none focus:ring-2 focus:ring-white"
                  aria-label={isMaximized ? 'Restore' : 'Maximize'}
                >
                  {isMaximized ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  )}
                </div>
                
                <button
                  onClick={onClose}
                  className="rounded-lg bg-white bg-opacity-20 px-4 py-2 text-white hover:bg-opacity-30"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Date Filters and Selection */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                {/* Date Filter Pickers */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-white">Filter:</label>
                  <input
                    type="date"
                    value={filterCheckIn}
                    onChange={(e) => {
                      setFilterCheckIn(e.target.value);
                      if (e.target.value && filterCheckOut && e.target.value > filterCheckOut) {
                        setFilterCheckOut('');
                      }
                    }}
                    className="rounded-lg border border-white/30 bg-white/20 px-3 py-1.5 text-sm text-white placeholder:text-white/70 backdrop-blur-sm"
                    placeholder="Check-in"
                  />
                  <span className="text-white/70">→</span>
                  <input
                    type="date"
                    value={filterCheckOut}
                    onChange={(e) => setFilterCheckOut(e.target.value)}
                    min={filterCheckIn || undefined}
                    className="rounded-lg border border-white/30 bg-white/20 px-3 py-1.5 text-sm text-white placeholder:text-white/70 backdrop-blur-sm"
                    placeholder="Check-out"
                  />
                  {(filterCheckIn || filterCheckOut) && (
                    <button
                      onClick={() => {
                        setFilterCheckIn('');
                        setFilterCheckOut('');
                      }}
                      className="text-sm text-white hover:text-white/80"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Selected Dates for Booking */}
                {selectedCheckIn && (
                  <div className="flex items-center gap-2 rounded-lg bg-white/20 backdrop-blur-sm px-3 py-1.5">
                    <span className="text-sm font-medium text-white">
                      Booking: {new Date(selectedCheckIn).toLocaleDateString()}
                      {selectedCheckOut && ` → ${new Date(selectedCheckOut).toLocaleDateString()}`}
                    </span>
                    {selectedCheckIn && selectedCheckOut && (
                      <button
                        onClick={openBookingModal}
                        className="rounded bg-white px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-white/90"
                      >
                        Book Now
                      </button>
                    )}
                    <button
                      onClick={clearDateSelection}
                      className="text-white hover:text-white/80"
                    >
                      ✕
                    </button>
                  </div>
                )}
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
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-gray-900">{roomType.name}</h3>
                          <p className="text-sm text-gray-600 capitalize">{roomType.room_type}</p>
                        </div>
                        <button
                          onClick={() => {
                            setBlockingRoomId(null);
                            setBlockingRoomTypeId(roomType.id);
                            setShowBlockModal(true);
                          }}
                          className="rounded-lg bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700"
                        >
                          🚫 Block Dates (All)
                        </button>
                      </div>
                    </div>

                    {/* Calendar Table */}
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-collapse">
                        <thead>
                          <tr>
                            <th className="sticky left-0 z-10 min-w-[180px] border-r-2 border-gray-300 bg-gray-100 px-4 py-3 text-left text-sm font-bold text-gray-900">
                              Room
                            </th>
                            {displayDates.map(date => (
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

                            const isRoomSelected = selectedIndividualRoomId === room.id;
                            const hasValidSelection = selectedCheckIn && selectedCheckOut && isRoomSelected;

                            return (
                              <tr key={room.id} className="relative">
                                <td className={`sticky left-0 z-10 border-r-2 border-gray-300 px-4 py-3 font-medium shadow-sm ${getStatusColor(room.current_status)}`}>
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="font-semibold text-gray-900">Room {room.room_number}</div>
                                      {room.floor_number && (
                                        <div className="text-xs text-gray-600 mt-0.5">Floor {room.floor_number}</div>
                                      )}
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
                                      title="Block this room"
                                    >
                                      🚫
                                    </button>
                                  </div>
                                </td>
                                {displayDates.map((date, displayIdx) => {
                                  const dateStr = date.toISOString().split('T')[0];
                                  const isToday = dateStr === new Date().toISOString().split('T')[0];
                                  
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
                                          className={`w-full rounded-lg ${getReservationStatusColor(reservation.reservation_status)} px-2 py-2 text-white shadow-sm transition-all hover:shadow-md`}
                                        >
                                          <div className="text-xs font-bold">#{reservation.confirmation_number}</div>
                                          <div className="text-[10px] mt-0.5 opacity-90">
                                            {reservation.adults + reservation.children + reservation.infants} guest{reservation.adults + reservation.children + reservation.infants !== 1 ? 's' : ''}
                                          </div>
                                          <div className="text-[9px] mt-0.5 opacity-75">
                                            {nights} night{nights !== 1 ? 's' : ''}
                                          </div>
                                        </button>
                                      </td>
                                    );
                                  } else if (occupiedDates.has(displayIdx)) {
                                    // This cell is part of a span but not the start - skip it (handled by colspan)
                                    return null;
                                  } else {
                                    // Empty cell - can be selected
                                    return (
                                      <td
                                        key={dateStr}
                                        onClick={() => handleDateCellClick(date, room.id, room.room_id)}
                                        className={`border-b border-l border-gray-200 px-1 py-3 text-center text-xs transition-colors cursor-pointer hover:bg-gray-100 ${
                                          isToday ? 'border-blue-400 bg-blue-50' : '' 
                                        } ${
                                          isSelected && isRoomSelected ? 'bg-blue-100' : ''
                                        } ${
                                          isCheckIn && isRoomSelected ? 'bg-blue-200 border-2 border-blue-500' : ''
                                        } ${
                                          isCheckOut && isRoomSelected ? 'bg-blue-200 border-2 border-blue-500' : ''
                                        }`}
                                      >
                                        {isCheckIn && isRoomSelected && (
                                          <div className="text-[8px] font-bold text-blue-700">CHECK-IN</div>
                                        )}
                                        {isCheckOut && isRoomSelected && (
                                          <div className="text-[8px] font-bold text-blue-700">CHECK-OUT</div>
                                        )}
                                        {!isSelected && <div className="text-gray-300">—</div>}
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
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Reservation Detail Modal - Rendered via Portal */}
      {selectedReservationId && typeof window !== 'undefined' && createPortal(
        <ReservationDetailModal
          reservationId={selectedReservationId}
          hotelId={hotelId}
          onClose={() => {
            setSelectedReservationId(null);
            fetchData();
          }}
          onUpdate={() => {
            fetchData();
            fetchArrivalAlerts();
          }}
        />,
        document.body
      )}

      {/* New Reservation Modal - Rendered via Portal */}
      {showNewReservationModal && selectedCheckIn && selectedCheckOut && selectedRoomTypeId && typeof window !== 'undefined' && createPortal(
        <NewReservationModal
          hotelId={hotelId}
          rooms={roomsArray}
          onClose={() => {
            setShowNewReservationModal(false);
            clearDateSelection();
          }}
          onSuccess={() => {
            setShowNewReservationModal(false);
            clearDateSelection();
            fetchData();
            fetchArrivalAlerts();
            router.refresh();
          }}
          prefillDates={{
            checkIn: selectedCheckIn,
            checkOut: selectedCheckOut,
            roomId: selectedRoomTypeId
          }}
        />,
        document.body
      )}

      {/* Block Dates Modal - Rendered via Portal */}
      {showBlockModal && typeof window !== 'undefined' && (() => {
        const foundRoom = blockingRoomId ? Object.values(individualRooms).flat().find(r => r.id === blockingRoomId) : null;
        const roomTypeIdValue = blockingRoomTypeId || (foundRoom?.room_id ?? null);
        const roomTypeNameValue = blockingRoomTypeId 
          ? (roomTypes.find(rt => rt.id === blockingRoomTypeId)?.name || 'All Rooms')
          : foundRoom?.room_id
            ? (roomTypes.find(rt => rt.id === foundRoom.room_id)?.name || 'Room')
            : 'All Rooms';
        
        return createPortal(
          <BlockDatesModal
            roomId={blockingRoomId}
            roomTypeId={roomTypeIdValue}
            roomTypeName={roomTypeNameValue}
            hotelId={hotelId}
            onClose={() => {
              setShowBlockModal(false);
              setBlockingRoomId(null);
              setBlockingRoomTypeId(null);
            }}
            onBlock={handleBlockRoom}
          />,
          document.body
        );
      })()}
    </>
  );
}

// Block Dates Modal Component
function BlockDatesModal({
  roomId,
  roomTypeId,
  roomTypeName,
  hotelId,
  onClose,
  onBlock
}: {
  roomId: string | null;
  roomTypeId: string | null;
  roomTypeName: string;
  hotelId: string;
  onClose: () => void;
  onBlock: (roomId: string | null, startDate: string, endDate: string, reason: string) => Promise<void>;
}) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [blocking, setBlocking] = useState(false);
  const [blockScope, setBlockScope] = useState<'room' | 'floor' | 'property'>('room');

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

    if (blockScope === 'property' || blockScope === 'floor') {
      alert('Blocking entire property or floors is not yet implemented. Please block individual rooms or room types for now.');
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-xl font-bold text-gray-900">Block Dates</h3>
        
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Scope
            </label>
            <select
              value={blockScope}
              onChange={(e) => setBlockScope(e.target.value as 'room' | 'floor' | 'property')}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900"
            >
              <option value="room">Individual Room{roomId ? ' (Current)' : ''}</option>
              <option value="floor">Entire Floor (Coming Soon)</option>
              <option value="property">Entire Property (Coming Soon)</option>
            </select>
            {!roomId && (
              <p className="mt-1 text-xs text-gray-500">
                Blocking all rooms of type: {roomTypeName}
              </p>
            )}
          </div>

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
            disabled={blocking || blockScope !== 'room'}
            className="rounded-lg bg-orange-600 px-4 py-2 font-medium text-white hover:bg-orange-700 disabled:bg-gray-400"
          >
            {blocking ? 'Blocking...' : 'Block Dates'}
          </button>
        </div>
      </div>
    </div>
  );
}
