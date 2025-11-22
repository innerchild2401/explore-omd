import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';
import { validateRequest } from '@/lib/validation/validate';
import { z } from 'zod';

const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
  order_index: z.number().int().default(0),
  is_active: z.boolean().default(true),
});

/**
 * GET /api/labels/categories
 * Get all label categories for the authenticated user's OMD
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

    // Super admins can see all categories, OMD admins see their OMD's categories
    let query = supabase
      .from('label_categories')
      .select('*')
      .order('order_index', { ascending: true });

    if (profile.role === 'omd_admin' && profile.omd_id) {
      query = query.eq('omd_id', profile.omd_id);
    } else if (profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { data, error } = await query;

    if (error) {
      log.error('Error fetching label categories', error, { userId: user.id });
      return NextResponse.json(
        { error: 'Failed to fetch label categories' },
        { status: 500 }
      );
    }

    return NextResponse.json({ categories: data || [] });
  } catch (error: unknown) {
    log.error('Unexpected error fetching label categories', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/labels/categories
 * Create a new label category (OMD admin only)
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
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
    const validation = await validateRequest(req, categorySchema);

    if (!validation.success) {
      return validation.response;
    }

    const { name, description, order_index, is_active } = validation.data;

    // Determine OMD ID
    let omdId: string | null = null;
    if (profile.role === 'omd_admin') {
      omdId = profile.omd_id;
    } else if (profile.role === 'super_admin') {
      // Super admin needs to specify omd_id in request
      const body = await req.json();
      if (!body.omd_id) {
        return NextResponse.json(
          { error: 'omd_id is required for super admin' },
          { status: 400 }
        );
      }
      omdId = body.omd_id;
    }

    if (!omdId) {
      return NextResponse.json(
        { error: 'OMD ID is required' },
        { status: 400 }
      );
    }

    // Create category
    const { data, error } = await supabase
      .from('label_categories')
      .insert({
        omd_id: omdId,
        name,
        description: description || null,
        order_index: order_index || 0,
        is_active: is_active !== false,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        // Unique constraint violation
        return NextResponse.json(
          { error: 'A category with this name already exists' },
          { status: 409 }
        );
      }
      log.error('Error creating label category', error, { userId: user.id, omdId });
      return NextResponse.json(
        { error: 'Failed to create label category' },
        { status: 500 }
      );
    }

    return NextResponse.json({ category: data }, { status: 201 });
  } catch (error: unknown) {
    log.error('Unexpected error creating label category', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

