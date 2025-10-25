import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import HotelDashboard from '@/components/business/HotelDashboard';

export default async function HotelPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/login');
  }

  // Get business
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .eq('type', 'hotel')
    .single();

  if (!business) {
    redirect('/business/dashboard');
  }

  // Get hotel details
  const { data: hotel } = await supabase
    .from('hotels')
    .select('*')
    .eq('business_id', business.id)
    .single();

  if (!hotel) {
    // Create hotel record if it doesn't exist
    const { data: newHotel } = await supabase
      .from('hotels')
      .insert({ business_id: business.id })
      .select()
      .single();

    if (newHotel) {
      return <HotelDashboard business={business} hotel={newHotel} />;
    }
  }

  // Get rooms
  const { data: rooms } = await supabase
    .from('rooms')
    .select('*')
    .eq('hotel_id', hotel!.id)
    .order('created_at', { ascending: true });

  // Get OMD amenities
  const { data: amenities } = await supabase
    .from('omd_amenities')
    .select('*')
    .eq('omd_id', business.omd_id)
    .order('category', { ascending: true });

  return (
    <HotelDashboard
      business={business}
      hotel={hotel!}
      rooms={rooms || []}
      amenities={amenities || []}
    />
  );
}

