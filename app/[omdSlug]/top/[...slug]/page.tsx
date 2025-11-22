import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import OptimizedImage from '@/components/ui/OptimizedImage';
import { getImageUrl, formatPrice } from '@/lib/utils';
import BackButton from '@/components/ui/BackButton';
import { Metadata } from 'next';

export const revalidate = 3600; // Revalidate every hour

interface TopPageProps {
  params: {
    omdSlug: string;
    slug: string[];
  };
}

/**
 * Parse URL slug to determine page type, business type, and time period
 */
function parseSlug(slug: string[]): {
  pageType: string;
  businessType: string;
  timePeriod: string | null;
} {
  const fullSlug = slug.join('/');
  
  // Map URL patterns to page types
  const pageTypeMap: Record<string, string> = {
    'most-booked-hotels': 'most-booked-hotels',
    'cheapest-hotels': 'cheapest-hotels',
    'highest-rated-hotels': 'highest-rated-hotels',
    'resorts': 'resorts',
    'bnb': 'bnb',
    'apartments': 'apartments',
    '5-star-hotels': '5-star-hotels',
    '4-star-hotels': '4-star-hotels',
    'most-visited-restaurants': 'most-visited-restaurants',
    'budget-restaurants': 'budget-restaurants',
    'mid-range-restaurants': 'mid-range-restaurants',
    'fine-dining-restaurants': 'fine-dining-restaurants',
    'highest-rated-restaurants': 'highest-rated-restaurants',
    'most-booked-experiences': 'most-booked-experiences',
    'cheapest-experiences': 'cheapest-experiences',
    'highest-rated-experiences': 'highest-rated-experiences',
    'easy-experiences': 'easy-experiences',
    'moderate-experiences': 'moderate-experiences',
    'challenging-experiences': 'challenging-experiences',
    'newest-businesses': 'newest-businesses',
  };

  // Check for time period in slug
  let timePeriod: string | null = null;
  let pageType = '';
  let businessType = '';

  if (fullSlug.includes('/last-7-days')) {
    timePeriod = 'last-7-days';
    pageType = fullSlug.replace('/last-7-days', '');
  } else if (fullSlug.includes('/this-month')) {
    timePeriod = 'this-month';
    pageType = fullSlug.replace('/this-month', '');
  } else if (fullSlug.includes('/all-time')) {
    timePeriod = 'all-time';
    pageType = fullSlug.replace('/all-time', '');
  } else {
    pageType = fullSlug;
  }

  // Determine business type from page type
  if (pageType.includes('hotel')) {
    businessType = 'hotel';
  } else if (pageType.includes('restaurant')) {
    businessType = 'restaurant';
  } else if (pageType.includes('experience')) {
    businessType = 'experience';
  } else if (pageType === 'newest-businesses') {
    businessType = 'all';
  } else if (['resorts', 'bnb', 'apartments', '5-star-hotels', '4-star-hotels'].includes(pageType)) {
    businessType = 'hotel';
  } else if (['budget-restaurants', 'mid-range-restaurants', 'fine-dining-restaurants'].includes(pageType)) {
    businessType = 'restaurant';
  } else if (['easy-experiences', 'moderate-experiences', 'challenging-experiences'].includes(pageType)) {
    businessType = 'experience';
  }

  return { pageType, businessType, timePeriod };
}

export default async function AutoTopPage({ params }: TopPageProps) {
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

  // Build URL slug from params
  const urlSlug = slug.join('/');

  // Get page configuration by URL slug (this is the unique identifier)
  const { data: page, error: pageError } = await supabase
    .from('auto_top_pages')
    .select('*')
    .eq('omd_id', omd.id)
    .eq('url_slug', urlSlug)
    .eq('is_active', true)
    .single();

  if (pageError || !page) {
    notFound();
  }

  // Get cached content (ranked businesses)
  const { data: content, error: contentError } = await supabase
    .from('auto_top_page_content')
    .select(`
      rank,
      metric_value,
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
    .eq('auto_top_page_id', page.id)
    .order('rank', { ascending: true });

  if (contentError || !content || content.length === 0) {
    // Page exists but no content yet - show message
    const hasBeenGenerated = page.last_generated_at !== null;
    const header = page.header_template
      .replace('{count}', page.count.toString())
      .replace('{destination}', omd.name);
    
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <BackButton href={`/${omdSlug}`} label="Back to Home" />
          <div className="text-center py-16">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{header}</h1>
            {hasBeenGenerated ? (
              <div>
                <p className="text-gray-600 mb-4">
                  Nu s-au găsit locații care să corespundă criteriilor pentru această pagină.
                </p>
                <p className="text-sm text-gray-500">
                  Această pagină a fost generată, dar nu există încă suficiente date pentru a afișa conținut.
                </p>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 mb-4">
                  Această pagină nu a fost generată încă.
                </p>
                <p className="text-sm text-gray-500">
                  Administratorii pot genera conținutul din panoul de administrare.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Get full business details
  const businessIds = content.map((c: any) => c.businesses?.id).filter(Boolean);
  const { data: businesses } = await supabase
    .from('businesses')
    .select(`
      *,
      hotels (id, star_rating, property_subtype),
      restaurants (id, price_range, cuisine_type),
      experiences (id, price_from, difficulty_level, category)
    `)
    .in('id', businessIds)
    .eq('status', 'active')
    .eq('is_published', true);

  // Map businesses with their rankings
  const rankedBusinesses = content
    .map((c: any) => {
      const business = businesses?.find((b: any) => b.id === c.businesses?.id);
      if (!business) return null;
      return {
        ...business,
        rank: c.rank,
        metric_value: c.metric_value,
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.rank - b.rank);

  // Fill template placeholders
  const fillTemplate = (template: string): string => {
    const businessTypeText = page.business_type === 'all' ? 'locații' : page.business_type === 'hotel' ? 'hoteluri' : page.business_type === 'restaurant' ? 'restaurante' : 'experiențe';
    let filled = template
      .replace('{count}', page.count.toString())
      .replace('{destination}', omd.name)
      .replace('{business_type}', businessTypeText);

    // Add business names if available
    if (rankedBusinesses.length >= 1) {
      filled = filled.replace('{business1}', rankedBusinesses[0]?.name || '');
    }
    if (rankedBusinesses.length >= 2) {
      filled = filled.replace('{business2}', rankedBusinesses[1]?.name || '');
    }
    if (rankedBusinesses.length >= 3) {
      filled = filled.replace('{business3}', rankedBusinesses[2]?.name || '');
    }

    return filled;
  };

  const title = fillTemplate(page.title_template);
  const metaDescription = fillTemplate(page.meta_description_template);
  const header = fillTemplate(page.header_template);
  const intro = page.intro_template ? fillTemplate(page.intro_template) : null;

  // Format metric value based on page type
  const formatMetric = (value: number, type: string): string => {
    if (type.includes('cheapest') || type.includes('price')) {
      return formatPrice(value);
    } else if (type.includes('rated')) {
      return `${value.toFixed(1)} ⭐`;
    } else if (type.includes('booked') || type.includes('visited')) {
      return `${Math.round(value)} rezervări`;
    } else {
      return value.toString();
    }
  };

  // Get related top pages for internal linking
  const { data: relatedPages } = await supabase
    .from('auto_top_pages')
    .select('page_type, business_type, time_period, url_slug, title_template')
    .eq('omd_id', omd.id)
    .eq('is_active', true)
    .neq('id', page.id)
    .eq('business_type', page.business_type)
    .limit(5);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col gap-4">
            <BackButton href={`/${omdSlug}`} label={`Back to ${omd.name}`} variant="inverted" />
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2">{header}</h1>
            {intro && (
              <p className="text-blue-100 text-lg sm:text-xl max-w-3xl">
                {intro}
              </p>
            )}
            {page.last_generated_at && (
              <div className="flex items-center gap-2 text-blue-200 text-sm sm:text-base mt-2">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  Actualizat: {new Date(page.last_generated_at).toLocaleDateString('ro-RO', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Businesses List */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 gap-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3 w-full min-w-0 max-w-full">
          {rankedBusinesses.map((business: any, index: number) => {
            const mainImage = business.images?.[0];
            const businessUrl = `/${omdSlug}/${business.type === 'hotel' ? 'hotels' : business.type === 'restaurant' ? 'restaurants' : 'experiences'}/${business.slug}`;
            const imageUrl = getImageUrl(mainImage);

            return (
              <article
                key={business.id}
                className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 w-full"
                style={{ minWidth: 0, maxWidth: '100%' }}
              >
                <Link href={businessUrl} className="block touch-manipulation" prefetch={true}>
                  {/* Business Image */}
                  <div className="relative w-full aspect-[4/3] overflow-hidden bg-gray-100" style={{ width: '100%', minWidth: 0, maxWidth: '100%' }}>
                    <OptimizedImage
                      src={imageUrl}
                      alt={business.name}
                      fill
                      className="object-cover hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      quality={75}
                      priority={index < 3}
                    />
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    
                    {/* Rank Badge - Top Left */}
                    <div className="absolute top-4 left-4">
                      <div className="bg-white/95 backdrop-blur-sm rounded-full px-4 py-2 text-lg font-bold text-gray-900 shadow-lg">
                        #{business.rank}
                      </div>
                    </div>
                    
                    {/* Rating Badge - Top Right */}
                    {business.rating > 0 && (
                      <div className="absolute top-4 right-4">
                        <div className="bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 text-sm font-semibold shadow-lg text-gray-900">
                          {business.rating.toFixed(1)} ⭐
                        </div>
                      </div>
                    )}

                    {/* Metric Badge - Bottom Left */}
                    <div className="absolute bottom-4 left-4">
                      <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-900 shadow-md">
                        {formatMetric(business.metric_value, page.page_type)}
                      </div>
                    </div>
                  </div>

                  {/* Business Info */}
                  <div className="p-4 sm:p-6 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-3 min-w-0">
                      <div className="flex-1 min-w-0">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 line-clamp-1 mb-1">
                          {business.name}
                        </h2>
                        {business.location?.address && (
                          <div className="flex items-center text-gray-500 text-xs sm:text-sm mt-1.5">
                            <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="line-clamp-1">{business.location.address}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {business.description && (
                      <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                        {business.description}
                      </p>
                    )}

                    {/* Call to Action */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <span className="text-blue-600 font-semibold text-sm sm:text-base">
                        Vezi detalii
                      </span>
                      <svg
                        className="h-5 w-5 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                </Link>
              </article>
            );
          })}
        </div>

        {/* Related Pages Section - Internal Linking for SEO */}
        {relatedPages && relatedPages.length > 0 && (
          <div className="mt-12 sm:mt-16 pt-8 sm:pt-12 border-t border-gray-200">
            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Vezi și:</h2>
              <p className="text-gray-600 text-sm sm:text-base">
                Descoperă alte pagini de top generate automat pentru {omd.name}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedPages.map((relatedPage: any) => {
                const relatedUrl = `/${omdSlug}/top/${relatedPage.url_slug}`;
                const relatedTitle = relatedPage.title_template
                  .replace('{count}', page.count.toString())
                  .replace('{destination}', omd.name);

                return (
                  <Link
                    key={relatedPage.page_type}
                    href={relatedUrl}
                    className="group flex items-center justify-between p-4 rounded-xl bg-white border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200"
                  >
                    <span className="text-gray-700 group-hover:text-blue-600 font-medium text-sm sm:text-base line-clamp-2 flex-1 pr-2">
                      {relatedTitle}
                    </span>
                    <svg
                      className="h-5 w-5 text-gray-400 group-hover:text-blue-600 flex-shrink-0 transition-colors"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'ItemList',
              name: header,
              description: metaDescription,
              itemListElement: rankedBusinesses.map((business: any, index: number) => ({
                '@type': 'ListItem',
                position: business.rank,
                item: {
                  '@type': business.type === 'hotel' ? 'Hotel' : business.type === 'restaurant' ? 'Restaurant' : 'TouristAttraction',
                  name: business.name,
                  url: `https://${process.env.NEXT_PUBLIC_SITE_URL || 'destexplore.eu'}/${omdSlug}/${business.type === 'hotel' ? 'hotels' : business.type === 'restaurant' ? 'restaurants' : 'experiences'}/${business.slug}`,
                  ...(business.rating > 0 && {
                    aggregateRating: {
                      '@type': 'AggregateRating',
                      ratingValue: business.rating,
                      bestRating: 5,
                    },
                  }),
                },
              })),
            }),
          }}
        />
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: TopPageProps): Promise<Metadata> {
  const { omdSlug, slug } = params;
  const supabase = await createClient();

  const { data: omd } = await supabase
    .from('omds')
    .select('id, name')
    .eq('slug', omdSlug)
    .single();

  if (!omd) {
    return { title: 'Page Not Found' };
  }

  // Build URL slug from params
  const urlSlug = slug.join('/');

  const { data: page } = await supabase
    .from('auto_top_pages')
    .select('title_template, meta_description_template')
    .eq('omd_id', omd.id)
    .eq('url_slug', urlSlug)
    .eq('is_active', true)
    .single();

  if (!page) {
    return { title: 'Page Not Found' };
  }

  const title = page.title_template
    .replace('{count}', '5')
    .replace('{destination}', omd.name);
  const description = page.meta_description_template
    .replace('{count}', '5')
    .replace('{destination}', omd.name)
    .replace('{business1}', '')
    .replace('{business2}', '')
    .replace('{business3}', '');

  return {
    title,
    description,
  };
}

