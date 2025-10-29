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
  let experiencesQuery = supabase
    .from('experiences')
    .select(`
      *,
      businesses!inner(
        id,
        name,
        description,
        slug,
        images,
        location,
        contact
      )
    `)
    .eq('businesses.omd_id', omd.id)
    .eq('businesses.status', 'active');

  // Filter by date if provided (±3 days)
  let filteredExperiences = [];
  if (searchParams.date) {
    const selectedDate = new Date(searchParams.date);
    const startDate = new Date(selectedDate);
    startDate.setDate(startDate.getDate() - 3);
    const endDate = new Date(selectedDate);
    endDate.setDate(endDate.getDate() + 3);

    const { data: allExperiences, error } = await experiencesQuery;
    
    if (allExperiences && !error) {
      // Get available time slots for the date range
      const { data: timeSlots } = await supabase
        .from('experience_time_slots')
        .select('experience_id, start_date')
        .gte('start_date', startDate.toISOString().split('T')[0])
        .lte('start_date', endDate.toISOString().split('T')[0])
        .eq('is_available', true);

      const experienceIdsWithSlots = new Set(timeSlots?.map(ts => ts.experience_id) || []);
      filteredExperiences = allExperiences.filter(exp => experienceIdsWithSlots.has(exp.id));
    }
  } else {
    const { data } = await experiencesQuery;
    filteredExperiences = data || [];
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <Link href={`/${params.omdSlug}`} className="text-blue-600 hover:text-blue-700">
            ← Back to {omd.name}
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">Experiences & Activities</h1>
          
          {/* Date Filter */}
          <form method="get" className="mt-4 flex gap-3 items-end">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Date
              </label>
              <input
                type="date"
                id="date"
                name="date"
                defaultValue={searchParams.date || ''}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
            >
              Filter
            </button>
            {searchParams.date && (
              <Link
                href={`/${params.omdSlug}/experiences`}
                className="px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50"
              >
                Clear
              </Link>
            )}
          </form>
          
          {searchParams.date && (
            <p className="mt-2 text-sm text-gray-600">
              Showing experiences available between {new Date(new Date(searchParams.date).setDate(new Date(searchParams.date).getDate() - 3)).toLocaleDateString()} and {new Date(new Date(searchParams.date).setDate(new Date(searchParams.date).getDate() + 3)).toLocaleDateString()}
            </p>
          )}
        </div>
      </header>

      {/* Experiences List */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {!filteredExperiences || filteredExperiences.length === 0 ? (
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
            {filteredExperiences.map((experience) => {
              const business = experience.businesses;
              const mainImage = typeof business.images?.[0] === 'string' ? business.images[0] : (business.images?.[0] as any)?.url;
              
              return (
                <Link
                  key={experience.id}
                  href={`/${params.omdSlug}/experiences/${business.slug}${searchParams.date ? `?date=${searchParams.date}` : ''}`}
                  className="group overflow-hidden rounded-lg bg-white shadow transition-all hover:shadow-lg"
                >
                  <div className="aspect-video w-full overflow-hidden relative">
                    {mainImage ? (
                      <OptimizedImage
                        src={mainImage}
                        alt={business.name}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                        <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                        </svg>
                      </div>
                    )}
                    
                    {/* Price Badge */}
                    {experience.price_from && (
                      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1">
                        <span className="text-sm font-semibold text-gray-700">
                          {experience.currency || 'USD'} {experience.price_from}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-xl font-bold text-gray-900">{business.name}</h3>
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
                    <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
                      {experience.duration && (
                        <span className="flex items-center gap-1">
                          ⏱️ {experience.duration}
                        </span>
                      )}
                      {experience.difficulty_level && (
                        <span className="flex items-center gap-1">
                          📊 {experience.difficulty_level.charAt(0).toUpperCase() + experience.difficulty_level.slice(1)}
                        </span>
                      )}
                    </div>
                    {business.location?.address && (
                      <p className="mt-2 text-sm text-gray-500">📍 {business.location.address}</p>
                    )}
                    
                    {/* Tags */}
                    {experience.tags && experience.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {experience.tags.slice(0, 3).map((tag: string, idx: number) => (
                          <span key={idx} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
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


