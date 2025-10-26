import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import OptimizedImage from '@/components/ui/OptimizedImage';

interface ExperiencesPageProps {
  params: { omdSlug: string };
  searchParams: { date?: string };
}

export default async function ExperiencesPage({ params, searchParams }: ExperiencesPageProps) {
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

  // Get experiences in this OMD
  const { data: experiences } = await supabase
    .from('experiences')
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
          <h1 className="mt-2 text-3xl font-bold text-gray-900">Experiences & Activities</h1>
          {searchParams.date && (
            <p className="mt-2 text-gray-600">Date: {searchParams.date}</p>
          )}
        </div>
      </header>

      {/* Experiences List */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {!experiences || experiences.length === 0 ? (
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
                d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
              />
            </svg>
            <h2 className="mt-4 text-2xl font-semibold text-gray-900">No Experiences Yet</h2>
            <p className="mt-2 text-gray-600">Check back soon for exciting activities!</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {experiences.map((experience) => {
              const business = experience.businesses;
              const mainImage = business.images?.[0];
              
              return (
                <Link
                  key={experience.id}
                  href={`/${params.omdSlug}/experiences/${business.slug}`}
                  className="group overflow-hidden rounded-lg bg-white shadow transition-all hover:shadow-lg"
                >
                  {mainImage && (
                    <div className="aspect-video w-full overflow-hidden">
                      <OptimizedImage
                        src={typeof mainImage === 'string' ? mainImage : (mainImage as any)?.url || '/placeholder-experience.jpg'}
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
                    {experience.category && (
                      <div className="mt-2">
                        <span className="inline-block rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-800">
                          {experience.category}
                        </span>
                      </div>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      {experience.duration && (
                        <p className="text-sm text-gray-600">
                          ⏱️ {experience.duration}
                        </p>
                      )}
                      {experience.price && (
                        <p className="font-semibold text-blue-600">
                          From ${experience.price}
                        </p>
                      )}
                    </div>
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

