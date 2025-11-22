import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/businesses
 * Get all businesses for the authenticated user's OMD
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to determine OMD
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, omd_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Build query
    let query = supabase
      .from('businesses')
      .select('id, name, type, slug, status')
      .order('name', { ascending: true });

    // Filter by OMD (unless super admin)
    if (profile.role === 'omd_admin' && profile.omd_id) {
      query = query.eq('omd_id', profile.omd_id);
    } else if (profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Super admin can filter by omd_id query param
    if (profile.role === 'super_admin') {
      const { searchParams } = new URL(req.url);
      const omdId = searchParams.get('omd_id');
      if (omdId) {
        query = query.eq('omd_id', omdId);
      }
    }

    const { data, error } = await query;

    if (error) {
      log.error('Error fetching businesses', error, { userId: user.id });
      return NextResponse.json(
        { error: 'Failed to fetch businesses' },
        { status: 500 }
      );
    }

    return NextResponse.json({ businesses: data || [] });
  } catch (error: unknown) {
    log.error('Unexpected error fetching businesses', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

