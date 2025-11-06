import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AdminReservationsList from '@/components/admin/AdminReservationsList';

export default async function AdminReservationsPage() {
  const supabase = await createClient();

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/admin/login');
  }

  // Get user profile to check role
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, omd_id')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'super_admin' && profile.role !== 'omd_admin')) {
    redirect('/admin');
  }

  // Get all reservations with related data
  // We'll filter by OMD client-side to ensure cancelled reservations are included
  // Note: reservations -> hotels -> businesses (no direct relationship)
  const { data: allReservations, error: reservationsError } = await supabase
    .from('reservations')
    .select(`
      *,
      guest_profiles!left(
        first_name,
        last_name,
        email,
        phone
      ),
      rooms!left(
        id,
        name,
        room_type
      ),
      hotels!left(
        id,
        business_id,
        businesses!left(
          id,
          name,
          slug,
          omd_id
        )
      ),
      booking_channels!left(
        name,
        display_name,
        channel_type
      )
    `)
    .order('created_at', { ascending: false })
    .limit(1000);

  // Filter by OMD if not super admin (client-side filtering to ensure all statuses are included)
  const reservations = profile.role === 'super_admin'
    ? allReservations
    : allReservations?.filter((reservation: any) => {
        const omdId = reservation.hotels?.businesses?.omd_id;
        return omdId === profile.omd_id;
      }) || [];

  if (reservationsError) {
    console.error('Error fetching reservations:', reservationsError);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminReservationsList 
        reservations={reservations || []} 
        userRole={profile.role}
      />
    </div>
  );
}

