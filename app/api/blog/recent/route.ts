import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const revalidate = 60;

export async function GET() {
  const supabase = await createClient();

  // Fetch recent published posts (max 6)
  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('id, title, subtitle, slug, excerpt, featured_image, featured_image_alt, published_at, reading_time')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(6);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ posts: posts || [] });
}


