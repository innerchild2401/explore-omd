import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';
import { rateLimitCheck } from '@/lib/middleware/rate-limit';
import { validateRequest } from '@/lib/validation/validate';
import { adminActiveOmdSchema } from '@/lib/validation/schemas';
import { isProduction } from '@/lib/env';

const COOKIE_NAME = 'admin-active-omd';
const COOKIE_PATH = '/';

function createCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isProduction,
    path: COOKIE_PATH,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  };
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimit = await rateLimitCheck(request, 'admin');
  if (!rateLimit.success) {
    return rateLimit.response!;
  }
  try {
    // Validate request body
    const validation = await validateRequest(request, adminActiveOmdSchema);
    if (!validation.success) {
      return validation.response;
    }
    const { omdId } = validation.data;

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: omd, error: omdError } = await supabase
      .from('omds')
      .select('id')
      .eq('id', omdId)
      .single();

    if (omdError || !omd) {
      return NextResponse.json({ error: 'OMD not found' }, { status: 404 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(COOKIE_NAME, omdId, createCookieOptions());
    return response;
  } catch (error: unknown) {
    log.error('Failed to set active OMD', error, {});
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  // Rate limiting
  const rateLimit = await rateLimitCheck(request, 'admin');
  if (!rateLimit.success) {
    return rateLimit.response!;
  }
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(COOKIE_NAME, '', { ...createCookieOptions(), maxAge: 0 });
    return response;
  } catch (error: unknown) {
    log.error('Failed to clear active OMD', error, {});
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}







