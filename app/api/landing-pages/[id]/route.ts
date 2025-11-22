import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';
import { validateRequest } from '@/lib/validation/validate';
import { z } from 'zod';

const updateLandingPageSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  meta_description: z.string().min(1, 'Meta description is required').optional(),
  header_text: z.string().min(1, 'Header text is required').optional(),
  url_slug: z.string().min(1, 'URL slug is required').optional(),
  intro_text: z.string().optional(),
  page_type: z.enum(['curated', 'auto_generated']).optional(),
  is_published: z.boolean().optional(),
  label_ids: z.array(z.string().uuid()).optional(),
  business_ids: z.array(z.string().uuid()).optional(),
});

/**
 * GET /api/landing-pages/[id]
 * Get a specific landing page
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

    // Public can read published pages
    const isAuthenticated = !!user;

    const { data: page, error } = await supabase
      .from('landing_pages')
      .select(`
        *,
        landing_page_labels (
          label_id,
          labels (
            id,
            name,
            description,
            category_id,
            label_categories (
              id,
              name
            )
          )
        ),
        landing_page_businesses (
          business_id,
          order_index,
          is_manually_added,
          businesses (
            id,
            name,
            slug,
            type,
            images
          )
        )
      `)
      .eq('id', params.id)
      .single();

    if (error) {
      log.error('Error fetching landing page', error);
      return NextResponse.json(
        { error: 'Landing page not found' },
        { status: 404 }
      );
    }

    // If not published, only OMD admins and super admins can view
    if (!page.is_published && isAuthenticated) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, omd_id')
        .eq('id', user!.id)
        .single();

      if (profile && (profile.role === 'omd_admin' || profile.role === 'super_admin')) {
        // Check OMD access for OMD admins
        if (profile.role === 'omd_admin' && profile.omd_id !== page.omd_id) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (!page.is_published) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ page });
  } catch (error) {
    log.error('Error in GET /api/landing-pages/[id]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/landing-pages/[id]
 * Update a landing page
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

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Only OMD admins and super admins can update
    if (profile.role !== 'omd_admin' && profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get existing page to check ownership
    const { data: existingPage } = await supabase
      .from('landing_pages')
      .select('omd_id, url_slug')
      .eq('id', params.id)
      .single();

    if (!existingPage) {
      return NextResponse.json(
        { error: 'Landing page not found' },
        { status: 404 }
      );
    }

    // Check OMD access for OMD admins
    if (profile.role === 'omd_admin' && profile.omd_id !== existingPage.omd_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate request body
    const validation = await validateRequest(req, updateLandingPageSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { label_ids, business_ids, ...pageData } = validation.data;

    // Check slug uniqueness if slug is being updated
    if (pageData.url_slug && pageData.url_slug !== existingPage.url_slug) {
      const { data: slugCheck } = await supabase
        .from('landing_pages')
        .select('id')
        .eq('omd_id', existingPage.omd_id)
        .eq('url_slug', pageData.url_slug)
        .neq('id', params.id)
        .single();

      if (slugCheck) {
        return NextResponse.json(
          { error: 'A landing page with this slug already exists' },
          { status: 400 }
        );
      }
    }

    // Update landing page
    const { data: page, error: pageError } = await supabase
      .from('landing_pages')
      .update(pageData)
      .eq('id', params.id)
      .select()
      .single();

    if (pageError) {
      log.error('Error updating landing page', pageError);
      return NextResponse.json(
        { error: 'Failed to update landing page' },
        { status: 500 }
      );
    }

    // Update labels if provided
    if (label_ids !== undefined) {
      // Delete existing labels
      await supabase
        .from('landing_page_labels')
        .delete()
        .eq('landing_page_id', params.id);

      // Insert new labels
      if (label_ids.length > 0) {
        const labelInserts = label_ids.map((label_id) => ({
          landing_page_id: params.id,
          label_id,
        }));

        const { error: labelsError } = await supabase
          .from('landing_page_labels')
          .insert(labelInserts);

        if (labelsError) {
          log.error('Error updating labels', labelsError);
        }
      }
    }

    // Update businesses if provided
    if (business_ids !== undefined) {
      // Delete existing businesses
      await supabase
        .from('landing_page_businesses')
        .delete()
        .eq('landing_page_id', params.id);

      // Insert new businesses
      if (business_ids.length > 0) {
        const businessInserts = business_ids.map((business_id, index) => ({
          landing_page_id: params.id,
          business_id,
          order_index: index,
          is_manually_added: true,
        }));

        const { error: businessesError } = await supabase
          .from('landing_page_businesses')
          .insert(businessInserts);

        if (businessesError) {
          log.error('Error updating businesses', businessesError);
        }
      }
    }

    log.info('Landing page updated', {
      page_id: params.id,
      user_id: user.id,
    });

    // Fetch the complete page with relations
    const { data: completePage } = await supabase
      .from('landing_pages')
      .select(`
        *,
        landing_page_labels (
          label_id,
          labels (
            id,
            name,
            description,
            category_id,
            label_categories (
              id,
              name
            )
          )
        ),
        landing_page_businesses (
          business_id,
          order_index,
          is_manually_added,
          businesses (
            id,
            name,
            slug,
            type,
            images
          )
        )
      `)
      .eq('id', params.id)
      .single();

    return NextResponse.json({ page: completePage });
  } catch (error) {
    log.error('Error in PUT /api/landing-pages/[id]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/landing-pages/[id]
 * Delete a landing page
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

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Only OMD admins and super admins can delete
    if (profile.role !== 'omd_admin' && profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get existing page to check ownership
    const { data: existingPage } = await supabase
      .from('landing_pages')
      .select('omd_id')
      .eq('id', params.id)
      .single();

    if (!existingPage) {
      return NextResponse.json(
        { error: 'Landing page not found' },
        { status: 404 }
      );
    }

    // Check OMD access for OMD admins
    if (profile.role === 'omd_admin' && profile.omd_id !== existingPage.omd_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete landing page (cascade will handle related records)
    const { error } = await supabase
      .from('landing_pages')
      .delete()
      .eq('id', params.id);

    if (error) {
      log.error('Error deleting landing page', error);
      return NextResponse.json(
        { error: 'Failed to delete landing page' },
        { status: 500 }
      );
    }

    log.info('Landing page deleted', {
      page_id: params.id,
      user_id: user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error('Error in DELETE /api/landing-pages/[id]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

