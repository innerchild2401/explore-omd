import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import OptimizedImage from '@/components/ui/OptimizedImage';
import AreaFilter from '@/components/hotels/AreaFilter';
import OmdMemberBadge from '@/components/ui/OmdMemberBadge';
import { sortBusinessesByFeaturedOrder } from '@/lib/utils/business-sorting';

interface RestaurantsPageProps {
  params: { omdSlug: string };
  searchParams: { date?: string; time?: string; area?: string };
}

export default async function RestaurantsPage({ params, searchParams }: RestaurantsPageProps) {
  const supabase = await createClient();
  
  // Await params for Next.js 15 compatibility
  const { omdSlug } = await params;

  // Get OMD
  const { data: omd } = await supabase
    .from('omds')
    .select('id, name, status')
    .eq('slug', omdSlug)
    .maybeSingle();

  if (!omd || omd.status !== 'active') {
    notFound();
  }

  // Get areas for this OMD
  const { data: areas } = await supabase
    .from('areas')
    .select('*')
    .eq('omd_id', omd.id)
    .order('order_index', { ascending: true })
    .order('name', { ascending: true });

  // Get restaurants in this OMD with area information
  let restaurantsQuery = supabase
    .from('restaurants')
    .select(`
      *,
      businesses!inner(
        id,
        name,
        description,
        slug,
        images,
        contact,
        location,
        area_id,
        rating,
        is_omd_member,
        featured_order,
        is_published,
        areas(
          id,
          name
        )
      )
    `)
    .eq('businesses.omd_id', omd.id)
    .eq('businesses.is_published', true)
    .eq('businesses.status', 'active');

  // Filter by area if provided
  if (searchParams.area) {
    restaurantsQuery = restaurantsQuery.eq('businesses.area_id', searchParams.area);
  }

  const { data: restaurants } = await restaurantsQuery;
  
  // Sort restaurants using featured ordering: featured first (1,2,3), then remaining members (random), then non-members (random)
  const sortedRestaurants = restaurants ? sortBusinessesByFeaturedOrder(restaurants) : null;

  return (
    <div className="min-h-screen bg-gray-50 w-full overflow-x-hidden" style={{ maxWidth: '100vw', boxSizing: 'border-box' as const }}>
      {/* Header */}
      <header className="bg-white shadow-sm w-full">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 w-full min-w-0">
          <Link href={`/${omdSlug}`} className="text-blue-600 hover:text-blue-700 break-words inline-block">
            ← Back to {omd.name}
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-gray-900 break-words">Restaurants & Dining</h1>
          {(searchParams.date || searchParams.time) && (
            <p className="mt-2 text-gray-600">
              {searchParams.date && `Date: ${searchParams.date}`}
              {searchParams.date && searchParams.time && ' • '}
              {searchParams.time && `Time: ${searchParams.time}`}
            </p>
          )}
        </div>
      </header>

      {/* Restaurants List */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 w-full min-w-0" style={{ maxWidth: '100%', boxSizing: 'border-box' }}>
        {/* Filters */}
        {sortedRestaurants && sortedRestaurants.length > 0 && areas && areas.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <AreaFilter areas={areas} />
          </div>
        )}

        {!sortedRestaurants || sortedRestaurants.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <svg
                className="w-12 h-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">No Restaurants Yet</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">Check back soon for dining options!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3 w-full min-w-0 max-w-full">
            {sortedRestaurants.map((restaurant) => {
              const business = restaurant.businesses;
              const mainImage = business.images?.[0];
              
              return (
                <div key={restaurant.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 w-full" style={{ minWidth: 0, maxWidth: '100%' }}>
                  {/* Restaurant Image */}
                  <div className="relative w-full aspect-[4/3] overflow-hidden bg-gray-100" style={{ width: '100%', minWidth: 0, maxWidth: '100%' }}>
                    {mainImage ? (
                      <OptimizedImage
                        src={typeof mainImage === 'string' ? mainImage : (mainImage as any)?.url || '/placeholder-restaurant.jpg'}
                        alt={business.name}
                        fill
                        className="object-cover hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        quality={65}
                        priority={false}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                        <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                    )}
                    
                    {/* Badges - Top Left */}
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                      {business.is_omd_member && (
                        <OmdMemberBadge size="sm" />
                      )}
                      {restaurant.price_range && (
                        <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1">
                          <span className="text-sm font-semibold text-gray-700">{restaurant.price_range}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Restaurant Info */}
                  <div className="p-4 sm:p-6 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-3 min-w-0">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-gray-900 line-clamp-1">{business.name}</h3>
                        {/* Area Badge - Subtle */}
                        {business.areas && (
                          <div className="mt-1.5 inline-flex items-center text-xs text-gray-500">
                            <svg className="h-3 w-3 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="font-medium">{business.areas.name}</span>
                          </div>
                        )}
                      </div>
                      {restaurant.cuisine_type && (
                        <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 flex-shrink-0">
                          {restaurant.cuisine_type}
                        </span>
                      )}
                    </div>

                    {business.description && (
                      <p className="text-gray-600 text-sm line-clamp-2 mb-4">{business.description}</p>
                    )}

                    {business.location?.address && (
                      <div className="flex items-center text-gray-500 text-sm mb-4">
                        <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="line-clamp-1">{business.location.address}</span>
                      </div>
                    )}

                    {/* Action Button */}
                    <Link
                      href={`/${omdSlug}/restaurants/${business.slug}`}
                      className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors text-center block"
                    >
                      View Details
                    </Link>

                    {business.contact?.phone && restaurant.accepts_reservations && (
                      <a
                        href={`tel:${business.contact.phone}`}
                        className="mt-3 w-full inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                      >
                        📞 Call for Reservations
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}