import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function AdminDashboard() {
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

  // Get OMD info if user is omd_admin
  let omd = null;
  if (profile?.omd_id) {
    const { data } = await supabase
      .from('omds')
      .select('*')
      .eq('id', profile.omd_id)
      .single();
    omd = data;
  }

  // Get statistics
  const stats = {
    totalBusinesses: 0,
    pendingBusinesses: 0,
    totalReservations: 0,
    totalReviews: 0,
  };

  if (profile?.omd_id) {
    // Count businesses
    const { count: businessCount } = await supabase
      .from('businesses')
      .select('*', { count: 'exact', head: true })
      .eq('omd_id', profile.omd_id);
    stats.totalBusinesses = businessCount || 0;

    // Count pending businesses
    const { count: pendingCount } = await supabase
      .from('businesses')
      .select('*', { count: 'exact', head: true })
      .eq('omd_id', profile.omd_id)
      .eq('status', 'pending');
    stats.pendingBusinesses = pendingCount || 0;
  }

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-gray-900">Dashboard</h1>

      {/* Welcome Message */}
      <div className="mb-8 rounded-lg bg-white p-6 shadow border border-gray-200">
        <h2 className="mb-2 text-2xl font-semibold text-gray-900">
          Welcome back, {user.email}!
        </h2>
        <p className="text-gray-600">
          {profile?.role === 'super_admin'
            ? 'You have access to all OMDs'
            : `Managing: ${omd?.name || 'OMD'}`}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow border border-gray-200">
          <div className="mb-2 text-sm font-medium text-gray-600">
            Total Businesses
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.totalBusinesses}</div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow border border-gray-200">
          <div className="mb-2 text-sm font-medium text-gray-600">
            Pending Approval
          </div>
          <div className="text-3xl font-bold text-orange-600">
            {stats.pendingBusinesses}
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow border border-gray-200">
          <div className="mb-2 text-sm font-medium text-gray-600">
            Total Reservations
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.totalReservations}</div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow border border-gray-200">
          <div className="mb-2 text-sm font-medium text-gray-600">
            Total Reviews
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.totalReviews}</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h3 className="mb-4 text-xl font-semibold text-gray-900">Quick Actions</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <a
            href="/admin/sections"
            className="rounded-lg bg-blue-600 p-6 text-white shadow transition-colors hover:bg-blue-700"
          >
            <h4 className="mb-2 text-lg font-semibold">Manage Sections</h4>
            <p className="text-sm text-blue-100">
              Edit homepage content and sections
            </p>
          </a>

          <a
            href="/admin/businesses"
            className="rounded-lg bg-green-600 p-6 text-white shadow transition-colors hover:bg-green-700"
          >
            <h4 className="mb-2 text-lg font-semibold">Manage Businesses</h4>
            <p className="text-sm text-green-100">
              Approve and manage business listings
            </p>
          </a>

          <a
            href="/admin/translations"
            className="rounded-lg bg-purple-600 p-6 text-white shadow transition-colors hover:bg-purple-700"
          >
            <h4 className="mb-2 text-lg font-semibold">Translations</h4>
            <p className="text-sm text-purple-100">
              Manage multi-language content
            </p>
          </a>
        </div>
      </div>
    </div>
  );
}

