import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auto-top-pages
 * Get all auto-generated top pages for the authenticated user's OMD
 */
export async function GET(req: NextRequest) {
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

    // Get OMD ID from query params or use user's OMD
    const { searchParams } = new URL(req.url);
    const omdId = searchParams.get('omd_id') || profile.omd_id;

    if (!omdId) {
      return NextResponse.json({ error: 'OMD ID is required' }, { status: 400 });
    }

    // Super admins can view any OMD, OMD admins only their own
    if (profile.role === 'omd_admin' && profile.omd_id !== omdId) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get all pages for this OMD
    const { data: pages, error } = await supabase
      .from('auto_top_pages')
      .select('*')
      .eq('omd_id', omdId)
      .order('business_type', { ascending: true })
      .order('page_type', { ascending: true });

    if (error) {
      log.error('Error fetching auto top pages', error, { omdId });
      return NextResponse.json(
        { error: 'Failed to fetch pages' },
        { status: 500 }
      );
    }

    return NextResponse.json({ pages: pages || [] });
  } catch (error: unknown) {
    log.error('Unexpected error fetching auto top pages', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

