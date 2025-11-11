import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import OptimizedImage from '@/components/ui/OptimizedImage';
import AreaFilter from '@/components/hotels/AreaFilter';
import SortSelect from '@/components/hotels/SortSelect';
import OmdMemberBadge from '@/components/ui/OmdMemberBadge';
import { sortBusinessesByFeaturedOrder } from '@/lib/utils/business-sorting';
import BackButton from '@/components/ui/BackButton';
import ScrollRestoration from '@/components/ui/ScrollRestoration';

interface HotelsPageProps {
  params: { omdSlug: string };
  searchParams: { 
    checkIn?: string; 
    checkOut?: string;
    adults?: string;
    children?: string;
    area?: string;
    sort?: string;
  };
}

export default async function HotelsPage({ params, searchParams }: HotelsPageProps) {
  const supabase = await createClient();
  
  // Debug logging (server-side)
  console.log('HotelsPage - params:', params);
  console.log('HotelsPage - searchParams:', searchParams);

  // Get OMD
  const { data: omd } = await supabase
    .from('omds')
    .select('id, name, slug, status')
    .eq('slug', params.omdSlug)
    .single();

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

  // Get hotels in this OMD with area information
  let hotelsQuery = supabase
    .from('hotels')
    .select(`
      *,
      businesses!inner(
        id,
        name,
        description,
        slug,
        images,
        location,
        contact,
        rating,
        area_id,
        is_omd_member,
        featured_order,
        is_published,
        areas(
          id,
          name
        )
      ),
      rooms(
        base_price
      )
    `)
    .eq('businesses.omd_id', omd.id)
    .eq('businesses.is_published', true)
    .eq('businesses.status', 'active');

  const { data: hotels, error: hotelsError } = await hotelsQuery;
  
  // Debug logging
  console.log('HotelsPage - Initial hotels query result:', hotels?.length || 0);
  console.log('HotelsPage - Hotels data:', hotels);
  
  if (hotelsError) {
    console.error('Error fetching hotels:', hotelsError);
  }

  // Filter hotels by area if provided
  let filteredHotels = hotels || [];
  if (searchParams.area && filteredHotels.length > 0) {
    filteredHotels = filteredHotels.filter(hotel => 
      hotel.businesses?.area_id === searchParams.area
    );
  }

  // Filter hotels by availability if dates are provided
  let availabilityFilteredHotels = filteredHotels;
  if (searchParams.checkIn && searchParams.checkOut && hotels && hotels.length > 0) {
    console.log('Filtering hotels by availability:', { checkIn: searchParams.checkIn, checkOut: searchParams.checkOut });
    
    try {
      const availabilityPromises = availabilityFilteredHotels.map(async (hotel) => {
        if (!hotel?.id) {
          console.warn('Hotel missing ID:', hotel);
          return { hotel, isAvailable: false };
        }

        console.log('Checking availability for hotel:', hotel.id);
        
        // Validate and parse parameters
        const adults = Math.max(1, parseInt(searchParams.adults || '1') || 1);
        const children = Math.max(0, parseInt(searchParams.children || '0') || 0);
        
        const { data: isAvailable, error } = await supabase
          .rpc('check_hotel_availability_simple_bookings', {
            p_hotel_id: hotel.id,
            p_check_in: searchParams.checkIn,
            p_check_out: searchParams.checkOut,
            p_adults: adults,
            p_children: children
          });
        
        if (error) {
          console.error('Error checking availability for hotel', hotel.id, error);
          // Fallback: if function fails, assume hotel is available if it has rooms
          const { data: rooms } = await supabase
            .from('rooms')
            .select('id')
            .eq('hotel_id', hotel.id)
            .eq('is_active', true)
            .limit(1);
          return { hotel, isAvailable: rooms && rooms.length > 0 };
        }
        
        console.log('Hotel availability result:', hotel.id, isAvailable);
        return { hotel, isAvailable: Boolean(isAvailable) };
      });

      const availabilityResults = await Promise.all(availabilityPromises);
      console.log('All availability results:', availabilityResults);
      
      filteredHotels = availabilityResults
        .filter(result => result && result.isAvailable)
        .map(result => result.hotel);
        
      console.log('Filtered hotels:', filteredHotels.length);
    } catch (error) {
      console.error('Error in availability filtering:', error);
      // Fallback: show all hotels if filtering fails
      filteredHotels = availabilityFilteredHotels || [];
    }
  }

  const getHotelStartingPrice = (hotel: any) => {
    const roomPrices = (hotel.rooms || [])
      .map((room: any) => Number(room.base_price))
      .filter((price: number) => Number.isFinite(price));

    if (roomPrices.length > 0) {
      return Math.min(...roomPrices);
    }

    const businessPrice = Number((hotel.businesses as any)?.starting_price);
    if (Number.isFinite(businessPrice)) {
      return businessPrice;
    }

    return Number.POSITIVE_INFINITY;
  };

  const sortKey = searchParams.sort || 'featured';

  const sortedHotels = (() => {
    const list = [...filteredHotels];

    switch (sortKey) {
      case 'price':
        return list.sort((a, b) => getHotelStartingPrice(a) - getHotelStartingPrice(b));
      case 'rating':
        return list.sort((a, b) => (b.star_rating || 0) - (a.star_rating || 0));
      case 'name':
        return list.sort((a, b) => {
          const nameA = (a.businesses?.name || '').toString().toLowerCase();
          const nameB = (b.businesses?.name || '').toString().toLowerCase();
          return nameA.localeCompare(nameB);
        });
      default:
        return sortBusinessesByFeaturedOrder(list);
    }
  })();

  const hasSearchParams = searchParams.checkIn || searchParams.checkOut;
  
  // Format dates for display
  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Handle error state
  if (hotelsError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Hotels</h1>
          <p className="text-gray-600 mb-4">There was an error loading the hotels. Please try again.</p>
          <Link 
            href={`/${params.omdSlug}`}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  const scrollKey = `hotels:${params.omdSlug}:${searchParams.checkIn ?? ''}:${searchParams.checkOut ?? ''}:${searchParams.adults ?? ''}:${searchParams.children ?? ''}:${searchParams.area ?? ''}:${searchParams.sort ?? ''}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <ScrollRestoration storageKey={scrollKey} />
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-4">
              <BackButton href={`/${params.omdSlug}/explore`} label={`Back to ${omd.name}`} variant="inverted" />
              <h1 className="text-4xl font-bold">Hotels & Accommodations</h1>
              <p className="text-blue-100 text-lg mb-4">
                {hasSearchParams 
                  ? 'Available hotels for your selected dates' 
                  : `Discover amazing places to stay in ${omd.name}`
                }
              </p>
              
              {/* Compact Search Summary Pill */}
              {hasSearchParams && searchParams.checkIn && searchParams.checkOut && (
                <div className="inline-flex flex-wrap items-center gap-3 bg-white/15 backdrop-blur-sm rounded-full px-4 py-2.5 border border-white/20">
                  {/* Check-in Date */}
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <div className="flex flex-col">
                      <span className="text-xs text-blue-200 leading-tight">Check-in</span>
                      <span className="text-sm font-semibold text-white leading-tight">{formatDisplayDate(searchParams.checkIn)}</span>
                    </div>
                  </div>
                  
                  {/* Arrow separator */}
                  <div className="hidden sm:flex items-center">
                    <svg className="h-4 w-4 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  
                  {/* Check-out Date */}
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <div className="flex flex-col">
                      <span className="text-xs text-blue-200 leading-tight">Check-out</span>
                      <span className="text-sm font-semibold text-white leading-tight">{formatDisplayDate(searchParams.checkOut)}</span>
                    </div>
                  </div>
                  
                  {/* Guests */}
                  <div className="flex items-center gap-2 ml-2 sm:ml-0 pl-3 sm:pl-0 border-l border-white/20 sm:border-l-0">
                    <svg className="h-4 w-4 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <div className="flex flex-col">
                      <span className="text-xs text-blue-200 leading-tight">Guests</span>
                      <span className="text-sm font-semibold text-white leading-tight">
                        {parseInt(searchParams.adults || '1')}
                        {parseInt(searchParams.children || '0') > 0 && ` + ${parseInt(searchParams.children || '0')}`}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Results Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {sortedHotels.length} {sortedHotels.length === 1 ? 'Hotel' : 'Hotels'} Found
            </h2>
            {hasSearchParams && (
              <p className="text-gray-600 mt-1">
                Showing hotels available for your selected dates
              </p>
            )}
          </div>
          
          {/* Filters and Sort */}
          <div className="flex flex-wrap items-center gap-3">
            <AreaFilter areas={areas || []} />
            <SortSelect />
          </div>
        </div>

        {/* Hotels Grid */}
        {sortedHotels.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">
              {hasSearchParams ? 'No Hotels Available' : 'No Hotels Yet'}
            </h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              {hasSearchParams 
                ? 'No hotels have availability for your selected dates. Try different dates or check back later.'
                : 'We\'re currently adding amazing hotels to showcase. Check back soon!'
              }
            </p>
            {hasSearchParams && (
              <Link
                href={`/${params.omdSlug}/hotels`}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Different Dates
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {sortedHotels.map((hotel) => {
              const business = hotel.businesses;
              const mainImage = business.images?.[0];
              
              return (
                <div key={hotel.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                  {/* Hotel Image */}
                  <div className="relative h-64 overflow-hidden">
                    {mainImage ? (
                      <OptimizedImage
                        src={typeof mainImage === 'string' ? mainImage : (mainImage as any)?.url || '/placeholder-hotel.jpg'}
                        alt={business.name}
                        fill
                        className="object-cover hover:scale-105 transition-transform duration-300 pointer-events-none"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                        <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                      </div>
                    )}
                    
                    {/* Badges - Top Left */}
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                      {business.is_omd_member && (
                        <OmdMemberBadge size="sm" />
                      )}
                      {hotel.star_rating && (
                        <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center">
                          <div className="flex items-center">
                            {Array.from({ length: hotel.star_rating }).map((_, i) => (
                              <svg key={i} className="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                          <span className="ml-1 text-sm font-semibold text-gray-700">{hotel.star_rating}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Hotel Info */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
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
                      {business.rating > 0 && (
                        <div className="flex items-center bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-semibold ml-2 flex-shrink-0">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          {business.rating.toFixed(1)}
                        </div>
                      )}
                    </div>

                    {business.description && (
                      <p className="text-gray-600 text-sm line-clamp-2 mb-4">{business.description}</p>
                    )}

                    {business.location && (
                      <div className="flex items-center text-gray-500 text-sm mb-4">
                        <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="line-clamp-1">{typeof business.location === 'object' ? business.location.address : business.location}</span>
                      </div>
                    )}

                    {/* Action Button */}
                    <Link
                      href={`/${params.omdSlug}/hotels/${business.slug}${hasSearchParams ? `?checkIn=${searchParams.checkIn}&checkOut=${searchParams.checkOut}&adults=${searchParams.adults || '1'}&children=${searchParams.children || '0'}` : ''}`}
                      className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors text-center block touch-manipulation"
                      style={{ touchAction: 'manipulation' }}
                      prefetch={true}
                    >
                      View Details & Book
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: HotelsPageProps) {
  const { omdSlug } = params;
  const supabase = await createClient();

  const { data: omd } = await supabase
    .from('omds')
    .select('name, status')
    .eq('slug', omdSlug)
    .single();

  if (!omd || omd.status !== 'active') {
    return {
      title: 'Hotels Not Found',
    };
  }

  return {
    title: `Hotels in ${omd.name} - Book Your Stay`,
    description: `Discover and book amazing hotels in ${omd.name}. Find the perfect accommodation for your stay.`,
  };
}