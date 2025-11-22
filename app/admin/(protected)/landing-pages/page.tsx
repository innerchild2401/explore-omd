import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import LandingPagesManager from '@/components/admin/LandingPagesManager';
import { getActiveOmdId } from '@/lib/admin/getActiveOmdId';

export default async function LandingPagesAdminPage() {
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

  const activeOmdId = await getActiveOmdId(profile);

  if (!activeOmdId) {
    return (
      <div>
        <h1 className="mb-6 text-3xl font-bold">Landing Pages</h1>
        <div className="rounded-lg bg-yellow-50 p-6">
          <p className="text-yellow-800">
            {profile.role === 'super_admin'
              ? 'Select a destination from the dropdown to manage its landing pages.'
              : 'Please select an OMD to manage landing pages.'}
          </p>
        </div>
      </div>
    );
  }

  // Get OMD slug
  const { data: omd } = await supabase
    .from('omds')
    .select('slug')
    .eq('id', activeOmdId)
    .single();

  return (
    <div>
      <LandingPagesManager
        omdId={activeOmdId}
        omdSlug={omd?.slug || null}
        userRole={profile.role}
      />
    </div>
  );
}

