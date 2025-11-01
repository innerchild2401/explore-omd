import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import OMDPendingApprovals from '@/components/admin/OMDPendingApprovals';

export default async function OMDApprovalsPage() {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/login');
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  // Only super admins can access this page
  if (profile?.role !== 'super_admin') {
    redirect('/admin');
  }

  // Fetch pending and active OMDs
  const { data: pendingOMDs } = await supabase
    .from('omds')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  const { data: activeOMDs } = await supabase
    .from('omds')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  // Fetch admin info for each pending OMD
  let pendingWithAdmins = [];
  if (pendingOMDs) {
    for (const omd of pendingOMDs) {
      const { data: adminProfile } = await supabase
        .from('user_profiles')
        .select('profile')
        .eq('omd_id', omd.id)
        .eq('role', 'omd_admin')
        .single();
      
      pendingWithAdmins.push({
        ...omd,
        user_profiles: adminProfile ? { profile: adminProfile.profile } : undefined
      });
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-gray-900">OMD Management</h1>
      <OMDPendingApprovals 
        pendingOMDs={pendingWithAdmins || []} 
        activeOMDs={activeOMDs || []} 
      />
    </div>
  );
}

