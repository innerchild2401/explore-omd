import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import OptimizedImage from '@/components/ui/OptimizedImage';

interface HotelsPageProps {
  params: { omdSlug: string };
  searchParams: { 
    checkIn?: string; 
    checkOut?: string;
    adults?: string;
    children?: string;
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
    .select('*')
    .eq('slug', params.omdSlug)
    .single();

  if (!omd) {
    notFound();
  }

  // Get hotels in this OMD
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
        address,
        phone,
        email,
        website,
        rating
      )
    `)
    .eq('businesses.omd_id', omd.id);

  const { data: hotels } = await hotelsQuery;

  // Filter hotels by availability if dates are provided
  let filteredHotels = hotels || [];
  if (searchParams.checkIn && searchParams.checkOut && hotels) {
    console.log('Filtering hotels by availability:', { checkIn: searchParams.checkIn, checkOut: searchParams.checkOut });
    
    const availabilityPromises = hotels.map(async (hotel) => {
      console.log('Checking availability for hotel:', hotel.id);
      const { data: isAvailable, error } = await supabase
        .rpc('check_hotel_availability_simple_bookings', {
          p_hotel_id: hotel.id,
          p_check_in: searchParams.checkIn,
          p_check_out: searchParams.checkOut,
          p_adults: parseInt(searchParams.adults || '1'),
          p_children: parseInt(searchParams.children || '0')
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
      return { hotel, isAvailable };
    });

    const availabilityResults = await Promise.all(availabilityPromises);
    console.log('All availability results:', availabilityResults);
    
    filteredHotels = availabilityResults
      .filter(result => result.isAvailable)
      .map(result => result.hotel);
      
    console.log('Filtered hotels:', filteredHotels.length);
  }

  const hasSearchParams = searchParams.checkIn || searchParams.checkOut;
  const searchDates = hasSearchParams ? `${searchParams.checkIn || ''} to ${searchParams.checkOut || ''}` : '';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="flex items-center justify-between">
            <div>
              <Link 
                href={`/${params.omdSlug}`} 
                className="inline-flex items-center text-blue-200 hover:text-white transition-colors mb-4"
              >
                <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to {omd.name}
              </Link>
              <h1 className="text-4xl font-bold mb-2">Hotels & Accommodations</h1>
              <p className="text-blue-100 text-lg">
                {hasSearchParams 
                  ? `Available hotels for ${searchDates}` 
                  : `Discover amazing places to stay in ${omd.name}`
                }
              </p>
            </div>
            
            {/* Search Summary */}
            {hasSearchParams && (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-sm text-blue-100 mb-2">Your Search</div>
                <div className="text-white font-semibold">
                  {searchParams.checkIn && searchParams.checkOut && (
                    <>
                      {new Date(searchParams.checkIn).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })} - {new Date(searchParams.checkOut).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </>
                  )}
                </div>
                <div className="text-blue-200 text-sm">
                  {parseInt(searchParams.adults || '1')} {parseInt(searchParams.adults || '1') === 1 ? 'Guest' : 'Guests'}
                  {parseInt(searchParams.children || '0') > 0 && (
                    <>, {parseInt(searchParams.children || '0')} {parseInt(searchParams.children || '0') === 1 ? 'Child' : 'Children'}</>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Results Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {filteredHotels.length} {filteredHotels.length === 1 ? 'Hotel' : 'Hotels'} Found
            </h2>
            {hasSearchParams && (
              <p className="text-gray-600 mt-1">
                Showing hotels available for your selected dates
              </p>
            )}
          </div>
          
          {/* Sort Options */}
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Sort by:</span>
            <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
              <option value="price">Price (Low to High)</option>
              <option value="rating">Rating (High to Low)</option>
              <option value="name">Name (A to Z)</option>
            </select>
          </div>
        </div>

        {/* Hotels Grid */}
        {filteredHotels.length === 0 ? (
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
            {filteredHotels.map((hotel) => {
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
                        className="object-cover hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                        <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                      </div>
                    )}
                    
                    {/* Star Rating Badge */}
                    {hotel.star_rating && (
                      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center">
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

                  {/* Hotel Info */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-xl font-bold text-gray-900 line-clamp-1">{business.name}</h3>
                      {business.rating > 0 && (
                        <div className="flex items-center bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-semibold">
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

                    {business.address && (
                      <div className="flex items-center text-gray-500 text-sm mb-4">
                        <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="line-clamp-1">{business.address}</span>
                      </div>
                    )}

                    {/* Action Button */}
                    <Link
                      href={`/${params.omdSlug}/hotels/${business.slug}${hasSearchParams ? `?checkIn=${searchParams.checkIn}&checkOut=${searchParams.checkOut}&adults=${searchParams.adults || '1'}&children=${searchParams.children || '0'}` : ''}`}
                      className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors text-center block"
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
    .select('name')
    .eq('slug', omdSlug)
    .single();

  if (!omd) {
    return {
      title: 'Hotels Not Found',
    };
  }

  return {
    title: `Hotels in ${omd.name} - Book Your Stay`,
    description: `Discover and book amazing hotels in ${omd.name}. Find the perfect accommodation for your stay.`,
  };
}