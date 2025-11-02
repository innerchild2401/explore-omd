import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AreasManager from '@/components/admin/AreasManager';

export default async function AreasPage() {
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

  if (!profile.omd_id) {
    redirect('/admin?message=No OMD assigned');
  }

  // Get areas for this OMD
  const { data: areas } = await supabase
    .from('areas')
    .select('*')
    .eq('omd_id', profile.omd_id)
    .order('order_index', { ascending: true })
    .order('name', { ascending: true });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Areas Management</h1>
        <p className="mt-2 text-gray-600">
          Define areas within your destination. Businesses can select which area they operate in, and visitors can filter by area.
        </p>
      </div>

      <AreasManager areas={areas || []} omdId={profile.omd_id} />
    </div>
  );
}

