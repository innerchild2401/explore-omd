import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import OptimizedImage from '@/components/ui/OptimizedImage';
import StructuredData from '@/components/seo/StructuredData';
import { getImageUrl, formatPrice } from '@/lib/utils';
import BackButton from '@/components/ui/BackButton';
import { Metadata } from 'next';
import { generateSeoMetadata, generateCollectionPageSchema, generateBreadcrumbSchema, getAbsoluteUrl } from '@/lib/seo/utils';

export const revalidate = 3600; // Revalidate every hour

interface LandingPageProps {
  params: {
    omdSlug: string;
    slug: string;
  };
}

export async function generateMetadata({ params }: LandingPageProps): Promise<Metadata> {
  const { omdSlug, slug } = params;
  const supabase = await createClient();

  const { data: omd } = await supabase
    .from('omds')
    .select('id, name')
    .eq('slug', omdSlug)
    .single();

  if (!omd) {
    return {
      title: 'Page Not Found',
    };
  }

  const { data: page } = await supabase
    .from('landing_pages')
    .select('title, meta_description')
    .eq('omd_id', omd.id)
    .eq('url_slug', slug)
    .eq('is_published', true)
    .single();

  if (!page) {
    return {
      title: 'Page Not Found',
    };
  }

  const path = `/${omdSlug}/labels/${slug}`;

  return generateSeoMetadata({
    title: page.title,
    description: page.meta_description,
    path,
    type: 'website',
    siteName: omd.name,
  });
}

export default async function LandingPage({ params }: LandingPageProps) {
  const { omdSlug, slug } = params;
  const supabase = await createClient();

  // Get OMD
  const { data: omd } = await supabase
    .from('omds')
    .select('id, name, slug, status')
    .eq('slug', omdSlug)
    .single();

  if (!omd || omd.status !== 'active') {
    notFound();
  }

  // Get landing page
  const { data: page, error: pageError } = await supabase
    .from('landing_pages')
    .select(`
      *,
      landing_page_labels (
        label_id,
        labels (
          id,
          name,
          description,
          label_categories (
            id,
            name
          )
        )
      )
    `)
    .eq('omd_id', omd.id)
    .eq('url_slug', slug)
    .eq('is_published', true)
    .single();

  if (pageError || !page) {
    notFound();
  }

  // Get businesses for this landing page
  // First check if there are manually selected businesses
  const { data: manualBusinesses } = await supabase
    .from('landing_page_businesses')
    .select(`
      business_id,
      order_index,
      businesses (
        id,
        name,
        slug,
        type,
        description,
        images,
        rating,
        location
      )
    `)
    .eq('landing_page_id', page.id)
    .order('order_index', { ascending: true });

  let businesses: any[] = [];

  if (manualBusinesses && manualBusinesses.length > 0) {
    // Use manually selected businesses
    businesses = manualBusinesses
      .map((mb: any) => mb.businesses)
      .filter(Boolean);
  } else {
    // Auto-match businesses by labels
    const labelIds = page.landing_page_labels?.map((lpl: any) => lpl.label_id) || [];
    
    if (labelIds.length > 0) {
      // Find businesses that have ALL the labels
      const { data: businessLabels } = await supabase
        .from('business_labels')
        .select('business_id, label_id')
        .in('label_id', labelIds);

      if (businessLabels) {
        // Group by business_id and count matching labels
        const businessLabelCounts = new Map<string, number>();
        businessLabels.forEach((bl: any) => {
          const count = businessLabelCounts.get(bl.business_id) || 0;
          businessLabelCounts.set(bl.business_id, count + 1);
        });

        // Find businesses that have ALL labels
        const matchingBusinessIds = Array.from(businessLabelCounts.entries())
          .filter(([_, count]) => count === labelIds.length)
          .map(([business_id]) => business_id);

        if (matchingBusinessIds.length > 0) {
          const { data: matchedBusinesses } = await supabase
            .from('businesses')
            .select('id, name, slug, type, description, images, rating, location')
            .eq('omd_id', omd.id)
            .eq('status', 'active')
            .in('id', matchingBusinessIds)
            .order('rating', { ascending: false, nullsFirst: false })
            .order('name', { ascending: true });

          businesses = matchedBusinesses || [];
        }
      }
    }
  }

  // Get related landing pages (other pages with overlapping labels)
  const pageLabelIds = page.landing_page_labels?.map((lpl: any) => lpl.label_id) || [];
  let relatedPages: any[] = [];

  if (pageLabelIds.length > 0) {
    const { data: relatedPagesData } = await supabase
      .from('landing_page_labels')
      .select(`
        landing_page_id,
        landing_pages!inner (
          id,
          title,
          url_slug,
          header_text
        )
      `)
      .in('label_id', pageLabelIds)
      .neq('landing_page_id', page.id)
      .eq('landing_pages.is_published', true);

    if (relatedPagesData) {
      // Group by landing_page_id and count overlapping labels
      const pageOverlapCounts = new Map<string, number>();
      relatedPagesData.forEach((rpl: any) => {
        const count = pageOverlapCounts.get(rpl.landing_page_id) || 0;
        pageOverlapCounts.set(rpl.landing_page_id, count + 1);
      });

      // Get unique pages with at least 1 overlapping label
      const relatedPageIds = Array.from(pageOverlapCounts.keys());
      
      if (relatedPageIds.length > 0) {
        const { data: pages } = await supabase
          .from('landing_pages')
          .select('id, title, url_slug, header_text')
          .in('id', relatedPageIds)
          .eq('is_published', true)
          .limit(5);

        relatedPages = pages || [];
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <BackButton href={`/${omdSlug}`} label="Back to Home" />
          <h1 className="mt-6 text-4xl font-bold md:text-5xl">{page.header_text}</h1>
          {page.intro_text && (
            <p className="mt-4 text-lg text-blue-100 md:text-xl">{page.intro_text}</p>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        {businesses.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center shadow">
            <p className="text-gray-600">
              Nu s-au găsit locații care să corespundă criteriilor pentru această pagină.
            </p>
          </div>
        ) : (
          <>
            {/* Business Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {businesses.map((business: any) => {
                const mainImage =
                  typeof business.images?.[0] === 'string'
                    ? business.images[0]
                    : (business.images?.[0] as any)?.url || '/placeholder.jpg';

                return (
                  <Link
                    key={business.id}
                    href={`/${omdSlug}/${business.type === 'hotel' ? 'hotels' : business.type === 'restaurant' ? 'restaurants' : 'experiences'}/${business.slug}`}
                    className="group block overflow-hidden rounded-lg bg-white shadow-md transition-shadow hover:shadow-xl"
                  >
                    <div className="relative h-48 overflow-hidden">
                      <OptimizedImage
                        src={getImageUrl(mainImage)}
                        alt={business.name}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-110"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                      {business.rating > 0 && (
                        <div className="absolute right-2 top-2 rounded-full bg-white px-3 py-1 text-sm font-semibold shadow-md text-gray-900">
                          {business.rating} ⭐
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">
                        {business.name}
                      </h3>
                      {business.description && (
                        <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                          {business.description}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Related Pages */}
            {relatedPages.length > 0 && (
              <div className="mt-12 rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-xl font-semibold text-gray-900">
                  Pagini Similare
                </h2>
                <div className="flex flex-wrap gap-2">
                  {relatedPages.map((relatedPage: any) => (
                    <Link
                      key={relatedPage.id}
                      href={`/${omdSlug}/labels/${relatedPage.url_slug}`}
                      className="rounded-md bg-blue-50 px-4 py-2 text-sm text-blue-700 hover:bg-blue-100"
                    >
                      {relatedPage.title}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Structured Data for SEO */}
        <StructuredData
          data={[
            generateCollectionPageSchema({
              name: page.header_text,
              description: page.meta_description || undefined,
              url: getAbsoluteUrl(`/${omdSlug}/labels/${slug}`),
              items: businesses.map((business: any) => ({
                name: business.name,
                url: getAbsoluteUrl(`/${omdSlug}/${business.type === 'hotel' ? 'hotels' : business.type === 'restaurant' ? 'restaurants' : 'experiences'}/${business.slug}`),
              })),
            }),
            generateBreadcrumbSchema([
              { name: omd.name, url: getAbsoluteUrl(`/${omdSlug}`) },
              { name: page.header_text, url: getAbsoluteUrl(`/${omdSlug}/labels/${slug}`) },
            ]),
          ]}
        />
      </div>
    </div>
  );
}

