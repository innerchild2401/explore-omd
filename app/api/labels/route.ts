import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';
import { validateRequest } from '@/lib/validation/validate';
import { z } from 'zod';
import { logLabelActivity, getClientIp, getUserAgent } from '@/lib/labels/activity-logger';

const labelSchema = z.object({
  category_id: z.string().uuid('Invalid category ID'),
  name: z.string().min(1, 'Label name is required'),
  description: z.string().optional(),
  display_name: z.string().optional(),
  business_types: z.array(z.enum(['hotel', 'restaurant', 'experience'])).default([]),
  is_omd_awarded_only: z.boolean().default(false),
  order_index: z.number().int().default(0),
  is_active: z.boolean().default(true),
});

/**
 * GET /api/labels
 * Get all labels (filtered by business type if business owner)
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

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('category_id');
    const businessType = searchParams.get('business_type');

    // Build query
    let query = supabase
      .from('labels')
      .select(`
        *,
        label_categories (
          id,
          name,
          description
        )
      `)
      .order('order_index', { ascending: true });

    // Filter by OMD (unless super admin)
    if (profile.role === 'omd_admin' && profile.omd_id) {
      query = query.eq('omd_id', profile.omd_id);
    } else if (profile.role !== 'super_admin') {
      // Business owners see labels from their OMD
      const { data: business } = await supabase
        .from('businesses')
        .select('omd_id')
        .eq('owner_id', user.id)
        .limit(1)
        .single();

      if (business?.omd_id) {
        query = query.eq('omd_id', business.omd_id);
      } else {
        return NextResponse.json({ labels: [] });
      }
    }

    // Filter by category if provided
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    // Filter by business type if provided (for business owners)
    if (businessType && ['hotel', 'restaurant', 'experience'].includes(businessType)) {
      // Show labels that are for all types OR specifically for this business type
      query = query.or(`business_types.cs.{${businessType}},business_types.eq.{}`);
    }

    const { data, error } = await query;

    if (error) {
      log.error('Error fetching labels', error, { userId: user.id });
      return NextResponse.json(
        { error: 'Failed to fetch labels' },
        { status: 500 }
      );
    }

    return NextResponse.json({ labels: data || [] });
  } catch (error: unknown) {
    log.error('Unexpected error fetching labels', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/labels
 * Create a new label (OMD admin only)
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

    // Validate request body
    const validation = await validateRequest(req, labelSchema);

    if (!validation.success) {
      return validation.response;
    }

    const {
      category_id,
      name,
      description,
      display_name,
      business_types,
      is_omd_awarded_only,
      order_index,
      is_active,
    } = validation.data;

    // Verify category exists and get OMD ID
    const { data: category } = await supabase
      .from('label_categories')
      .select('omd_id')
      .eq('id', category_id)
      .single();

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // OMD admins can only create labels in their OMD's categories
    if (profile.role === 'omd_admin' && category.omd_id !== profile.omd_id) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Create label
    const { data, error } = await supabase
      .from('labels')
      .insert({
        category_id,
        omd_id: category.omd_id,
        name,
        description: description || null,
        display_name: display_name || null,
        business_types: business_types && business_types.length > 0 ? business_types : [],
        is_omd_awarded_only: is_omd_awarded_only || false,
        order_index: order_index || 0,
        is_active: is_active !== false,
      })
      .select(`
        *,
        label_categories (
          id,
          name,
          description
        )
      `)
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A label with this name already exists in this category' },
          { status: 409 }
        );
      }
      log.error('Error creating label', error, { userId: user.id, categoryId: category_id });
      return NextResponse.json(
        { error: 'Failed to create label' },
        { status: 500 }
      );
    }

    // Log activity
    await logLabelActivity({
      actionType: 'label_created',
      entityType: 'label',
      entityId: data.id,
      omdId: category.omd_id,
      userId: user.id,
      userRole: profile.role,
      labelId: data.id,
      categoryId: category_id,
      newValues: data,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    log.info('Label created', {
      labelId: data.id,
      labelName: data.name,
      categoryId: category_id,
      userId: user.id,
      omdId: category.omd_id,
    });

    return NextResponse.json({ label: data }, { status: 201 });
  } catch (error: unknown) {
    log.error('Unexpected error creating label', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

