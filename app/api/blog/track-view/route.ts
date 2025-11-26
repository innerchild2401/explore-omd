import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/blog/track-view
 * Track a blog post view
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId } = body;

    if (!postId || typeof postId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid postId' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get user info if authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Get IP address from request
    const forwarded = request.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0].trim() : null;

    // Insert view record
    const { error: viewError } = await supabase
      .from('blog_post_views')
      .insert({
        post_id: postId,
        user_id: user?.id || null,
        ip_address: ipAddress,
      });

    if (viewError) {
      console.error('Error inserting blog post view:', viewError);
      // Don't fail if view insert fails, but continue to update count
    }

    // Increment view count atomically
    const { error: countError } = await supabase.rpc('increment_blog_post_view_count', {
      p_post_id: postId,
    });

    // If RPC doesn't exist, fall back to manual increment
    if (countError && countError.message.includes('function') && countError.message.includes('does not exist')) {
      // Fallback: Get current count and increment
      const { data: post } = await supabase
        .from('blog_posts')
        .select('view_count')
        .eq('id', postId)
        .single();

      if (post) {
        const { error: updateError } = await supabase
          .from('blog_posts')
          .update({ view_count: (post.view_count || 0) + 1 })
          .eq('id', postId);

        if (updateError) {
          console.error('Error updating blog post view count:', updateError);
          return NextResponse.json(
            { error: 'Failed to update view count' },
            { status: 500 }
          );
        }
      }
    } else if (countError) {
      console.error('Error incrementing blog post view count:', countError);
      return NextResponse.json(
        { error: 'Failed to update view count' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in blog track-view endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

