import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';
import { generatePageContent } from '@/lib/services/auto-top-pages-generator';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auto-top-pages/regenerate-all
 * Manually regenerate all auto-generated top pages for an OMD
 * 
 * This endpoint is called from the OMD admin dashboard
 * "Regenerate All" button
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, omd_id')
      .eq('id', user.id)
      .single();

    if (!profile || !['omd_admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get OMD ID from request body or use user's OMD
    const body = await req.json().catch(() => ({}));
    const omdId = body.omd_id || profile.omd_id;

    if (!omdId) {
      return NextResponse.json({ error: 'OMD ID is required' }, { status: 400 });
    }

    // Super admins can regenerate for any OMD, OMD admins only their own
    if (profile.role === 'omd_admin' && profile.omd_id !== omdId) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get all active pages for this OMD
    const { data: pages, error: pagesError } = await supabase
      .from('auto_top_pages')
      .select('id, page_type, business_type, time_period')
      .eq('omd_id', omdId)
      .eq('is_active', true);

    if (pagesError) {
      log.error('Error fetching auto top pages', pagesError, { omdId });
      return NextResponse.json(
        { error: 'Failed to fetch pages' },
        { status: 500 }
      );
    }

    if (!pages || pages.length === 0) {
      // Initialize pages if they don't exist
      const { error: initError } = await supabase.rpc('initialize_auto_top_pages_for_omd', {
        p_omd_id: omdId,
      });

      if (initError) {
        log.error('Error initializing pages', initError, { omdId });
        return NextResponse.json(
          { error: 'Failed to initialize pages' },
          { status: 500 }
        );
      }

      // Fetch again after initialization
      const { data: newPages } = await supabase
        .from('auto_top_pages')
        .select('id, page_type, business_type, time_period')
        .eq('omd_id', omdId)
        .eq('is_active', true);

      if (!newPages || newPages.length === 0) {
        return NextResponse.json(
          { error: 'No pages to regenerate' },
          { status: 404 }
        );
      }

      pages.push(...newPages);
    }

    log.info('Starting regeneration of auto top pages', {
      omdId,
      pageCount: pages.length,
      userId: user.id,
    });

    // Regenerate each page
    const results = await Promise.allSettled(
      pages.map((page) => generatePageContent(page.id, omdId))
    );

    const successful = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    log.info('Completed regeneration of auto top pages', {
      omdId,
      total: pages.length,
      successful,
      failed,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: `Regenerated ${successful} of ${pages.length} pages`,
      total: pages.length,
      successful,
      failed,
    });
  } catch (error: unknown) {
    log.error('Unexpected error regenerating auto top pages', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

