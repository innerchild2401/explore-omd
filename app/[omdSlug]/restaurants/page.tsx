import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import OptimizedImage from '@/components/ui/OptimizedImage';

interface RestaurantsPageProps {
  params: { omdSlug: string };
  searchParams: { date?: string; time?: string };
}

export default async function RestaurantsPage({ params, searchParams }: RestaurantsPageProps) {
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

  // Get restaurants in this OMD
  const { data: restaurants } = await supabase
    .from('restaurants')
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
          <h1 className="mt-2 text-3xl font-bold text-gray-900">Restaurants & Dining</h1>
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
      <main className="mx-auto max-w-7xl px-4 py-8">
        {!restaurants || restaurants.length === 0 ? (
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
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <h2 className="mt-4 text-2xl font-semibold text-gray-900">No Restaurants Yet</h2>
            <p className="mt-2 text-gray-600">Check back soon for dining options!</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {restaurants.map((restaurant) => {
              const business = restaurant.businesses;
              const mainImage = business.images?.[0];
              
              return (
                <Link
                  key={restaurant.id}
                  href={`/${params.omdSlug}/restaurants/${business.slug}`}
                  className="group overflow-hidden rounded-lg bg-white shadow transition-all hover:shadow-lg"
                >
                  {mainImage && (
                    <div className="aspect-video w-full overflow-hidden">
                      <OptimizedImage
                        src={typeof mainImage === 'string' ? mainImage : (mainImage as any)?.url || '/placeholder-restaurant.jpg'}
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
                    {restaurant.cuisine_type && (
                      <div className="mt-2">
                        <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                          {restaurant.cuisine_type}
                        </span>
                      </div>
                    )}
                    {restaurant.price_range && (
                      <p className="mt-2 text-sm text-gray-600">
                        Price: {restaurant.price_range}
                      </p>
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

