import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';
import { validateRequest } from '@/lib/validation/validate';
import { z } from 'zod';

const addLabelsSchema = z.object({
  label_ids: z.array(z.string().uuid()).min(1, 'At least one label ID is required'),
});

/**
 * GET /api/businesses/[id]/labels
 * Get all labels for a business
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

    // Get business to verify ownership/permissions
    const { data: business } = await supabase
      .from('businesses')
      .select('id, owner_id, omd_id')
      .eq('id', params.id)
      .single();

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, omd_id')
      .eq('id', user.id)
      .single();

    // Check permissions: business owner, OMD admin, or super admin
    const isOwner = business.owner_id === user.id;
    const isOmdAdmin = profile?.role === 'omd_admin' && profile.omd_id === business.omd_id;
    const isSuperAdmin = profile?.role === 'super_admin';

    if (!isOwner && !isOmdAdmin && !isSuperAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get business labels
    const { data, error } = await supabase
      .from('business_labels')
      .select(`
        *,
        labels (
          id,
          name,
          description,
          display_name,
          is_omd_awarded_only,
          label_categories (
            id,
            name,
            description
          )
        )
      `)
      .eq('business_id', params.id)
      .order('created_at', { ascending: true });

    if (error) {
      log.error('Error fetching business labels', error, { businessId: params.id });
      return NextResponse.json(
        { error: 'Failed to fetch business labels' },
        { status: 500 }
      );
    }

    return NextResponse.json({ labels: data || [] });
  } catch (error: unknown) {
    log.error('Unexpected error fetching business labels', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/businesses/[id]/labels
 * Add labels to a business
 */
export async function POST(
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

    // Get business
    const { data: business } = await supabase
      .from('businesses')
      .select('id, owner_id, omd_id, type')
      .eq('id', params.id)
      .single();

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, omd_id')
      .eq('id', user.id)
      .single();

    // Validate request body
    const body = await req.json();
    const validation = await validateRequest(body, addLabelsSchema);

    if (!validation.success) {
      return validation.response;
    }

    const { label_ids } = validation.data;

    // Verify all labels exist and check permissions
    const { data: labels } = await supabase
      .from('labels')
      .select('id, is_omd_awarded_only, business_types, omd_id')
      .in('id', label_ids);

    if (!labels || labels.length !== label_ids.length) {
      return NextResponse.json(
        { error: 'One or more labels not found' },
        { status: 404 }
      );
    }

    // Check if business owner is trying to select OMD-awarded-only labels
    const isOwner = business.owner_id === user.id;
    const isOmdAdmin = profile?.role === 'omd_admin' && profile.omd_id === business.omd_id;
    const isSuperAdmin = profile?.role === 'super_admin';

    if (isOwner) {
      const omdAwardedLabels = labels.filter(l => l.is_omd_awarded_only);
      if (omdAwardedLabels.length > 0) {
        return NextResponse.json(
          {
            error: 'Cannot select OMD-awarded-only labels',
            omd_awarded_labels: omdAwardedLabels.map(l => l.id),
          },
          { status: 403 }
        );
      }

      // Check if labels are available for this business type
      const invalidLabels = labels.filter(
        l => l.business_types.length > 0 && !l.business_types.includes(business.type)
      );
      if (invalidLabels.length > 0) {
        return NextResponse.json(
          {
            error: 'Some labels are not available for this business type',
            invalid_labels: invalidLabels.map(l => l.id),
          },
          { status: 400 }
        );
      }
    }

    // Check permissions
    if (!isOwner && !isOmdAdmin && !isSuperAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if labels belong to the same OMD
    const invalidOmdLabels = labels.filter(l => l.omd_id !== business.omd_id);
    if (invalidOmdLabels.length > 0) {
      return NextResponse.json(
        {
          error: 'Some labels belong to a different OMD',
          invalid_labels: invalidOmdLabels.map(l => l.id),
        },
        { status: 400 }
      );
    }

    // Prepare insert data
    const insertData = label_ids.map(labelId => ({
      business_id: params.id,
      label_id: labelId,
      assigned_by: user.id,
      is_omd_awarded: !isOwner, // If OMD admin assigns, it's OMD-awarded
    }));

    // Insert business labels (ignore conflicts - label already assigned)
    const { data, error } = await supabase
      .from('business_labels')
      .upsert(insertData, {
        onConflict: 'business_id,label_id',
        ignoreDuplicates: false,
      })
      .select(`
        *,
        labels (
          id,
          name,
          description,
          display_name,
          is_omd_awarded_only,
          label_categories (
            id,
            name,
            description
          )
        )
      `);

    if (error) {
      log.error('Error adding labels to business', error, {
        businessId: params.id,
        labelIds: label_ids,
      });
      return NextResponse.json(
        { error: 'Failed to add labels to business' },
        { status: 500 }
      );
    }

    return NextResponse.json({ labels: data || [] }, { status: 201 });
  } catch (error: unknown) {
    log.error('Unexpected error adding labels to business', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/businesses/[id]/labels
 * Remove labels from a business
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

    // Get business
    const { data: business } = await supabase
      .from('businesses')
      .select('id, owner_id, omd_id')
      .eq('id', params.id)
      .single();

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, omd_id')
      .eq('id', user.id)
      .single();

    const { searchParams } = new URL(req.url);
    const labelId = searchParams.get('label_id');

    if (!labelId) {
      return NextResponse.json(
        { error: 'label_id query parameter is required' },
        { status: 400 }
      );
    }

    // Check permissions
    const isOwner = business.owner_id === user.id;
    const isOmdAdmin = profile?.role === 'omd_admin' && profile.omd_id === business.omd_id;
    const isSuperAdmin = profile?.role === 'super_admin';

    if (!isOwner && !isOmdAdmin && !isSuperAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // If business owner, check if they can remove it (can't remove OMD-awarded labels)
    if (isOwner) {
      const { data: businessLabel } = await supabase
        .from('business_labels')
        .select('is_omd_awarded')
        .eq('business_id', params.id)
        .eq('label_id', labelId)
        .single();

      if (businessLabel?.is_omd_awarded) {
        return NextResponse.json(
          { error: 'Cannot remove OMD-awarded labels' },
          { status: 403 }
        );
      }
    }

    // Delete business label
    const { error } = await supabase
      .from('business_labels')
      .delete()
      .eq('business_id', params.id)
      .eq('label_id', labelId);

    if (error) {
      log.error('Error removing label from business', error, {
        businessId: params.id,
        labelId,
      });
      return NextResponse.json(
        { error: 'Failed to remove label from business' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Label removed from business' });
  } catch (error: unknown) {
    log.error('Unexpected error removing label from business', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

