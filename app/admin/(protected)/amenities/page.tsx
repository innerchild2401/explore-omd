import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AmenitiesManager from '@/components/admin/AmenitiesManager';

export default async function AmenitiesPage() {
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

  if (!profile || !['super_admin', 'omd_admin'].includes(profile.role)) {
    redirect('/admin/login?message=You do not have admin access');
  }

  // Get amenities for this OMD
  const { data: amenities } = await supabase
    .from('omd_amenities')
    .select('*')
    .eq('omd_id', profile.omd_id)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Amenities Management</h1>
        <p className="mt-2 text-gray-600">
          Manage the list of amenities available for hotels in your destination
        </p>
      </div>

      <AmenitiesManager amenities={amenities || []} omdId={profile.omd_id} />
    </div>
  );
}

