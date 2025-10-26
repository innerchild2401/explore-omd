import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Star, Users, Maximize, Wifi, Coffee, Tv, Wind, Key, Crown } from 'lucide-react';
import { motion } from 'framer-motion';
import ImageGallery from '@/components/hotels/ImageGallery';
import RoomCard from '@/components/hotels/RoomCard';
import AmenitiesList from '@/components/hotels/AmenitiesList';
import LandmarksList from '@/components/hotels/LandmarksList';

export const revalidate = 60;

interface HotelPageProps {
  params: {
    omdSlug: string;
    hotelSlug: string;
  };
}

export default async function HotelDetailPage({ params }: HotelPageProps) {
  const { omdSlug, hotelSlug } = params;
  const supabase = createClient();

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

  // Get active rooms
  const { data: rooms } = await supabase
    .from('rooms')
    .select('*')
    .eq('hotel_id', hotel?.id)
    .eq('is_active', true)
    .order('base_price', { ascending: true });

  // Get hotel amenities
  const amenityIds = hotel?.amenities || [];
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
              href={`/${omdSlug}/explore`}
              className="inline-flex items-center text-gray-700 transition-colors hover:text-blue-600"
            >
              <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Explore
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
                      <Star key={i} className="h-4 w-4 fill-yellow-400 stroke-yellow-400" />
                    ))}
                  </div>
                )}
              </div>
              <h1 className="mb-3 text-4xl font-bold text-gray-900">{business.name}</h1>
              
              {business.location?.address && (
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="h-5 w-5" />
                  <span className="text-lg">{business.location.address}</span>
                </div>
              )}

              {business.rating > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-white font-semibold">
                    <Star className="h-4 w-4 fill-white" />
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
              <div className="mb-8">
                <h2 className="mb-4 text-2xl font-bold text-gray-900">Available Rooms</h2>
                <div className="space-y-4">
                  {rooms.map((room) => (
                    <RoomCard 
                      key={room.id} 
                      room={room} 
                      hotelSlug={hotelSlug}
                      omdSlug={omdSlug}
                    />
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
                className="mt-6 w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Book Now
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
  const supabase = createClient();

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

