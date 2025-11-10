'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

const sanitizeNumericInput = (value: string) => value.replace(/[^0-9]/g, '');

interface IndividualRoom {
  id: string;
  room_id: string;
  room_number: string;
  floor_number?: number;
  wing?: string;
  building?: string;
  view_type?: string;
  bed_configuration_specific?: any;
  current_status: 'clean' | 'dirty' | 'occupied' | 'out_of_order' | 'blocked';
  size_sqm?: number;
  balcony?: boolean;
  accessible?: boolean;
  notes?: string;
}

interface IndividualRoomsManagerProps {
  roomTypeId: string;
  roomTypeName: string;
  roomTypeQuantity?: number;
  hotelId: string;
  onClose: () => void;
}

export default function IndividualRoomsManager({ roomTypeId, roomTypeName, roomTypeQuantity, hotelId, onClose }: IndividualRoomsManagerProps) {
  const supabase = useMemo(() => createClient(), []);
  const [individualRooms, setIndividualRooms] = useState<IndividualRoom[]>([]);
  const [existingRoomNumbers, setExistingRoomNumbers] = useState<Array<{room_number: string; room_type_name: string; floor_number: number | null}>>([]);
  const [nextAvailableNumber, setNextAvailableNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [maxQuantity, setMaxQuantity] = useState(roomTypeQuantity || 0);
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [existingLoading, setExistingLoading] = useState(false);

  // Generator settings
  const [prefix, setPrefix] = useState('');
  const [startNumberInput, setStartNumberInput] = useState('1');
  const [countInput, setCountInput] = useState('1');
  const [floorNumberInput, setFloorNumberInput] = useState('');

  // Calculate available slots
  const availableSlots = maxQuantity - individualRooms.length;
  const canCreateMore = availableSlots > 0;

  const parsedStartNumber = (() => {
    const sanitized = sanitizeNumericInput(startNumberInput);
    if (!sanitized) return null;
    return Math.max(1, parseInt(sanitized, 10));
  })();

  const parsedCount = (() => {
    const sanitized = sanitizeNumericInput(countInput);
    if (!sanitized) return null;
    return Math.max(1, parseInt(sanitized, 10));
  })();

  const parsedCountValue = parsedCount ?? 0;

  const parsedFloorNumber = (() => {
    const sanitized = floorNumberInput === '' ? '' : sanitizeNumericInput(floorNumberInput);
    if (!sanitized) return null;
    return parseInt(sanitized, 10);
  })();

  // Group rooms by floor for better visualization
  const roomsByFloor = individualRooms.reduce((acc, room) => {
    const floor = room.floor_number || 0;
    if (!acc[floor]) acc[floor] = [];
    acc[floor].push(room);
    return acc;
  }, {} as Record<number, IndividualRoom[]>);

  // Fetch individual rooms for this room type and existing room numbers
  const fetchIndividualRooms = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('individual_rooms')
        .select('*')
        .eq('room_id', roomTypeId)
        .order('room_number');

      if (error) throw error;
      setIndividualRooms(data || []);
    } catch (error) {
      console.error('Failed to fetch individual rooms:', error);
    } finally {
      setLoading(false);
    }
  }, [roomTypeId, supabase]);

  const fetchExistingRoomNumbers = useCallback(async () => {
    if (!showGenerator) return;
    setExistingLoading(true);
    try {
      const { data: existingRooms, error: existingError } = await supabase
        .rpc('get_existing_room_numbers', {
          p_hotel_id: hotelId,
          p_floor_number: parsedFloorNumber,
          p_prefix: prefix
        });

      if (!existingError && existingRooms) {
        setExistingRoomNumbers(existingRooms || []);
      }
    } catch (error) {
      console.error('Failed to fetch existing room numbers:', error);
    } finally {
      setExistingLoading(false);
    }
  }, [hotelId, parsedFloorNumber, prefix, showGenerator, supabase]);

  // Fetch next available room number when prefix/floor changes
  const fetchNextAvailableNumber = useCallback(async () => {
    if (!showGenerator) return;
    if (!prefix && parsedFloorNumber === null) {
      setNextAvailableNumber(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .rpc('get_next_available_room_number', {
          p_hotel_id: hotelId,
          p_prefix: prefix || '',
          p_floor_number: parsedFloorNumber,
          p_start_from: parsedStartNumber || 1
        });

      if (!error && data !== null) {
        setNextAvailableNumber(data);
        if ((!startNumberInput || parsedStartNumber === 1) && data > 1) {
          setStartNumberInput(String(data));
        }
      }
    } catch (error) {
      console.error('Failed to fetch next available number:', error);
    }
  }, [hotelId, parsedFloorNumber, parsedStartNumber, prefix, showGenerator, startNumberInput, supabase]);

  // Auto-generate rooms
  const handleGenerateRooms = async () => {
    const count = parsedCount || 0;
    const startNumber = parsedStartNumber || 1;

    if (count > availableSlots) {
      alert(`Cannot create ${count} rooms. Only ${availableSlots} slot(s) available out of ${maxQuantity} total.`);
      return;
    }

    if (count < 1) {
      alert('Must create at least 1 room.');
      return;
    }

    // Check for potential overlaps before generating
    const existingNumbers = existingRoomNumbers.map(r => r.room_number);
    const overlappingRooms: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const roomNumber = prefix + ((startNumber + i) < 10 ? `0${startNumber + i}` : (startNumber + i).toString());
      if (existingNumbers.includes(roomNumber)) {
        overlappingRooms.push(roomNumber);
      }
    }
    
    if (overlappingRooms.length > 0) {
      let errorMsg = `❌ Room number overlap detected!\n\n`;
      errorMsg += `The following room numbers already exist in this hotel:\n${overlappingRooms.join(', ')}\n\n`;
      
      if (nextAvailableNumber !== null) {
        errorMsg += `💡 Suggested starting number: ${nextAvailableNumber}\n`;
      }
      
      alert(errorMsg);
      return;
    }

    setGenerating(true);
    try {
      // Build parameters object, only including floor_number if it's not null
      const params: any = {
        p_room_type_id: roomTypeId,
        p_prefix: prefix || '',
        p_start_number: startNumber,
        p_count: count
      };

      if (parsedFloorNumber !== null) {
        params.p_floor_number = parsedFloorNumber;
      }
      
      const { data, error } = await supabase.rpc('generate_individual_rooms', params);

      if (error) throw error;
      
      // Refresh the list
      await fetchIndividualRooms();
      await fetchExistingRoomNumbers();
      await fetchNextAvailableNumber();
      setShowGenerator(false);
      // Reset form
      setPrefix('');
      setStartNumberInput('1');
      setCountInput('1');
      setFloorNumberInput('');
      setNextAvailableNumber(null);
    } catch (error: any) {
      console.error('Failed to generate rooms:', error);
      const errorMsg = error?.message || 'Unknown error';
      alert(`Failed to generate rooms: ${errorMsg}`);
    } finally {
      setGenerating(false);
    }
  };

  // Delete individual room(s)
  const handleDeleteRooms = async (roomIds: string[]) => {
    if (!confirm(`Are you sure you want to delete ${roomIds.length} room(s)?`)) {
      return;
    }

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('individual_rooms')
        .delete()
        .in('id', roomIds);

      if (error) throw error;
      
      // Refresh the list
      await fetchIndividualRooms();
      setSelectedRooms([]);
    } catch (error) {
      console.error('Failed to delete rooms:', error);
      alert('Failed to delete rooms');
    } finally {
      setDeleting(false);
    }
  };

  // Toggle room selection
  const toggleRoomSelection = (roomId: string) => {
    if (selectedRooms.includes(roomId)) {
      setSelectedRooms(selectedRooms.filter(id => id !== roomId));
    } else {
      setSelectedRooms([...selectedRooms, roomId]);
    }
  };

  // Initialize on mount
  useEffect(() => {
    void fetchIndividualRooms();
  }, [fetchIndividualRooms]);

  // Fetch next available number when prefix or floor changes
  useEffect(() => {
    if (showGenerator) {
      void fetchExistingRoomNumbers();
      void fetchNextAvailableNumber();
    }
  }, [fetchExistingRoomNumbers, fetchNextAvailableNumber, showGenerator]);

  const getStatusColor = (status: string) => {
    const colors = {
      clean: 'bg-green-100 text-green-800',
      dirty: 'bg-yellow-100 text-yellow-800',
      occupied: 'bg-blue-100 text-blue-800',
      out_of_order: 'bg-red-100 text-red-800',
      blocked: 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      clean: '✅',
      dirty: '🧹',
      occupied: '🛌',
      out_of_order: '🔧',
      blocked: '🚫'
    };
    return icons[status as keyof typeof icons] || '📋';
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="rounded-lg bg-white p-8">
          <p className="text-gray-600">Loading individual rooms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 p-4">
      <div className="mx-auto max-w-6xl rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Individual Rooms: {roomTypeName}
              </h2>
              <p className="text-sm text-gray-600">
                Manage physical room instances (e.g., Room 201, 202, 203)
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-gray-600 hover:bg-gray-100"
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Actions */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-gray-600">
                {individualRooms.length === 0 
                  ? 'No individual rooms created yet. Generate rooms from room type or add manually.'
                  : `${individualRooms.length} room(s) created`}
              </p>
              {maxQuantity > 0 && (
                <p className="mt-1 text-sm font-medium text-gray-700">
                  {individualRooms.length} / {maxQuantity} rooms • {availableSlots} slots remaining
                </p>
              )}
            </div>
            <div className="flex gap-3">
              {selectedRooms.length > 0 && (
                <button
                  onClick={() => handleDeleteRooms(selectedRooms)}
                  disabled={deleting}
                  className="rounded-lg bg-red-600 px-6 py-2 font-semibold text-white hover:bg-red-700 disabled:bg-gray-400"
                >
                  🗑️ Delete Selected ({selectedRooms.length})
                </button>
              )}
              <button
                onClick={() => setShowGenerator(!showGenerator)}
                className={`px-6 py-2 font-semibold ${
                  showGenerator 
                    ? 'border border-gray-300 text-gray-700 hover:bg-gray-50' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                } rounded-lg`}
              >
                {showGenerator ? '✕ Cancel' : canCreateMore ? '➕ Generate Rooms' : '⚠️ All Rooms Created'}
              </button>
            </div>
          </div>

          {/* Generator Form */}
          {showGenerator && (
            <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-6">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                Generate Rooms Automatically
              </h3>
              
              {/* Existing Room Numbers Info */}
              {existingLoading ? (
                <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
                  Loading existing room numbers...
                </div>
              ) : existingRoomNumbers.length > 0 ? (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="mb-2 text-sm font-semibold text-amber-900">
                    📋 Existing Room Numbers in This Hotel:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {existingRoomNumbers.slice(0, 20).map((room, idx) => (
                      <span 
                        key={idx}
                        className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 text-xs font-medium text-gray-700"
                        title={`${room.room_type_name}${room.floor_number ? ` (Floor ${room.floor_number})` : ''}`}
                      >
                        {room.room_number}
                      </span>
                    ))}
                    {existingRoomNumbers.length > 20 && (
                      <span className="inline-flex items-center rounded bg-white px-2 py-1 text-xs font-medium text-gray-500">
                        +{existingRoomNumbers.length - 20} more...
                      </span>
                    )}
                  </div>
                  {nextAvailableNumber !== null && (
                    <p className="mt-2 text-sm text-amber-800">
                      💡 <strong>Suggested starting number:</strong> {nextAvailableNumber} (rooms will be {prefix}{nextAvailableNumber < 10 ? '0' : ''}{nextAvailableNumber}, {prefix}{(nextAvailableNumber + 1) < 10 ? '0' : ''}{nextAvailableNumber + 1}, ...)
                    </p>
                  )}
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Room Number Prefix
                  </label>
                  <input
                    type="text"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    placeholder="e.g., '2' for 201, 202..."
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder:text-gray-400"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Leave empty for numbers like 01, 02, 03...
                  </p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Start Number
                  </label>
                  <input
                    inputMode="numeric"
                    value={startNumberInput}
                    onChange={(e) => setStartNumberInput(sanitizeNumericInput(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900"
                  />
                  {nextAvailableNumber !== null && nextAvailableNumber !== parsedStartNumber && (
                    <p className="mt-1 text-xs text-amber-600">
                      ⚠️ Suggested: {nextAvailableNumber} to avoid conflicts
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Number of Rooms
                    {maxQuantity > 0 && (
                      <span className="ml-2 text-xs font-normal text-gray-500">
                        (Max: {availableSlots})
                      </span>
                    )}
                  </label>
                  <input
                    inputMode="numeric"
                    value={countInput}
                    onChange={(e) => setCountInput(sanitizeNumericInput(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900"
                  />
                  {maxQuantity > 0 && parsedCount !== null && parsedCount > availableSlots && (
                    <p className="mt-1 text-xs text-red-600">
                      ⚠️ Cannot exceed {availableSlots} available slot(s)
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Floor Number (optional)
                  </label>
                  <input
                    inputMode="numeric"
                    value={floorNumberInput}
                    onChange={(e) => setFloorNumberInput(sanitizeNumericInput(e.target.value))}
                    placeholder="Auto-assign if empty"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleGenerateRooms}
                  disabled={generating || !canCreateMore || parsedCountValue > availableSlots}
                  className="rounded-lg bg-green-600 px-6 py-2 font-semibold text-white hover:bg-green-700 disabled:bg-gray-400"
                >
                  {generating ? 'Generating...' : canCreateMore ? 'Generate Rooms' : 'All Rooms Created'}
                </button>
                <button
                  onClick={() => setShowGenerator(false)}
                  className="rounded-lg border border-gray-300 px-6 py-2 font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Rooms List - Grouped by Floor */}
          {individualRooms.length > 0 ? (
            <div className="space-y-4">
              {Object.keys(roomsByFloor).sort((a, b) => parseInt(b) - parseInt(a)).map((floor) => {
                const floorRooms = roomsByFloor[parseInt(floor)];
                return (
                  <div key={floor} className="rounded-lg border border-gray-200 bg-white">
                    <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">Floor {floor}</h3>
                        <span className="text-sm text-gray-600">{floorRooms.length} rooms</span>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-12">
                              <input
                                type="checkbox"
                                checked={floorRooms.every(r => selectedRooms.includes(r.id))}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedRooms([...selectedRooms, ...floorRooms.map(r => r.id)]);
                                  } else {
                                    setSelectedRooms(selectedRooms.filter(id => !floorRooms.map(r => r.id).includes(id)));
                                  }
                                }}
                                className="rounded border-gray-300"
                              />
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Room Number</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Size</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Attributes</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {floorRooms.map((room) => (
                            <tr key={room.id} className={`hover:bg-gray-50 ${selectedRooms.includes(room.id) ? 'bg-blue-50' : ''}`}>
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={selectedRooms.includes(room.id)}
                                  onChange={() => toggleRoomSelection(room.id)}
                                  className="rounded border-gray-300"
                                />
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{room.room_number}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(room.current_status)}`}>
                                  {getStatusIcon(room.current_status)} {room.current_status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">{room.size_sqm ? `${room.size_sqm} sqm` : '-'}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                <div className="flex gap-2">
                                  {room.balcony && <span className="rounded bg-green-100 px-2 py-1 text-xs">Balcony</span>}
                                  {room.accessible && <span className="rounded bg-blue-100 px-2 py-1 text-xs">Accessible</span>}
                                  {room.view_type && <span className="rounded bg-purple-100 px-2 py-1 text-xs capitalize">{room.view_type}</span>}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <button
                                  onClick={() => handleDeleteRooms([room.id])}
                                  disabled={deleting}
                                  className="text-red-600 hover:text-red-700 disabled:text-gray-400"
                                >
                                  🗑️ Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg bg-gray-50 p-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h4" />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900">No individual rooms yet</h3>
              <p className="mb-6 text-gray-600">
                Generate individual rooms automatically from the room type, or add them manually.
              </p>
              <button
                onClick={() => setShowGenerator(true)}
                className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
              >
                🔄 Auto-Generate Rooms
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

