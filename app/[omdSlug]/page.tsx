import { notFound } from 'next/navigation';
import { getOMDBySlug, getSectionsByOMD, getBusinessesByOMD } from '@/lib/supabase/queries';
import HeroSection from '@/components/sections/HeroSection';
import SearchBar from '@/components/sections/SearchBar';
import BusinessCarousel from '@/components/sections/BusinessCarousel';
import MapSection from '@/components/sections/MapSection';
import FooterSection from '@/components/sections/FooterSection';

export const revalidate = 60; // Revalidate every 60 seconds

interface PageProps {
  params: {
    omdSlug: string;
  };
}

export default async function OMDHomePage({ params }: PageProps) {
  const { omdSlug } = params;
  
  // Fetch OMD data
  const omd = await getOMDBySlug(omdSlug);
  
  if (!omd) {
    notFound();
  }

  // Fetch all visible sections
  const sections = await getSectionsByOMD(omd.id);
  
  // Fetch businesses by type
  const hotels = await getBusinessesByOMD(omd.id, 'hotel', 10);
  const restaurants = await getBusinessesByOMD(omd.id, 'restaurant', 10);
  const experiences = await getBusinessesByOMD(omd.id, 'experience', 10);

  // Find specific sections
  const heroSection = sections.find(s => s.type === 'hero');
  const staysSection = sections.find(s => s.type === 'stays');
  const restaurantsSection = sections.find(s => s.type === 'restaurants');
  const experiencesSection = sections.find(s => s.type === 'experiences');
  const mapSection = sections.find(s => s.type === 'map');
  const footerSection = sections.find(s => s.type === 'footer');

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      {heroSection && <HeroSection section={heroSection} omd={omd} />}

      {/* Search Bar */}
      <SearchBar omdSlug={omdSlug} />

      {/* Where to Stay */}
      {staysSection && hotels.length > 0 && (
        <BusinessCarousel
          section={staysSection}
          businesses={hotels}
          omdSlug={omdSlug}
          type="hotel"
        />
      )}

      {/* Where to Eat */}
      {restaurantsSection && restaurants.length > 0 && (
        <BusinessCarousel
          section={restaurantsSection}
          businesses={restaurants}
          omdSlug={omdSlug}
          type="restaurant"
        />
      )}

      {/* Things to Do */}
      {experiencesSection && experiences.length > 0 && (
        <BusinessCarousel
          section={experiencesSection}
          businesses={experiences}
          omdSlug={omdSlug}
          type="experience"
        />
      )}

      {/* Map View */}
      {mapSection && (
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

export async function generateMetadata({ params }: PageProps) {
  const { omdSlug } = params;
  const omd = await getOMDBySlug(omdSlug);

  if (!omd) {
    return {
      title: 'OMD Not Found',
    };
  }

  return {
    title: `${omd.name} - Explore Local Destinations`,
    description: `Discover hotels, restaurants, and experiences in ${omd.name}`,
  };
}

