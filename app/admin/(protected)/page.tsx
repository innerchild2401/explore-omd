import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardSelector from '@/components/admin/DashboardSelector';

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

  // Get all OMDs for super admin
  let allOMDs: Array<{ id: string; name: string; slug: string }> = [];
  if (profile?.role === 'super_admin') {
    const { data: omds } = await supabase
      .from('omds')
      .select('id, name, slug')
      .eq('status', 'active')
      .order('name');
    allOMDs = omds || [];
  }

  // Get statistics
  const stats = {
    totalBusinesses: 0,
    pendingBusinesses: 0,
    pendingOMDs: 0,
    newInquiries: 0,
  };

  if (profile?.omd_id) {
    // Count businesses for OMD admin
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

  // Get super admin specific stats
  if (profile?.role === 'super_admin') {
    const { count: pendingOMDCount } = await supabase
      .from('omds')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    stats.pendingOMDs = pendingOMDCount || 0;

    const { count: inquiryCount } = await supabase
      .from('contact_inquiries')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'new');
    stats.newInquiries = inquiryCount || 0;
  }

  const isSuperAdmin = profile?.role === 'super_admin';

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-gray-900">Dashboard</h1>

      {/* Pending OMD Warning */}
      {!isSuperAdmin && omd?.status === 'pending' && (
        <div className="mb-6 rounded-lg border border-yellow-300 bg-yellow-50 p-4">
          <div className="flex items-center">
            <svg className="mr-3 h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="font-semibold text-yellow-900">OMD Pending Approval</h3>
              <p className="text-sm text-yellow-800">
                Your destination &quot;{omd?.name}&quot; is pending super admin approval. You will be notified once it&apos;s approved.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Selector for Super Admin */}
      {isSuperAdmin && (
        <DashboardSelector omds={allOMDs} currentOMDId={profile.omd_id} />
      )}

      {/* Welcome Message */}
      <div className="mb-8 rounded-lg bg-white p-6 shadow border border-gray-200">
        <h2 className="mb-2 text-2xl font-semibold text-gray-900">
          Welcome back, {user.email}!
        </h2>
        <p className="text-gray-600">
          {isSuperAdmin
            ? 'You have access to all OMDs'
            : `Managing: ${omd?.name || 'OMD'}`}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {isSuperAdmin ? (
          <>
            <div className="rounded-lg bg-white p-6 shadow border border-gray-200">
              <div className="mb-2 text-sm font-medium text-gray-600">
                Pending OMDs
              </div>
              <div className="text-3xl font-bold text-orange-600">
                {stats.pendingOMDs}
              </div>
              <a href="/admin/omd-approvals" className="mt-2 text-sm text-blue-600 hover:text-blue-800">
                View →
              </a>
            </div>

            <div className="rounded-lg bg-white p-6 shadow border border-gray-200">
              <div className="mb-2 text-sm font-medium text-gray-600">
                New Inquiries
              </div>
              <div className="text-3xl font-bold text-blue-600">
                {stats.newInquiries}
              </div>
              <a href="/admin/contact-inquiries" className="mt-2 text-sm text-blue-600 hover:text-blue-800">
                View →
              </a>
            </div>

            <div className="rounded-lg bg-white p-6 shadow border border-gray-200">
              <div className="mb-2 text-sm font-medium text-gray-600">
                Active OMDs
              </div>
              <div className="text-3xl font-bold text-gray-900">{allOMDs.length}</div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow border border-gray-200">
              <div className="mb-2 text-sm font-medium text-gray-600">
                Total Businesses
              </div>
              <div className="text-3xl font-bold text-gray-900">{stats.totalBusinesses}</div>
            </div>
          </>
        ) : (
          <>
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
              <div className="text-3xl font-bold text-gray-900">0</div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow border border-gray-200">
              <div className="mb-2 text-sm font-medium text-gray-600">
                Total Reviews
              </div>
              <div className="text-3xl font-bold text-gray-900">0</div>
            </div>
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h3 className="mb-4 text-xl font-semibold text-gray-900">Quick Actions</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {isSuperAdmin ? (
            <>
              <a
                href="/admin/omd-approvals"
                className="rounded-lg bg-orange-600 p-6 text-white shadow transition-colors hover:bg-orange-700"
              >
                <h4 className="mb-2 text-lg font-semibold">OMD Approvals</h4>
                <p className="text-sm text-orange-100">
                  Review and approve pending OMD applications
                </p>
              </a>

              <a
                href="/admin/contact-inquiries"
                className="rounded-lg bg-blue-600 p-6 text-white shadow transition-colors hover:bg-blue-700"
              >
                <h4 className="mb-2 text-lg font-semibold">Contact Inquiries</h4>
                <p className="text-sm text-blue-100">
                  View and manage contact form submissions
                </p>
              </a>

              <a
                href="/admin/booking-issues"
                className="rounded-lg bg-red-600 p-6 text-white shadow transition-colors hover:bg-red-700"
              >
                <h4 className="mb-2 text-lg font-semibold">Booking Issues</h4>
                <p className="text-sm text-red-100">
                  View and manage booking issue reports
                </p>
              </a>

              <a
                href="/admin/ratings"
                className="rounded-lg bg-yellow-600 p-6 text-white shadow transition-colors hover:bg-yellow-700"
              >
                <h4 className="mb-2 text-lg font-semibold">Ratings & Feedback</h4>
                <p className="text-sm text-yellow-100">
                  View reservation and destination ratings
                </p>
              </a>

              <a
                href="/admin/users"
                className="rounded-lg bg-purple-600 p-6 text-white shadow transition-colors hover:bg-purple-700"
              >
                <h4 className="mb-2 text-lg font-semibold">User Management</h4>
                <p className="text-sm text-purple-100">
                  Manage all users and permissions
                </p>
              </a>
            </>
          ) : (
            <>
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
                href="/admin/contact-inquiries"
                className="rounded-lg bg-blue-600 p-6 text-white shadow transition-colors hover:bg-blue-700"
              >
                <h4 className="mb-2 text-lg font-semibold">Contact Inquiries</h4>
                <p className="text-sm text-blue-100">
                  View contact form submissions
                </p>
              </a>

              <a
                href="/admin/booking-issues"
                className="rounded-lg bg-red-600 p-6 text-white shadow transition-colors hover:bg-red-700"
              >
                <h4 className="mb-2 text-lg font-semibold">Booking Issues</h4>
                <p className="text-sm text-red-100">
                  View booking issue reports
                </p>
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

