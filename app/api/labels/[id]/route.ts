import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';
import { validateRequest } from '@/lib/validation/validate';
import { z } from 'zod';

const updateLabelSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  display_name: z.string().optional(),
  business_types: z.array(z.enum(['hotel', 'restaurant', 'experience'])).optional(),
  is_omd_awarded_only: z.boolean().optional(),
  order_index: z.number().int().optional(),
  is_active: z.boolean().optional(),
});

/**
 * GET /api/labels/[id]
 * Get a specific label
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('labels')
      .select(`
        *,
        label_categories (
          id,
          name,
          description
        )
      `)
      .eq('id', params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Label not found' }, { status: 404 });
      }
      log.error('Error fetching label', error, { labelId: params.id });
      return NextResponse.json(
        { error: 'Failed to fetch label' },
        { status: 500 }
      );
    }

    return NextResponse.json({ label: data });
  } catch (error: unknown) {
    log.error('Unexpected error fetching label', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/labels/[id]
 * Update a label (OMD admin only)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const validation = await validateRequest(req, updateLabelSchema);

    if (!validation.success) {
      return validation.response;
    }

    // Check if label exists and user has permission
    const { data: label } = await supabase
      .from('labels')
      .select('omd_id')
      .eq('id', params.id)
      .single();

    if (!label) {
      return NextResponse.json({ error: 'Label not found' }, { status: 404 });
    }

    // OMD admins can only update their own OMD's labels
    if (profile.role === 'omd_admin' && label.omd_id !== profile.omd_id) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Update label
    const { data, error } = await supabase
      .from('labels')
      .update(validation.data)
      .eq('id', params.id)
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
      log.error('Error updating label', error, { labelId: params.id });
      return NextResponse.json(
        { error: 'Failed to update label' },
        { status: 500 }
      );
    }

    return NextResponse.json({ label: data });
  } catch (error: unknown) {
    log.error('Unexpected error updating label', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/labels/[id]
 * Delete a label (OMD admin only)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check if label exists and user has permission
    const { data: label } = await supabase
      .from('labels')
      .select('omd_id')
      .eq('id', params.id)
      .single();

    if (!label) {
      return NextResponse.json({ error: 'Label not found' }, { status: 404 });
    }

    // OMD admins can only delete their own OMD's labels
    if (profile.role === 'omd_admin' && label.omd_id !== profile.omd_id) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if label is used by businesses
    const { count } = await supabase
      .from('business_labels')
      .select('*', { count: 'exact', head: true })
      .eq('label_id', params.id);

    // Delete label (business_labels will be deleted via CASCADE)
    const { error } = await supabase
      .from('labels')
      .delete()
      .eq('id', params.id);

    if (error) {
      log.error('Error deleting label', error, { labelId: params.id });
      return NextResponse.json(
        { error: 'Failed to delete label' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Label deleted${count && count > 0 ? ` (removed from ${count} business/businesses)` : ''}`,
    });
  } catch (error: unknown) {
    log.error('Unexpected error deleting label', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

