import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';
import { validateRequest } from '@/lib/validation/validate';
import { z } from 'zod';

const landingPageSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  meta_description: z.string().min(1, 'Meta description is required'),
  header_text: z.string().min(1, 'Header text is required'),
  url_slug: z.string().min(1, 'URL slug is required'),
  intro_text: z.string().optional(),
  page_type: z.enum(['curated', 'auto_generated']).default('curated'),
  is_published: z.boolean().default(false),
  label_ids: z.array(z.string().uuid()).default([]),
  business_ids: z.array(z.string().uuid()).optional(),
});

/**
 * GET /api/landing-pages
 * Get all landing pages for the OMD
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

    const { searchParams } = new URL(req.url);
    const publishedOnly = searchParams.get('published_only') === 'true';

    // Build query
    let query = supabase
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
      .order('created_at', { ascending: false });

    // Filter by OMD (unless super admin)
    if (profile.role === 'omd_admin' && profile.omd_id) {
      query = query.eq('omd_id', profile.omd_id);
    }

    // Filter by published status
    if (publishedOnly) {
      query = query.eq('is_published', true);
    }

    const { data: pages, error } = await query;

    if (error) {
      log.error('Error fetching landing pages', error);
      return NextResponse.json(
        { error: 'Failed to fetch landing pages' },
        { status: 500 }
      );
    }

    log.info('Landing pages fetched', {
      count: pages?.length || 0,
      omd_id: profile.omd_id,
      role: profile.role,
    });

    return NextResponse.json({ pages: pages || [] });
  } catch (error) {
    log.error('Error in GET /api/landing-pages', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/landing-pages
 * Create a new landing page
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

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Only OMD admins and super admins can create
    if (profile.role !== 'omd_admin' && profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate request body
    const validation = await validateRequest(req, landingPageSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { label_ids, business_ids, ...pageData } = validation.data;

    // Ensure omd_id is set (for OMD admins)
    if (profile.role === 'omd_admin' && !profile.omd_id) {
      return NextResponse.json(
        { error: 'OMD ID is required' },
        { status: 400 }
      );
    }

    // For super admins, omd_id should be in the request
    const omd_id = profile.role === 'super_admin' 
      ? (pageData as any).omd_id || profile.omd_id
      : profile.omd_id;

    if (!omd_id) {
      return NextResponse.json(
        { error: 'OMD ID is required' },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const { data: existingPage } = await supabase
      .from('landing_pages')
      .select('id')
      .eq('omd_id', omd_id)
      .eq('url_slug', pageData.url_slug)
      .single();

    if (existingPage) {
      return NextResponse.json(
        { error: 'A landing page with this slug already exists' },
        { status: 400 }
      );
    }

    // Create landing page
    const { data: page, error: pageError } = await supabase
      .from('landing_pages')
      .insert({
        ...pageData,
        omd_id,
        created_by: user.id,
      })
      .select()
      .single();

    if (pageError) {
      log.error('Error creating landing page', pageError);
      return NextResponse.json(
        { error: 'Failed to create landing page' },
        { status: 500 }
      );
    }

    // Add labels if provided
    if (label_ids && label_ids.length > 0) {
      const labelInserts = label_ids.map((label_id) => ({
        landing_page_id: page.id,
        label_id,
      }));

      const { error: labelsError } = await supabase
        .from('landing_page_labels')
        .insert(labelInserts);

      if (labelsError) {
        log.error('Error adding labels to landing page', labelsError);
        // Continue anyway - labels can be added later
      }
    }

    // Add businesses if provided
    if (business_ids && business_ids.length > 0) {
      const businessInserts = business_ids.map((business_id, index) => ({
        landing_page_id: page.id,
        business_id,
        order_index: index,
        is_manually_added: true,
      }));

      const { error: businessesError } = await supabase
        .from('landing_page_businesses')
        .insert(businessInserts);

      if (businessesError) {
        log.error('Error adding businesses to landing page', businessesError);
        // Continue anyway - businesses can be added later
      }
    }

    log.info('Landing page created', {
      page_id: page.id,
      slug: page.url_slug,
      omd_id,
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
      .eq('id', page.id)
      .single();

    return NextResponse.json({ page: completePage }, { status: 201 });
  } catch (error) {
    log.error('Error in POST /api/landing-pages', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

