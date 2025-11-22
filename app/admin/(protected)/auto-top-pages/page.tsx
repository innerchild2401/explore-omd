import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AutoTopPagesManager from '@/components/admin/AutoTopPagesManager';

export default async function AutoTopPagesPage() {
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
      <AutoTopPagesManager />
    </div>
  );
}

