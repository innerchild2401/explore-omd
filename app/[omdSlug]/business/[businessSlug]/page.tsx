import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import HotelDashboard from '@/components/business/HotelDashboard';

interface PageProps {
  params: {
    omdSlug: string;
    businessSlug: string;
  };
}

export default async function BusinessDashboardPage({ params }: PageProps) {
  const { omdSlug, businessSlug } = params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${omdSlug}/business/login`);
  }

  // Get OMD
  const { data: omd } = await supabase
    .from('omds')
    .select('id, name, slug')
    .eq('slug', omdSlug)
    .single();

  if (!omd) {
    notFound();
  }

  // Get business
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', businessSlug)
    .eq('omd_id', omd.id)
    .single();

  if (!business) {
    notFound();
  }

  // Check if user owns this business
  if (business.owner_id !== user.id) {
    redirect(`/${omdSlug}`);
  }

  // Check approval status
  if (business.status === 'pending') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="max-w-md rounded-lg bg-white p-8 text-center shadow-lg border border-gray-200">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
            <svg className="h-8 w-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Pending Approval</h2>
          <p className="mb-6 text-gray-600">
            Your business registration is currently being reviewed by the {omd.name} administrator.
            You&apos;ll receive an email once your business is approved.
          </p>
          <Link
            href={`/${omdSlug}`}
            className="inline-block rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  if (business.status === 'inactive') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="max-w-md rounded-lg bg-white p-8 text-center shadow-lg border border-gray-200">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Business Inactive</h2>
          <p className="mb-6 text-gray-600">
            Your business is currently inactive. Please contact the {omd.name} administrator for more information.
          </p>
          <Link
            href={`/${omdSlug}`}
            className="inline-block rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  // Business is active - show type-specific dashboard
  if (business.type === 'hotel') {
    // Get hotel details (or create if not exists)
    let { data: hotel } = await supabase
      .from('hotels')
      .select('*')
      .eq('business_id', business.id)
      .maybeSingle();

    if (!hotel) {
      // Create hotel entry
      const { data: newHotel } = await supabase
        .from('hotels')
        .insert({ business_id: business.id })
        .select()
        .single();
      hotel = newHotel;
    }

    // Get rooms
    const { data: rooms } = await supabase
      .from('rooms')
      .select('*')
      .eq('hotel_id', hotel!.id)
      .order('created_at', { ascending: true });

    // Get OMD amenities
    const { data: amenities } = await supabase
      .from('omd_amenities')
      .select('*')
      .eq('omd_id', business.omd_id)
      .order('category', { ascending: true });

    return (
      <div className="min-h-screen bg-gray-50">
        <HotelDashboard 
          business={business} 
          hotel={hotel} 
          omd={omd}
          rooms={rooms || []}
          amenities={amenities || []}
        />
      </div>
    );
  }

  // For restaurant and experience - show coming soon for now
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{business.name}</h1>
            <p className="text-gray-600">{omd.name} • {business.type}</p>
          </div>
          <Link
            href={`/${omdSlug}`}
            className="rounded-lg bg-gray-200 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-300"
          >
            View Public Page
          </Link>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">Dashboard Coming Soon</h2>
          <p className="text-gray-600">
            The {business.type} dashboard is currently under development. Check back soon!
          </p>
        </div>
      </div>
    </div>
  );
}

