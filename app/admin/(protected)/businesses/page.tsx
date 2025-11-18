import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BusinessApprovalList from '@/components/admin/BusinessApprovalList';
import FeaturedBusinessOrder from '@/components/admin/FeaturedBusinessOrder';
import { getActiveOmdId } from '@/lib/admin/getActiveOmdId';

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

  const activeOmdId = await getActiveOmdId(profile);

  if (!activeOmdId) {
    return (
      <div className="rounded-lg bg-yellow-50 p-6 text-yellow-800">
        Select a destination from the dropdown to review its businesses.
      </div>
    );
  }

  // Get pending businesses for this OMD
  const { data: pendingBusinesses, error: pendingError } = await supabase
    .from('businesses')
    .select(`
      *,
      user_profiles!businesses_owner_id_fkey (
        profile
      )
    `)
    .eq('omd_id', activeOmdId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (pendingError) {
    // Error logged but not blocking - page will show empty list
  }

  // Get approved businesses for this OMD
  const { data: approvedBusinesses } = await supabase
    .from('businesses')
    .select(`
      *,
      user_profiles!businesses_owner_id_fkey (
        profile
      )
    `)
    .eq('omd_id', activeOmdId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  const publishedBusinesses = (approvedBusinesses || []).filter((business: any) => business.is_published);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Business Management</h1>
        <p className="mt-2 text-gray-600">
          Review and approve business registrations
        </p>
      </div>

      {/* Featured Business Ordering */}
      {publishedBusinesses.length > 0 && (
        <FeaturedBusinessOrder
          businesses={publishedBusinesses.map((b: any) => ({
            id: b.id,
            name: b.name,
            type: b.type,
            is_omd_member: b.is_omd_member,
            featured_order: b.featured_order,
          }))}
          omdId={activeOmdId}
        />
      )}

      <BusinessApprovalList
        pendingBusinesses={pendingBusinesses || []}
        approvedBusinesses={approvedBusinesses || []}
        omdId={activeOmdId}
      />
    </div>
  );
}

