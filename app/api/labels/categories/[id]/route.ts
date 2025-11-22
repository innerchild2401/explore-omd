import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';
import { validateRequest } from '@/lib/validation/validate';
import { z } from 'zod';
import { logLabelActivity, getClientIp, getUserAgent } from '@/lib/labels/activity-logger';

const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  order_index: z.number().int().optional(),
  is_active: z.boolean().optional(),
});

/**
 * GET /api/labels/categories/[id]
 * Get a specific label category
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
      .from('label_categories')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 });
      }
      log.error('Error fetching label category', error, { categoryId: params.id });
      return NextResponse.json(
        { error: 'Failed to fetch label category' },
        { status: 500 }
      );
    }

    return NextResponse.json({ category: data });
  } catch (error: unknown) {
    log.error('Unexpected error fetching label category', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/labels/categories/[id]
 * Update a label category (OMD admin only)
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
    const validation = await validateRequest(req, updateCategorySchema);

    if (!validation.success) {
      return validation.response;
    }

    // Check if category exists and user has permission
    const { data: category } = await supabase
      .from('label_categories')
      .select('*')
      .eq('id', params.id)
      .single();

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // OMD admins can only update their own OMD's categories
    if (profile.role === 'omd_admin' && category.omd_id !== profile.omd_id) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Update category
    const { data, error } = await supabase
      .from('label_categories')
      .update(validation.data)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A category with this name already exists' },
          { status: 409 }
        );
      }
      log.error('Error updating label category', error, { categoryId: params.id });
      return NextResponse.json(
        { error: 'Failed to update label category' },
        { status: 500 }
      );
    }

    // Log activity
    await logLabelActivity({
      actionType: 'category_updated',
      entityType: 'category',
      entityId: params.id,
      omdId: category.omd_id,
      userId: user.id,
      userRole: profile.role,
      categoryId: params.id,
      oldValues: category,
      newValues: data,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    log.info('Label category updated', {
      categoryId: params.id,
      userId: user.id,
      omdId: category.omd_id,
    });

    return NextResponse.json({ category: data });
  } catch (error: unknown) {
    log.error('Unexpected error updating label category', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/labels/categories/[id]
 * Delete a label category (OMD admin only)
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

    // Check if category exists and user has permission
    const { data: category } = await supabase
      .from('label_categories')
      .select('*')
      .eq('id', params.id)
      .single();

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // OMD admins can only delete their own OMD's categories
    if (profile.role === 'omd_admin' && category.omd_id !== profile.omd_id) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if category has labels (CASCADE will delete them, but warn user)
    const { count } = await supabase
      .from('labels')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', params.id);

    // Delete category (labels will be deleted via CASCADE)
    const { error } = await supabase
      .from('label_categories')
      .delete()
      .eq('id', params.id);

    if (error) {
      log.error('Error deleting label category', error, { categoryId: params.id });
      return NextResponse.json(
        { error: 'Failed to delete label category' },
        { status: 500 }
      );
    }

    // Log activity
    await logLabelActivity({
      actionType: 'category_deleted',
      entityType: 'category',
      entityId: params.id,
      omdId: category.omd_id,
      userId: user.id,
      userRole: profile.role,
      categoryId: params.id,
      oldValues: category,
      metadata: { labelsDeleted: count || 0 },
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    log.info('Label category deleted', {
      categoryId: params.id,
      categoryName: category.name,
      userId: user.id,
      omdId: category.omd_id,
      labelsDeleted: count || 0,
    });

    return NextResponse.json({
      success: true,
      message: `Category deleted${count && count > 0 ? ` along with ${count} label(s)` : ''}`,
    });
  } catch (error: unknown) {
    log.error('Unexpected error deleting label category', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

