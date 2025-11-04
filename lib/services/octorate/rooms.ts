import { createClient } from '@/lib/supabase/server';
import { OctorateClient } from './client';
import { OctorateRoomType } from './types';

export async function pullRoomTypes(connectionId: string, hotelId: string, accommodationId: string): Promise<void> {
  const client = new OctorateClient(connectionId, hotelId);
  const supabase = await createClient();

  // Pull room types from Octorate
  const roomTypes = await client.request<OctorateRoomType[]>(`/accommodations/${accommodationId}/room-types`);

  // Get hotel's business_id
  const { data: hotel } = await supabase
    .from('hotels')
    .select('business_id')
    .eq('id', hotelId)
    .single();

  if (!hotel) {
    throw new Error('Hotel not found');
  }

  // Create/update local rooms
  for (const octorateRoom of roomTypes) {
    // Check if room already exists
    const { data: existingRoom } = await supabase
      .from('rooms')
      .select('id')
      .eq('hotel_id', hotelId)
      .eq('octorate_room_id', octorateRoom.id)
      .single();

    const roomData = {
      hotel_id: hotelId,
      name: octorateRoom.name,
      room_type: 'standard', // Default, can be mapped from Octorate data
      max_occupancy: octorateRoom.maxOccupancy,
      base_price: octorateRoom.basePrice || 0,
      quantity: 1, // Default, should be synced separately
      is_active: true,
      octorate_room_id: octorateRoom.id,
      is_synced_from_octorate: true,
      last_synced_from_octorate_at: new Date().toISOString(),
    };

    if (existingRoom) {
      // Update existing room
      await supabase
        .from('rooms')
        .update(roomData)
        .eq('id', existingRoom.id);
    } else {
      // Create new room
      const { data: newRoom } = await supabase
        .from('rooms')
        .insert(roomData)
        .select('id')
        .single();

      if (newRoom) {
        // Create mapping
        await supabase
          .from('octorate_room_mappings')
          .insert({
            octorate_connection_id: connectionId,
            room_id: newRoom.id,
            octorate_room_id: octorateRoom.id,
            sync_status: 'synced',
            last_synced_at: new Date().toISOString(),
          });
      }
    }
  }
}

