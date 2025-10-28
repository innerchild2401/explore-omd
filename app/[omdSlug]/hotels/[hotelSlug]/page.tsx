import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ImageGallery from '@/components/hotels/ImageGallery';
import RoomCard from '@/components/hotels/RoomCard';
import AmenitiesList from '@/components/hotels/AmenitiesList';
import LandmarksList from '@/components/hotels/LandmarksList';
import LazyLoadWrapper from '@/components/ui/LazyLoadWrapper';
import RoomCardSkeleton from '@/components/hotels/RoomCardSkeleton';

export const revalidate = 60;

interface HotelPageProps {
  params: {
    omdSlug: string;
    hotelSlug: string;
  };
  searchParams: { 
    checkIn?: string; 
    checkOut?: string;
    adults?: string;
    children?: string;
  };
}

export default async function HotelDetailPage({ params, searchParams }: HotelPageProps) {
  const { omdSlug, hotelSlug } = params;
  const supabase = await createClient();

  // Get OMD
  const { data: omd } = await supabase
    .from('omds')
    .select('id, name, slug')
    .eq('slug', omdSlug)
    .single();

  if (!omd) {
    notFound();
  }

  // Get business (hotel)
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', hotelSlug)
    .eq('omd_id', omd.id)
    .eq('type', 'hotel')
    .eq('status', 'active')
    .single();

  if (!business) {
    notFound();
  }

  // Get hotel details
  const { data: hotel } = await supabase
    .from('hotels')
    .select('*')
    .eq('business_id', business.id)
    .single();

  // Get active rooms with availability information
  let rooms = [];
  if (hotel?.id) {
    if (searchParams.checkIn && searchParams.checkOut) {
      // Get rooms with availability for specific dates
      const { data: roomAvailability } = await supabase
        .rpc('get_hotel_room_availability', {
          p_hotel_id: hotel.id,
          p_check_in: searchParams.checkIn,
          p_check_out: searchParams.checkOut,
          p_adults: parseInt(searchParams.adults || '1'),
          p_children: parseInt(searchParams.children || '0')
        });
      
      // Get full room details for available rooms
      if (roomAvailability && roomAvailability.length > 0) {
        const roomIds = roomAvailability.map((ra: any) => ra.room_id);
        const { data: roomsData } = await supabase
          .from('rooms')
          .select('*')
          .in('id', roomIds)
          .eq('is_active', true)
          .order('base_price', { ascending: true });
        
        // Merge availability data with room data
        rooms = (roomsData || []).map(room => {
          const availability = roomAvailability.find((ra: any) => ra.room_id === room.id);
          return {
            ...room,
            availability: availability
          };
        });
      }
    } else {
      // Get all active rooms when no dates specified
      const { data: roomsData } = await supabase
        .from('rooms')
        .select('*')
        .eq('hotel_id', hotel.id)
        .eq('is_active', true)
        .order('base_price', { ascending: true });
      
      rooms = roomsData || [];
    }
  }

  // Get hotel amenities
  const amenityIds = hotel?.selected_amenities || [];
  let amenities = [];
  if (amenityIds.length > 0) {
    const { data: amenitiesData } = await supabase
      .from('omd_amenities')
      .select('*')
      .in('id', amenityIds)
      .order('category', { ascending: true });
    amenities = amenitiesData || [];
  }

  const mainImage = business.images?.[0] || '/placeholder-hotel.jpg';
  const gallery = business.images || [];
  const landmarks = hotel?.landmarks || [];

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header Navigation */}
      <header className="sticky top-0 z-40 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <Link 
              href={`/${omdSlug}/hotels${searchParams.checkIn && searchParams.checkOut ? `?checkIn=${searchParams.checkIn}&checkOut=${searchParams.checkOut}&adults=${searchParams.adults || '1'}&children=${searchParams.children || '0'}` : ''}`}
              className="inline-flex items-center text-gray-700 transition-colors hover:text-blue-600"
            >
              <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Hotels
            </Link>
            <Link 
              href={`/${omdSlug}`}
              className="text-gray-700 transition-colors hover:text-blue-600"
            >
              Home
            </Link>
          </div>
        </div>
      </header>

      {/* Search Summary */}
      {searchParams.checkIn && searchParams.checkOut && (
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="mx-auto max-w-7xl px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-blue-800">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="font-semibold">
                    {new Date(searchParams.checkIn).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })} - {new Date(searchParams.checkOut).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="text-blue-700">
                  {parseInt(searchParams.adults || '1')} {parseInt(searchParams.adults || '1') === 1 ? 'Guest' : 'Guests'}
                  {parseInt(searchParams.children || '0') > 0 && (
                    <>, {parseInt(searchParams.children || '0')} {parseInt(searchParams.children || '0') === 1 ? 'Child' : 'Children'}</>
                  )}
                </div>
              </div>
              <div className="text-blue-600 text-sm">
                {rooms?.length || 0} room{(rooms?.length || 0) === 1 ? '' : 's'} available
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Gallery Section */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <ImageGallery images={gallery} hotelName={business.name} />
        </div>
      </section>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2">
            {/* Hotel Title & Rating */}
            <div className="mb-6">
              <div className="mb-2 flex items-center gap-3">
                {hotel?.star_rating && (
                  <div className="flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-yellow-700">
                    {[...Array(hotel.star_rating)].map((_, i) => (
                      <svg key={i} className="h-4 w-4 fill-yellow-400 stroke-yellow-400" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    ))}
                  </div>
                )}
              </div>
              <h1 className="mb-3 text-4xl font-bold text-gray-900">{business.name}</h1>
              
              {business.location?.address && (
                <div className="flex items-center gap-2 text-gray-600">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-lg">{business.location.address}</span>
                </div>
              )}

              {business.rating > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-white font-semibold">
                    <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24">
                      <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    <span>{business.rating.toFixed(1)}</span>
                  </div>
                  <span className="text-gray-600">Excellent</span>
                </div>
              )}
            </div>

            {/* Description */}
            {business.description && (
              <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="mb-3 text-2xl font-bold text-gray-900">About this property</h2>
                <p className="text-gray-700 leading-relaxed">{business.description}</p>
              </div>
            )}

            {/* Amenities */}
            {amenities.length > 0 && (
              <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-2xl font-bold text-gray-900">Amenities</h2>
                <AmenitiesList amenities={amenities} />
              </div>
            )}

            {/* Landmarks */}
            {landmarks.length > 0 && (
              <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-2xl font-bold text-gray-900">Nearby Landmarks</h2>
                <LandmarksList landmarks={landmarks} />
              </div>
            )}

            {/* Rooms */}
            {rooms && rooms.length > 0 && (
              <div id="rooms-section" className="mb-8">
                <h2 className="mb-4 text-2xl font-bold text-gray-900">
                  {searchParams.checkIn && searchParams.checkOut ? 'Available Rooms' : 'Rooms & Suites'}
                </h2>
                <div className="space-y-4">
                  {rooms.map((room, index) => (
                    <LazyLoadWrapper
                      key={room.id}
                      fallback={<RoomCardSkeleton />}
                      rootMargin="200px"
                      threshold={0.1}
                    >
                      <RoomCard 
                        room={room} 
                        hotelSlug={hotelSlug}
                        omdSlug={omdSlug}
                        hotelId={hotel?.id}
                        searchParams={searchParams}
                      />
                    </LazyLoadWrapper>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Booking Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-2xl bg-white p-6 shadow-lg">
              <div className="mb-4">
                {rooms && rooms.length > 0 && (
                  <div className="mb-2">
                    <span className="text-sm text-gray-600">Starting from</span>
                    <div className="text-3xl font-bold text-gray-900">
                      €{Math.min(...rooms.map(r => r.base_price))}
                      <span className="text-lg font-normal text-gray-600">/night</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Contact Info */}
              {business.contact && (
                <div className="space-y-3 border-t border-gray-200 pt-4">
                  <h3 className="font-semibold text-gray-900">Contact Information</h3>
                  {business.contact.phone && (
                    <a 
                      href={`tel:${business.contact.phone}`}
                      className="flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {business.contact.phone}
                    </a>
                  )}
                  {business.contact.email && (
                    <a 
                      href={`mailto:${business.contact.email}`}
                      className="flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {business.contact.email}
                    </a>
                  )}
                </div>
              )}

              {/* Book Button */}
              <button
                onClick={() => {
                  const roomsSection = document.getElementById('rooms-section');
                  if (roomsSection) {
                    roomsSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="mt-6 w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
              >
                {searchParams.checkIn && searchParams.checkOut ? 'View Available Rooms' : 'Book Now'}
              </button>
              <p className="mt-2 text-center text-sm text-gray-500">
                You won&apos;t be charged yet
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export async function generateMetadata({ params }: HotelPageProps) {
  const { omdSlug, hotelSlug } = params;
  const supabase = await createClient();

  const { data: business } = await supabase
    .from('businesses')
    .select('name, description')
    .eq('slug', hotelSlug)
    .single();

  if (!business) {
    return {
      title: 'Hotel Not Found',
    };
  }

  return {
    title: `${business.name} - Hotels in ${omdSlug}`,
    description: business.description || `Book your stay at ${business.name}`,
  };
}

