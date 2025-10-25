import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BusinessApprovalList from '@/components/admin/BusinessApprovalList';

export default async function BusinessesAdminPage() {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/login');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, omd_id')
    .eq('id', user.id)
    .single();

  if (!profile || !['super_admin', 'omd_admin'].includes(profile.role)) {
    redirect('/admin/login?message=You do not have admin access');
  }

  // Get pending businesses for this OMD
  const { data: pendingBusinesses } = await supabase
    .from('businesses')
    .select(`
      *,
      user_profiles!businesses_owner_id_fkey (
        email,
        metadata
      )
    `)
    .eq('omd_id', profile.omd_id)
    .eq('is_active', false)
    .order('created_at', { ascending: false });

  // Get approved businesses for this OMD
  const { data: approvedBusinesses } = await supabase
    .from('businesses')
    .select(`
      *,
      user_profiles!businesses_owner_id_fkey (
        email,
        metadata
      )
    `)
    .eq('omd_id', profile.omd_id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Business Management</h1>
        <p className="mt-2 text-gray-600">
          Review and approve business registrations
        </p>
      </div>

      <BusinessApprovalList
        pendingBusinesses={pendingBusinesses || []}
        approvedBusinesses={approvedBusinesses || []}
        omdId={profile.omd_id}
      />
    </div>
  );
}

