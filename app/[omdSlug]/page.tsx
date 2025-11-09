import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getOMDBySlug, getSectionsByOMD } from '@/lib/supabase/queries';
import HeroSection from '@/components/sections/HeroSection';
import SearchBar from '@/components/sections/SearchBar';
import FooterSection from '@/components/sections/FooterSection';
import { DEFAULT_TEMPLATE, TemplateName } from '@/lib/omdTemplates';

export const revalidate = 60; // Revalidate every 60 seconds

interface PageProps {
  params: {
    omdSlug: string;
  };
}

export default async function OMDHomePage({ params }: PageProps) {
  const { omdSlug } = params;
  const supabase = await createClient();

  // Fetch OMD data
  const omd = await getOMDBySlug(omdSlug, supabase);
  
  if (!omd) {
    notFound();
  }

  // Fetch all visible sections
  const sections = await getSectionsByOMD(omd.id, false, supabase);

  const themeSettings = omd.settings ?? {};
  const template = (themeSettings.template as TemplateName) ?? DEFAULT_TEMPLATE;

  // Find specific sections
  const heroSection = sections.find(s => s.type === 'hero');
  const footerSection = sections.find(s => s.type === 'footer');

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      {heroSection && <HeroSection section={heroSection} omd={omd} template={template} />}

      {/* Search Bar */}
      <SearchBar omdSlug={omdSlug} template={template} />

      {/* Footer */}
      {footerSection && <FooterSection section={footerSection} omd={omd} />}
    </main>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { omdSlug } = params;
  const supabase = await createClient();
  const omd = await getOMDBySlug(omdSlug, supabase);

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

