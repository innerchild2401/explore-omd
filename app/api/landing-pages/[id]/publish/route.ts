import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';
import { validateRequest } from '@/lib/validation/validate';
import { z } from 'zod';

const publishSchema = z.object({
  is_published: z.boolean(),
});

/**
 * POST /api/landing-pages/[id]/publish
 * Publish or unpublish a landing page
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

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, omd_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Only OMD admins and super admins can publish
    if (profile.role !== 'omd_admin' && profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate request body
    const validation = await validateRequest(req, publishSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { is_published } = validation.data;

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

    // Update publish status
    const { data: page, error } = await supabase
      .from('landing_pages')
      .update({ is_published })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      log.error('Error updating publish status', error);
      return NextResponse.json(
        { error: 'Failed to update publish status' },
        { status: 500 }
      );
    }

    log.info('Landing page publish status updated', {
      page_id: params.id,
      is_published,
      user_id: user.id,
    });

    return NextResponse.json({ page });
  } catch (error) {
    log.error('Error in POST /api/landing-pages/[id]/publish', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

