import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import RatingsList from '@/components/admin/RatingsList';

export default async function RatingsPage() {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/login');
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, omd_id')
    .eq('id', user.id)
    .single();

  // Only admins can access this page
  if (!profile || (profile.role !== 'super_admin' && profile.role !== 'omd_admin')) {
    redirect('/admin');
  }

  // Fetch reservation staff ratings
  const { data: allReservationRatings } = await supabase
    .from('reservation_staff_ratings')
    .select(`
      *,
      reservations(
        confirmation_number,
        hotels(
          businesses(
            name,
            omd_id
          )
        )
      )
    `)
    .order('created_at', { ascending: false });

  // Filter by OMD if not super admin (client-side filtering for nested data)
  const reservationRatings = profile.role === 'super_admin'
    ? allReservationRatings
    : allReservationRatings?.filter((rating: any) => {
        const omdId = rating.reservations?.hotels?.businesses?.omd_id;
        return omdId === profile.omd_id;
      }) || [];

  // Fetch destination ratings
  let destinationRatingsQuery = supabase
    .from('destination_ratings')
    .select('*, omds!left(name, slug)')
    .order('created_at', { ascending: false });

  // If not super admin, filter by OMD
  if (profile.role !== 'super_admin' && profile.omd_id) {
    destinationRatingsQuery = destinationRatingsQuery.eq('omd_id', profile.omd_id);
  }

  const { data: destinationRatings } = await destinationRatingsQuery;

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-gray-900">Evaluări și Feedback</h1>
      <RatingsList 
        reservationRatings={reservationRatings || []} 
        destinationRatings={destinationRatings || []} 
      />
    </div>
  );
}

