import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getOMDBySlug, getSectionsByOMD } from '@/lib/supabase/queries';
import HeroSection from '@/components/sections/HeroSection';
import SearchBar from '@/components/sections/SearchBar';
import FooterSection from '@/components/sections/FooterSection';
import StructuredData from '@/components/seo/StructuredData';
import { DEFAULT_TEMPLATE, TemplateName } from '@/lib/omdTemplates';
import { generateSeoMetadata, generateOrganizationSchema, getAbsoluteUrl } from '@/lib/seo/utils';

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

      {/* Structured Data for SEO */}
      <StructuredData
        data={[
          generateOrganizationSchema({
            name: omd.name,
            slug: omd.slug,
            logo: omd.logo || undefined,
            description: `Explore ${omd.name} - Your gateway to hotels, restaurants, and experiences.`,
          }),
        ]}
      />
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

  const title = `${omd.name} - Explore Local Destinations`;
  const description = `Discover hotels, restaurants, and experiences in ${omd.name}. Book your perfect stay, dine at the best restaurants, and experience unforgettable adventures.`;
  const path = `/${omdSlug}`;

  return generateSeoMetadata({
    title,
    description,
    path,
    type: 'website',
    siteName: omd.name,
  });
}

