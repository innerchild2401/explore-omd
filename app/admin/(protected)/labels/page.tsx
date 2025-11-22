import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import LabelsManager from '@/components/admin/LabelsManager';

export default async function LabelsPage() {
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

  if (!profile || !['omd_admin', 'super_admin'].includes(profile.role)) {
    redirect('/admin');
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Labels Management</h1>
        <p className="mt-2 text-gray-600">
          Manage label categories and labels for your destination. Labels help businesses get visibility and appear in special sections and auto-generated pages.
        </p>
      </div>
      <LabelsManager omdId={profile.omd_id} userRole={profile.role} />
    </div>
  );
}

