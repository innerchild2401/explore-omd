import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import OptimizedImage from '@/components/ui/OptimizedImage';

interface HotelsPageProps {
  params: { omdSlug: string };
  searchParams: { checkIn?: string; checkOut?: string };
}

export default async function HotelsPage({ params, searchParams }: HotelsPageProps) {
  const supabase = await createClient();

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
  const { data: hotels } = await supabase
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
        website
      )
    `)
    .eq('businesses.omd_id', omd.id)
    .eq('businesses.is_active', true);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <Link href={`/${params.omdSlug}`} className="text-blue-600 hover:text-blue-700">
            ← Back to {omd.name}
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">Hotels & Accommodations</h1>
          {(searchParams.checkIn || searchParams.checkOut) && (
            <p className="mt-2 text-gray-600">
              {searchParams.checkIn && `Check-in: ${searchParams.checkIn}`}
              {searchParams.checkIn && searchParams.checkOut && ' • '}
              {searchParams.checkOut && `Check-out: ${searchParams.checkOut}`}
            </p>
          )}
        </div>
      </header>

      {/* Hotels List */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {!hotels || hotels.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow">
            <svg
              className="mx-auto h-16 w-16 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <h2 className="mt-4 text-2xl font-semibold text-gray-900">No Hotels Yet</h2>
            <p className="mt-2 text-gray-600">Check back soon for available accommodations!</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {hotels.map((hotel) => {
              const business = hotel.businesses;
              const mainImage = business.images?.[0];
              
              return (
                <Link
                  key={hotel.id}
                  href={`/${params.omdSlug}/hotels/${business.slug}`}
                  className="group overflow-hidden rounded-lg bg-white shadow transition-all hover:shadow-lg"
                >
                  {mainImage && (
                    <div className="aspect-video w-full overflow-hidden">
                      <OptimizedImage
                        src={typeof mainImage === 'string' ? mainImage : (mainImage as any)?.url || '/placeholder-hotel.jpg'}
                        alt={business.name}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="text-xl font-semibold text-gray-900">{business.name}</h3>
                    {business.description && (
                      <p className="mt-2 line-clamp-2 text-gray-600">{business.description}</p>
                    )}
                    {hotel.star_rating && (
                      <div className="mt-2 flex items-center">
                        {Array.from({ length: hotel.star_rating }).map((_, i) => (
                          <svg
                            key={i}
                            className="h-5 w-5 text-yellow-400"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                        <span className="ml-2 text-sm text-gray-600">
                          {hotel.star_rating} Star
                        </span>
                      </div>
                    )}
                    {business.address && (
                      <p className="mt-2 text-sm text-gray-500">📍 {business.address}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

