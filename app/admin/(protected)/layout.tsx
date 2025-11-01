import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  
  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/login');
  }

  // Check user role
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, omd_id')
    .eq('id', user.id)
    .single();

  // If no profile, redirect to onboarding
  if (!profile) {
    redirect('/admin/onboarding');
  }

  // Only allow admin roles
  if (!['super_admin', 'omd_admin'].includes(profile.role)) {
    redirect('/');
  }

  // Check if OMD admin's OMD is pending approval
  if (profile.role === 'omd_admin' && profile.omd_id) {
    const { data: omd } = await supabase
      .from('omds')
      .select('status')
      .eq('id', profile.omd_id)
      .single();
    
    if (omd?.status === 'pending') {
      // OMD is pending, allow access but show warning
    }
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <AdminSidebar userRole={profile.role} omdId={profile.omd_id} />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader user={user} profile={profile} />
        
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

