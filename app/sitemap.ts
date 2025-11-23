import { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getBaseUrl } from '@/lib/seo/utils';

export const revalidate = 3600; // Revalidate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();
  const supabase = await createClient();

  const sitemapEntries: MetadataRoute.Sitemap = [];

  try {
    // Get all active OMDs
    const { data: omds } = await supabase
      .from('omds')
      .select('id, slug, updated_at')
      .eq('status', 'active');

    if (!omds) {
      return sitemapEntries;
    }

    // Add OMD home pages
    for (const omd of omds) {
      sitemapEntries.push({
        url: `${baseUrl}/${omd.slug}`,
        lastModified: omd.updated_at ? new Date(omd.updated_at) : new Date(),
        changeFrequency: 'daily',
        priority: 1.0,
      });

      // Add explore page
      sitemapEntries.push({
        url: `${baseUrl}/${omd.slug}/explore`,
        lastModified: omd.updated_at ? new Date(omd.updated_at) : new Date(),
        changeFrequency: 'daily',
        priority: 0.9,
      });

      // Add hotels listing page
      sitemapEntries.push({
        url: `${baseUrl}/${omd.slug}/hotels`,
        lastModified: omd.updated_at ? new Date(omd.updated_at) : new Date(),
        changeFrequency: 'daily',
        priority: 0.9,
      });

      // Add restaurants listing page
      sitemapEntries.push({
        url: `${baseUrl}/${omd.slug}/restaurants`,
        lastModified: omd.updated_at ? new Date(omd.updated_at) : new Date(),
        changeFrequency: 'daily',
        priority: 0.9,
      });

      // Add experiences listing page
      sitemapEntries.push({
        url: `${baseUrl}/${omd.slug}/experiences`,
        lastModified: omd.updated_at ? new Date(omd.updated_at) : new Date(),
        changeFrequency: 'daily',
        priority: 0.9,
      });

      // Get all active businesses
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id, slug, type, updated_at')
        .eq('omd_id', omd.id)
        .eq('status', 'active')
        .eq('is_published', true);

      if (businesses) {
        // Add business detail pages
        for (const business of businesses) {
          const typePath = business.type === 'hotel' ? 'hotels' : business.type === 'restaurant' ? 'restaurants' : 'experiences';
          sitemapEntries.push({
            url: `${baseUrl}/${omd.slug}/${typePath}/${business.slug}`,
            lastModified: business.updated_at ? new Date(business.updated_at) : new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
          });
        }
      }

      // Get all published landing pages
      const { data: landingPages } = await supabase
        .from('landing_pages')
        .select('id, url_slug, updated_at')
        .eq('omd_id', omd.id)
        .eq('is_published', true);

      if (landingPages) {
        for (const page of landingPages) {
          sitemapEntries.push({
            url: `${baseUrl}/${omd.slug}/labels/${page.url_slug}`,
            lastModified: page.updated_at ? new Date(page.updated_at) : new Date(),
            changeFrequency: 'weekly',
            priority: 0.7,
          });
        }
      }

      // Get all active auto top pages
      const { data: topPages } = await supabase
        .from('auto_top_pages')
        .select('id, url_slug, last_generated_at')
        .eq('omd_id', omd.id)
        .eq('is_active', true);

      if (topPages) {
        for (const page of topPages) {
          sitemapEntries.push({
            url: `${baseUrl}/${omd.slug}/top/${page.url_slug}`,
            lastModified: page.last_generated_at ? new Date(page.last_generated_at) : new Date(),
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

