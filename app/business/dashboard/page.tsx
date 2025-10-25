import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function BusinessDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/login');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, omd_id, metadata')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'business_owner') {
    redirect('/admin/login?message=Business owner access required');
  }

  // Check approval status
  if (profile.metadata?.status === 'pending') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
            <svg className="h-8 w-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Pending Approval</h2>
          <p className="mb-6 text-gray-600">
            Your business registration is currently being reviewed by the destination administrator.
            You&apos;ll receive an email once your business is approved.
          </p>
          <Link
            href="/admin/login"
            className="inline-block rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  if (profile.metadata?.status === 'rejected') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Application Rejected</h2>
          <p className="mb-6 text-gray-600">
            Unfortunately, your business registration was not approved. Please contact the destination administrator for more information.
          </p>
        </div>
      </div>
    );
  }

  // Get business
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .single();

  if (!business) {
    redirect('/admin/login?message=No business found');
  }

  // Get business type-specific data
  let businessDetails = null;
  let dashboardPath = '/business/dashboard';

  if (business.type === 'hotel') {
    const { data: hotel } = await supabase
      .from('hotels')
      .select('*')
      .eq('business_id', business.id)
      .single();
    businessDetails = hotel;
    dashboardPath = '/business/hotel';
  } else if (business.type === 'restaurant') {
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('*')
      .eq('business_id', business.id)
      .single();
    businessDetails = restaurant;
    dashboardPath = '/business/restaurant';
  } else if (business.type === 'experience') {
    const { data: experience } = await supabase
      .from('experiences')
      .select('*')
      .eq('business_id', business.id)
      .single();
    businessDetails = experience;
    dashboardPath = '/business/experience';
  }

  // Redirect to specific dashboard
  if (businessDetails) {
    redirect(dashboardPath);
  }

  // If no business details exist yet, create them
  if (business.type === 'hotel') {
    await supabase.from('hotels').insert({ business_id: business.id });
  } else if (business.type === 'restaurant') {
    await supabase.from('restaurants').insert({ business_id: business.id });
  } else if (business.type === 'experience') {
    await supabase.from('experiences').insert({ business_id: business.id });
  }

  redirect(dashboardPath);
}

