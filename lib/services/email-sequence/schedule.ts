import { createClient } from '@/lib/supabase/server';

/**
 * Schedule email sequence for a reservation
 * Checks conditions and schedules emails accordingly
 */
export async function scheduleEmailSequence(reservationId: string): Promise<void> {
  const supabase = await createClient();

  // Get reservation details
  const { data: reservation, error: reservationError } = await supabase
    .from('reservations')
    .select(`
      id,
      check_in_date,
      created_at,
      reservation_status,
      guest_profiles!guest_id(email)
    `)
    .eq('id', reservationId)
    .single();

  if (reservationError || !reservation) {
    console.error('Error fetching reservation for email scheduling:', reservationError);
    return;
  }

  // Only schedule for confirmed reservations
  if (reservation.reservation_status !== 'confirmed' && reservation.reservation_status !== 'tentative') {
    return;
  }

  const bookingDate = new Date(reservation.created_at);
  const checkInDate = new Date(reservation.check_in_date);
  
  // Calculate days between booking date and check-in date
  const daysUntilCheckIn = Math.ceil((checkInDate.getTime() - bookingDate.getTime()) / (1000 * 60 * 60 * 24));

  // Schedule post-booking follow-up email (3 days after booking)
  // Only if check-in is more than 3 days away from booking date
  // This ensures the email arrives 3 days after booking, but check-in is still in the future
  if (daysUntilCheckIn > 3) {
    const scheduledDate = new Date(bookingDate);
    scheduledDate.setDate(scheduledDate.getDate() + 3);
    scheduledDate.setHours(10, 0, 0, 0); // Send at 10 AM

    // Check if email already scheduled
    const { data: existingLog } = await supabase
      .from('email_sequence_logs')
      .select('id')
      .eq('reservation_id', reservationId)
      .eq('email_type', 'post_booking_followup')
      .maybeSingle();

    if (!existingLog) {
      await supabase
        .from('email_sequence_logs')
        .insert({
          reservation_id: reservationId,
          email_type: 'post_booking_followup',
          scheduled_at: scheduledDate.toISOString(),
          status: 'scheduled',
        });
    }
  }
}

