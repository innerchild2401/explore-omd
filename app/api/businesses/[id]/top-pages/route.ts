import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/businesses/[id]/top-pages
 * Get all top pages where this business appears
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    // Get all top pages where this business appears
    const { data: content, error } = await supabase
      .from('auto_top_page_content')
      .select(`
        auto_top_page_id,
        rank,
        auto_top_pages (
          id,
          page_type,
          business_type,
          time_period,
          url_slug,
          title_template,
          is_active
        )
      `)
      .eq('business_id', params.id)
      .eq('auto_top_pages.is_active', true)
      .order('rank', { ascending: true });

    if (error) {
      log.error('Error fetching business top pages', error, { businessId: params.id });
      return NextResponse.json(
        { error: 'Failed to fetch top pages' },
        { status: 500 }
      );
    }

    const pages = (content || [])
      .map((c: any) => c.auto_top_pages)
      .filter(Boolean)
      .map((page: any) => ({
        page_type: page.page_type,
        business_type: page.business_type,
        time_period: page.time_period,
        url_slug: page.url_slug,
        title_template: page.title_template,
      }));

    return NextResponse.json({ pages });
  } catch (error: unknown) {
    log.error('Unexpected error fetching business top pages', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

