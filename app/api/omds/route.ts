import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';
import { rateLimitCheck } from '@/lib/middleware/rate-limit';

/**
 * Returns a list of OMDs that should appear in marketing carousels.
 * We treat an OMD as active unless settings explicitly disable it.
 * Includes hero section data (backgroundVideo, backgroundImage) for each OMD.
 */
export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimit = await rateLimitCheck(request, 'api');
  if (!rateLimit.success) {
    return rateLimit.response!;
  }
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('omds')
      .select('id, name, slug, logo, colors, settings, created_at, status')
      .order('name');

    if (error) {
      logger.error('Failed to load OMDs for homepage', error, {});
      return NextResponse.json({ error: 'Unable to load destinations' }, { status: 500 });
    }

    const activeOmds =
      data?.filter((omd) => {
        if (omd.status !== 'active') {
          return false;
        }

        const settings = (omd?.settings as Record<string, any> | null) ?? {};

        if ('is_active' in settings) {
          return Boolean(settings.is_active);
        }

        if ('status' in settings && typeof settings.status === 'string') {
          return settings.status !== 'inactive';
        }

        return true;
      }) ?? [];

    // Fetch hero sections for each OMD to get backgroundVideo and backgroundImage
    const omdsWithHeroData = await Promise.all(
      activeOmds.map(async (omd) => {
        const { data: heroSection } = await supabase
          .from('sections')
          .select('content')
          .eq('omd_id', omd.id)
          .eq('type', 'hero')
          .eq('is_visible', true)
          .single();

        const heroContent = (heroSection?.content as Record<string, any> | null) ?? {};
        
        return {
          ...omd,
          heroBackgroundVideo: heroContent.backgroundVideo || null,
          heroBackgroundImage: heroContent.backgroundImage || null,
        };
      })
    );

    return NextResponse.json({ data: omdsWithHeroData });
  } catch (error: unknown) {
    logger.error('Unexpected error when loading OMD list', error, {});
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}


