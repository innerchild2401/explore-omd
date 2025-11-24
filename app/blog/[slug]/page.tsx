import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { getImageUrl } from '@/lib/utils';
import OptimizedImage from '@/components/ui/OptimizedImage';
import ContentBlockRenderer from '@/components/blog/ContentBlockRenderer';
import type { BlogPost } from '@/types';

export const revalidate = 60;

interface PageProps {
  params: {
    slug: string;
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = params;
  const supabase = await createClient();

  // Fetch the post
  const { data: post } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (!post) {
    notFound();
  }

  // Increment view count (fire and forget)
  void (async () => {
    try {
      await supabase.from('blog_post_views').insert({ post_id: post.id });
      await supabase
        .from('blog_posts')
        .update({ view_count: (post.view_count || 0) + 1 })
        .eq('id', post.id);
    } catch {
      // Silently fail
    }
  })();

  const blogPost = post as BlogPost;

  return (
    <main className="min-h-screen bg-white">
      <article className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-4">
            {blogPost.title}
          </h1>
          {blogPost.subtitle && (
            <p className="text-2xl text-gray-600 leading-relaxed mb-6">
              {blogPost.subtitle}
            </p>
          )}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            {blogPost.published_at && (
              <span>
                {format(new Date(blogPost.published_at), 'd MMMM yyyy')}
              </span>
            )}
            {blogPost.reading_time && (
              <span>{blogPost.reading_time} min citire</span>
            )}
          </div>
        </header>

        {/* Featured Image */}
        {blogPost.featured_image && (
          <div className="mb-8 -mx-6">
            <OptimizedImage
              src={getImageUrl(blogPost.featured_image)}
              alt={blogPost.featured_image_alt || blogPost.title}
              width={1200}
              height={630}
              className="w-full h-auto rounded-lg"
              priority
            />
          </div>
        )}

        {/* Content */}
        <div className="prose prose-lg max-w-none">
          {blogPost.content.map((block, index) => (
            <ContentBlockRenderer key={index} block={block} />
          ))}
        </div>
      </article>
    </main>
  );
}

