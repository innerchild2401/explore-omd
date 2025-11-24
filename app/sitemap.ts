import { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getBaseUrl } from '@/lib/seo/utils';

export const revalidate = 3600; // Revalidate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();
  const supabase = await createClient();

  const sitemapEntries: MetadataRoute.Sitemap = [];

  // Always include homepage
  sitemapEntries.push({
    url: baseUrl,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 1.0,
  });

  try {
    // Get all active OMDs
    const { data: omds, error: omdsError } = await supabase
      .from('omds')
      .select('id, slug, updated_at')
      .eq('status', 'active');

    if (omdsError) {
      console.error('Error fetching OMDs for sitemap:', omdsError);
      // Return at least the homepage if there's an error
      return sitemapEntries;
    }

    if (!omds || omds.length === 0) {
      // Return at least the homepage if no OMDs
      return sitemapEntries;
    }

      // Add OMD home pages
      for (const omd of omds) {
        const lastModified = omd.updated_at 
          ? new Date(omd.updated_at)
          : new Date();
        
        sitemapEntries.push({
          url: `${baseUrl}/${omd.slug}`,
          lastModified: lastModified,
          changeFrequency: 'daily',
          priority: 1.0,
        });

        const omdLastModified = omd.updated_at 
          ? new Date(omd.updated_at)
          : new Date();

        // Add explore page
        sitemapEntries.push({
          url: `${baseUrl}/${omd.slug}/explore`,
          lastModified: omdLastModified,
          changeFrequency: 'daily',
          priority: 0.9,
        });

        // Add hotels listing page
        sitemapEntries.push({
          url: `${baseUrl}/${omd.slug}/hotels`,
          lastModified: omdLastModified,
          changeFrequency: 'daily',
          priority: 0.9,
        });

        // Add restaurants listing page
        sitemapEntries.push({
          url: `${baseUrl}/${omd.slug}/restaurants`,
          lastModified: omdLastModified,
          changeFrequency: 'daily',
          priority: 0.9,
        });

        // Add experiences listing page
        sitemapEntries.push({
          url: `${baseUrl}/${omd.slug}/experiences`,
          lastModified: omdLastModified,
          changeFrequency: 'daily',
          priority: 0.9,
        });

        // Get all active businesses
        const { data: businesses, error: businessesError } = await supabase
          .from('businesses')
          .select('id, slug, type, updated_at')
          .eq('omd_id', omd.id)
          .eq('status', 'active')
          .eq('is_published', true);

        if (!businessesError && businesses && businesses.length > 0) {
          // Add business detail pages
          for (const business of businesses) {
            const typePath = business.type === 'hotel' ? 'hotels' : business.type === 'restaurant' ? 'restaurants' : 'experiences';
            const businessLastModified = business.updated_at 
              ? new Date(business.updated_at)
              : new Date();
            
            sitemapEntries.push({
              url: `${baseUrl}/${omd.slug}/${typePath}/${business.slug}`,
              lastModified: businessLastModified,
              changeFrequency: 'weekly',
              priority: 0.8,
            });
          }
        }

        // Get all published landing pages
        const { data: landingPages, error: landingPagesError } = await supabase
          .from('landing_pages')
          .select('id, url_slug, updated_at')
          .eq('omd_id', omd.id)
          .eq('is_published', true);

        if (!landingPagesError && landingPages && landingPages.length > 0) {
          for (const page of landingPages) {
            const pageLastModified = page.updated_at 
              ? new Date(page.updated_at)
              : new Date();
            
            sitemapEntries.push({
              url: `${baseUrl}/${omd.slug}/labels/${page.url_slug}`,
              lastModified: pageLastModified,
              changeFrequency: 'weekly',
              priority: 0.7,
            });
          }
        }

        // Get all active auto top pages
        const { data: topPages, error: topPagesError } = await supabase
          .from('auto_top_pages')
          .select('id, url_slug, last_generated_at')
          .eq('omd_id', omd.id)
          .eq('is_active', true);

        if (!topPagesError && topPages && topPages.length > 0) {
          for (const page of topPages) {
            const pageLastModified = page.last_generated_at 
              ? new Date(page.last_generated_at)
              : new Date();
            
            sitemapEntries.push({
              url: `${baseUrl}/${omd.slug}/top/${page.url_slug}`,
              lastModified: pageLastModified,
              changeFrequency: 'daily',
              priority: 0.6,
            });
          }
        }
      }
  } catch (error) {
    console.error('Error generating sitemap:', error);
  }

  return sitemapEntries;
}

