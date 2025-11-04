import { createClient } from '@/lib/supabase/server';
import { OctorateClient } from './client';
import { OctorateAvailability } from './types';

export async function pullAvailability(
  connectionId: string,
  hotelId: string,
  accommodationId: string,
  startDate: string,
  endDate: string
): Promise<void> {
  const client = new OctorateClient(connectionId, hotelId);
  const supabase = await createClient();

  // Pull availability from Octorate
  const availability = await client.request<OctorateAvailability[]>(
    `/accommodations/${accommodationId}/availability?start_date=${startDate}&end_date=${endDate}`
  );

  // Get room mappings
  const { data: mappings } = await supabase
    .from('octorate_room_mappings')
    .select('room_id, octorate_room_id')
    .eq('octorate_connection_id', connectionId);

  if (!mappings) {
    throw new Error('No room mappings found');
  }

  const mappingMap = new Map(mappings.map(m => [m.octorate_room_id, m.room_id]));

  // Update local availability
  for (const avail of availability) {
    const roomId = mappingMap.get(avail.roomTypeId);
    if (!roomId) continue;

    // Check if availability record exists
    const { data: existing } = await supabase
      .from('room_availability')
      .select('id')
      .eq('room_id', roomId)
      .eq('date', avail.date)
      .single();

    const availabilityData = {
      room_id: roomId,
      date: avail.date,
      available_quantity: avail.quantity || (avail.available ? 1 : 0),
      availability_status: avail.available ? 'available' : 'blocked',
      is_synced_from_octorate: true,
      last_synced_from_octorate_at: new Date().toISOString(),
    };

    if (existing) {
      await supabase
        .from('room_availability')
        .update(availabilityData)
        .eq('id', existing.id);
    } else {
      await supabase
        .from('room_availability')
        .insert(availabilityData);
    }
  }

  // Update last sync time
  await supabase
    .from('octorate_hotel_connections')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('id', connectionId);
}

