import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/businesses/[id]/landing-pages
 * Get all published landing pages where this business appears
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    // Get all landing pages where this business appears
    // Either manually added or auto-matched by labels
    const { data: manualPages } = await supabase
      .from('landing_page_businesses')
      .select(`
        landing_page_id,
        landing_pages!inner (
          id,
          title,
          url_slug,
          is_published
        )
      `)
      .eq('business_id', params.id)
      .eq('landing_pages.is_published', true);

    // Also check if business matches any landing page by labels
    // Get business labels
    const { data: businessLabels } = await supabase
      .from('business_labels')
      .select('label_id')
      .eq('business_id', params.id);

    let labelMatchedPages: any[] = [];

    if (businessLabels && businessLabels.length > 0) {
      const labelIds = businessLabels.map((bl: any) => bl.label_id);

      // Get landing pages with these labels
      const { data: landingPageLabels } = await supabase
        .from('landing_page_labels')
        .select(`
          landing_page_id,
          landing_pages!inner (
            id,
            title,
            url_slug,
            is_published
          )
        `)
        .in('label_id', labelIds)
        .eq('landing_pages.is_published', true);

      if (landingPageLabels) {
        // Group by landing_page_id and count matching labels
        const pageLabelCounts = new Map<string, number>();
        landingPageLabels.forEach((lpl: any) => {
          const count = pageLabelCounts.get(lpl.landing_page_id) || 0;
          pageLabelCounts.set(lpl.landing_page_id, count + 1);
        });

        // Get landing pages with their label counts
        const { data: pagesWithLabels } = await supabase
          .from('landing_page_labels')
          .select(`
            landing_page_id,
            landing_pages!inner (
              id,
              title,
              url_slug,
              is_published
            )
          `)
          .in('landing_page_id', Array.from(pageLabelCounts.keys()))
          .eq('landing_pages.is_published', true);

        if (pagesWithLabels) {
          // For each page, check if business has ALL its labels
          const pageLabelMap = new Map<string, string[]>();
          pagesWithLabels.forEach((lpl: any) => {
            const pageId = lpl.landing_page_id;
            if (!pageLabelMap.has(pageId)) {
              pageLabelMap.set(pageId, []);
            }
            // We need to get all labels for each page
          });

          // Get all labels for each landing page
          const uniquePageIds = Array.from(new Set(
            pagesWithLabels.map((lpl: any) => lpl.landing_page_id)
          ));

          for (const pageId of uniquePageIds) {
            const { data: pageLabels } = await supabase
              .from('landing_page_labels')
              .select('label_id')
              .eq('landing_page_id', pageId);

            if (pageLabels) {
              const pageLabelIds = pageLabels.map((pl: any) => pl.label_id);
              const businessLabelIds = labelIds;

              // Check if business has ALL labels for this page
              const hasAllLabels = pageLabelIds.every((lid: string) =>
                businessLabelIds.includes(lid)
              );

              if (hasAllLabels) {
                // Get the page details
                const pageData = pagesWithLabels.find(
                  (lpl: any) => lpl.landing_page_id === pageId
                );
                if (pageData && pageData.landing_pages) {
                  labelMatchedPages.push(pageData.landing_pages);
                }
              }
            }
          }
        }
      }
    }

    // Combine manual and label-matched pages, remove duplicates
    const allPages = [
      ...(manualPages?.map((mp: any) => mp.landing_pages).filter(Boolean) || []),
      ...labelMatchedPages,
    ];

    // Remove duplicates by id
    const uniquePages = Array.from(
      new Map(allPages.map((page: any) => [page.id, page])).values()
    );

    const pages = uniquePages.map((page: any) => ({
      id: page.id,
      title: page.title,
      url_slug: page.url_slug,
    }));

    return NextResponse.json({ pages });
  } catch (error: unknown) {
    log.error('Unexpected error fetching business landing pages', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

