import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AnalyticsDashboard from '@/components/admin/AnalyticsDashboard';

export default async function AnalyticsPage() {
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

  return (
    <div className="text-gray-900">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="mt-2 text-gray-600">
          Track visitor behavior, conversions, and revenue across all businesses
        </p>
      </div>

      <AnalyticsDashboard omdId={profile.omd_id} />
    </div>
  );
}

