import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Returns a list of OMDs that should appear in marketing carousels.
 * We treat an OMD as active unless settings explicitly disable it.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('omds')
      .select('id, name, slug, logo, colors, settings, created_at')
      .order('name');

    if (error) {
      console.error('Failed to load OMDs for homepage demo:', error);
      return NextResponse.json({ error: 'Unable to load destinations' }, { status: 500 });
    }

    const activeOmds =
      data?.filter((omd) => {
        const settings = (omd?.settings as Record<string, any> | null) ?? {};

        if ('is_active' in settings) {
          return Boolean(settings.is_active);
        }

        if ('status' in settings && typeof settings.status === 'string') {
          return settings.status !== 'inactive';
        }

        return true;
      }) ?? [];

    return NextResponse.json({ data: activeOmds });
  } catch (error) {
    console.error('Unexpected error when loading OMD list:', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}


