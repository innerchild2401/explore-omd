import { createClient } from '@/lib/supabase/server';
import { OctorateClient } from './client';
import { OctorateRate } from './types';

export async function pullRates(
  connectionId: string,
  hotelId: string,
  accommodationId: string,
  startDate: string,
  endDate: string
): Promise<void> {
  const client = new OctorateClient(connectionId, hotelId);
  const supabase = await createClient();

  // Pull rates from Octorate
  const rates = await client.request<OctorateRate[]>(
    `/accommodations/${accommodationId}/rates?start_date=${startDate}&end_date=${endDate}`
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

  // Update local pricing
  for (const rate of rates) {
    const roomId = mappingMap.get(rate.roomTypeId);
    if (!roomId) continue;

    // Check if pricing record exists
    const { data: existing } = await supabase
      .from('room_pricing')
      .select('id')
      .eq('room_id', roomId)
      .eq('date', rate.date)
      .single();

    const pricingData = {
      room_id: roomId,
      date: rate.date,
      price: rate.price,
      currency: rate.currency || 'RON',
      is_synced_from_octorate: true,
      last_synced_from_octorate_at: new Date().toISOString(),
    };

    if (existing) {
      await supabase
        .from('room_pricing')
        .update(pricingData)
        .eq('id', existing.id);
    } else {
      await supabase
        .from('room_pricing')
        .insert(pricingData);
    }
  }

  // Update last sync time
  await supabase
    .from('octorate_hotel_connections')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('id', connectionId);
}

