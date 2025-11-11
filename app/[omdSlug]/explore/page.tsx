import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getOMDBySlug, getSectionsByOMD, getBusinessesByOMD } from '@/lib/supabase/queries';
import BusinessCarousel from '@/components/sections/BusinessCarousel';
import MapSection from '@/components/sections/MapSection';
import FooterSection from '@/components/sections/FooterSection';
import Link from 'next/link';
import { DEFAULT_TEMPLATE, TemplateName } from '@/lib/omdTemplates';

export const revalidate = 60;

interface ExplorePageProps {
  params: { omdSlug: string };
}

export default async function ExplorePage({ params }: ExplorePageProps) {
  const { omdSlug } = params;

  const supabase = await createClient();

  // Fetch OMD data
  const omd = await getOMDBySlug(omdSlug, supabase);

  if (!omd) {
    notFound();
  }

  const template = ((omd.settings ?? {}).template as TemplateName) ?? DEFAULT_TEMPLATE;

  // Fetch all visible sections & businesses in parallel
  const [sections, hotels, restaurants, experiences] = await Promise.all([
    getSectionsByOMD(omd.id, false, supabase),
    getBusinessesByOMD(omd.id, 'hotel', 20, supabase),
    getBusinessesByOMD(omd.id, 'restaurant', 20, supabase),
    getBusinessesByOMD(omd.id, 'experience', 20, supabase),
  ]);

  // Find specific sections
  const exploreSection = sections.find(s => s.type === 'explore');
  const staysSection = sections.find(s => s.type === 'stays');
  const restaurantsSection = sections.find(s => s.type === 'restaurants');
  const experiencesSection = sections.find(s => s.type === 'experiences');
  const mapSection = sections.find(s => s.type === 'map');
  const footerSection = sections.find(s => s.type === 'footer');

  return (
    <main className="min-h-screen bg-white">
      {/* Header with Back Link */}
      <header className="sticky top-0 z-40 flex justify-center bg-transparent pb-3 pt-4">
        <div className="w-full max-w-7xl px-4">
          <Link
            href={`/${omdSlug}`}
            aria-label="Back to Home"
            className="inline-flex h-11 w-11 items-center justify-center gap-2 rounded-full bg-white/95 text-blue-600 shadow-md ring-1 ring-gray-200 backdrop-blur transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 md:w-auto md:px-4"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="hidden text-sm font-medium md:inline">Back to Home</span>
          </Link>
        </div>
      </header>

      {/* Welcome Section */}
      {exploreSection && (
        <section className="bg-gradient-to-b from-blue-50 to-white py-12 md:py-14">
          <div className="mx-auto max-w-4xl px-4 text-center">
            <h1 className="mb-4 text-5xl font-bold text-gray-900">
              {exploreSection.content.title || `Explore ${omd.name}`}
            </h1>
            {exploreSection.content.subtitle && (
              <p className="text-xl leading-relaxed text-gray-700">
                {exploreSection.content.subtitle}
              </p>
            )}
            {exploreSection.content.description && (
              <p className="mt-4 text-lg text-gray-600">
                {exploreSection.content.description}
              </p>
            )}
          </div>
        </section>
      )}

      {/* No Welcome Section Fallback */}
      {!exploreSection && (
        <section className="bg-gradient-to-b from-blue-50 to-white py-12 md:py-14">
          <div className="mx-auto max-w-4xl px-4 text-center">
            <h1 className="mb-4 text-5xl font-bold text-gray-900">
              Explore {omd.name}
            </h1>
            <p className="text-xl leading-relaxed text-gray-700">
              Discover all the amazing hotels, restaurants, and experiences our destination has to offer.
            </p>
          </div>
        </section>
      )}

      {/* Where to Stay */}
      {staysSection && hotels.length > 0 && (
        <BusinessCarousel
          section={staysSection}
          businesses={hotels}
          omdSlug={omdSlug}
          type="hotel"
          template={template}
        />
      )}

      {/* Where to Eat */}
      {restaurantsSection && restaurants.length > 0 && (
        <BusinessCarousel
          section={restaurantsSection}
          businesses={restaurants}
          omdSlug={omdSlug}
          type="restaurant"
          template={template}
        />
      )}

      {/* Things to Do */}
      {experiencesSection && experiences.length > 0 && (
        <BusinessCarousel
          section={experiencesSection}
          businesses={experiences}
          omdSlug={omdSlug}
          type="experience"
          template={template}
        />
      )}

      {/* Empty State */}
      {hotels.length === 0 && restaurants.length === 0 && experiences.length === 0 && (
        <section className="py-12 md:py-16">
          <div className="mx-auto max-w-2xl px-4 text-center">
            <div className="rounded-lg bg-gray-50 p-12">
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
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <h2 className="mt-4 text-2xl font-semibold text-gray-900">
                Coming Soon!
              </h2>
              <p className="mt-2 text-gray-600">
                We&apos;re currently adding amazing businesses to showcase. Check back soon!
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Map View */}
      {mapSection && (hotels.length > 0 || restaurants.length > 0 || experiences.length > 0) && (
        <MapSection
          section={mapSection}
          businesses={[...hotels, ...restaurants, ...experiences]}
        />
      )}

      {/* Footer */}
      {footerSection && <FooterSection section={footerSection} omd={omd} />}
    </main>
  );
}

export async function generateMetadata({ params }: ExplorePageProps) {
  const { omdSlug } = params;
  const omd = await getOMDBySlug(omdSlug);

  if (!omd) {
    return {
      title: 'Explore - OMD Not Found',
    };
  }

  return {
    title: `Explore ${omd.name} - Hotels, Restaurants & Experiences`,
    description: `Discover all the amazing hotels, restaurants, and experiences in ${omd.name}`,
  };
}

