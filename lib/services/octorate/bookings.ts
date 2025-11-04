import { createClient } from '@/lib/supabase/server';
import { OctorateClient } from './client';
import { OctorateBookingRequest, OctorateBookingResponse } from './types';

export async function pushBooking(
  connectionId: string,
  hotelId: string,
  reservationId: string,
  accommodationId: string
): Promise<OctorateBookingResponse> {
  const client = new OctorateClient(connectionId, hotelId);
  const supabase = await createClient();

  // Get reservation details
  const { data: reservation } = await supabase
    .from('reservations')
    .select(`
      *,
      guest_profiles!guest_id(*),
      rooms!room_id(*)
    `)
    .eq('id', reservationId)
    .single();

  if (!reservation) {
    throw new Error('Reservation not found');
  }

  // Get room mapping
  const { data: mapping } = await supabase
    .from('octorate_room_mappings')
    .select('octorate_room_id')
    .eq('room_id', reservation.room_id)
    .eq('octorate_connection_id', connectionId)
    .single();

  if (!mapping) {
    throw new Error('Room mapping not found');
  }

  // Prepare booking request
  const bookingRequest: OctorateBookingRequest = {
    accommodationId: accommodationId,
    roomTypeId: mapping.octorate_room_id,
    checkInDate: reservation.check_in_date,
    checkOutDate: reservation.check_out_date,
    guests: {
      adults: reservation.adults,
      children: reservation.children || 0,
      infants: reservation.infants || 0,
    },
    guestInfo: {
      firstName: (reservation.guest_profiles as any)?.first_name || '',
      lastName: (reservation.guest_profiles as any)?.last_name || '',
      email: (reservation.guest_profiles as any)?.email || '',
      phone: (reservation.guest_profiles as any)?.phone || '',
    },
    specialRequests: reservation.special_requests || undefined,
  };

  // Push booking to Octorate
  const bookingResponse = await client.request<OctorateBookingResponse>(
    `/accommodations/${accommodationId}/bookings`,
    {
      method: 'POST',
      body: JSON.stringify(bookingRequest),
    }
  );

  // Update reservation with Octorate booking ID
  await supabase
    .from('reservations')
    .update({
      octorate_booking_id: bookingResponse.bookingId,
      pushed_to_octorate_at: new Date().toISOString(),
      octorate_push_status: 'pushed',
    })
    .eq('id', reservationId);

  return bookingResponse;
}

export async function checkBookingStatus(
  connectionId: string,
  hotelId: string,
  accommodationId: string,
  bookingId: string
): Promise<any> {
  const client = new OctorateClient(connectionId, hotelId);

  const status = await client.request<any>(
    `/accommodations/${accommodationId}/bookings/${bookingId}`
  );

  return status;
}

