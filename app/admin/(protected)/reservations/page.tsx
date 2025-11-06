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
  // Filter by OMD if not super admin
  let query = supabase
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
        business_id
      ),
      businesses!left(
        id,
        name,
        slug,
        omd_id
      ),
      booking_channels!left(
        name,
        display_name,
        channel_type
      )
    `)
    .order('created_at', { ascending: false })
    .limit(1000);

  // If not super admin, filter by OMD
  if (profile.role !== 'super_admin' && profile.omd_id) {
    query = query.eq('businesses.omd_id', profile.omd_id);
  }

  const { data: reservations, error: reservationsError } = await query;

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

