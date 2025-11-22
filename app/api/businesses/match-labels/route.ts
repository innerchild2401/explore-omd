import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';
import { validateQuery } from '@/lib/validation/validate';
import { z } from 'zod';

const matchLabelsSchema = z.object({
  omd_id: z.string().uuid('Invalid OMD ID'),
  label_ids: z.string(),
});

/**
 * GET /api/businesses/match-labels?omd_id=...&label_ids=id1,id2,id3
 * Get businesses that have ALL the specified labels
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

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Only OMD admins and super admins can access
    if (profile.role !== 'omd_admin' && profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate query parameters
    const validation = validateQuery(req, matchLabelsSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { omd_id, label_ids: labelIdsStr } = validation.data;
    const label_ids = labelIdsStr.split(',').filter(Boolean);

    // Check OMD access for OMD admins
    if (profile.role === 'omd_admin' && profile.omd_id !== omd_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (label_ids.length === 0) {
      return NextResponse.json({ businesses: [] });
    }

    // Find businesses that have ALL the specified labels
    // We need to find businesses where the count of matching labels equals the number of label_ids
    const { data: businessLabels, error: labelsError } = await supabase
      .from('business_labels')
      .select('business_id, label_id')
      .in('label_id', label_ids);

    if (labelsError) {
      log.error('Error fetching business labels', labelsError);
      return NextResponse.json(
        { error: 'Failed to fetch matching businesses' },
        { status: 500 }
      );
    }

    // Group by business_id and count matching labels
    const businessLabelCounts = new Map<string, number>();
    businessLabels?.forEach((bl) => {
      const count = businessLabelCounts.get(bl.business_id) || 0;
      businessLabelCounts.set(bl.business_id, count + 1);
    });

    // Find businesses that have ALL labels (count === label_ids.length)
    const matchingBusinessIds = Array.from(businessLabelCounts.entries())
      .filter(([_, count]) => count === label_ids.length)
      .map(([business_id]) => business_id);

    if (matchingBusinessIds.length === 0) {
      return NextResponse.json({ businesses: [] });
    }

    // Fetch the businesses
    const { data: businesses, error: businessesError } = await supabase
      .from('businesses')
      .select('id, name, slug, type, images, rating, status')
      .eq('omd_id', omd_id)
      .eq('status', 'active')
      .in('id', matchingBusinessIds)
      .order('rating', { ascending: false, nullsFirst: false })
      .order('name', { ascending: true });

    if (businessesError) {
      log.error('Error fetching businesses', businessesError);
      return NextResponse.json(
        { error: 'Failed to fetch businesses' },
        { status: 500 }
      );
    }

    log.info('Businesses matched by labels', {
      omd_id,
      label_count: label_ids.length,
      business_count: businesses?.length || 0,
    });

    return NextResponse.json({ businesses: businesses || [] });
  } catch (error) {
    log.error('Error in GET /api/businesses/match-labels', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

