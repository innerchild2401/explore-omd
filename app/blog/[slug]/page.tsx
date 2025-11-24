import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { getImageUrl } from '@/lib/utils';
import OptimizedImage from '@/components/ui/OptimizedImage';
import ContentBlockRenderer from '@/components/blog/ContentBlockRenderer';
import Link from 'next/link';
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
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Link
                href="https://destexplore.eu"
                className="transition-colors hover:text-gray-900"
              >
                Dest Explore
              </Link>
              <span className="text-gray-400">/</span>
              <Link
                href="/blog"
                className="transition-colors hover:text-gray-900"
              >
                Blog
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-900 font-medium line-clamp-1 max-w-xs">
                {blogPost.title}
              </span>
            </div>

            {/* Back to Blog Button */}
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="hidden sm:inline">Înapoi la blog</span>
              <span className="sm:hidden">Înapoi</span>
            </Link>
          </div>
        </div>
      </nav>

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

        {/* Bottom Navigation */}
        <footer className="mt-16 pt-8 border-t border-gray-200">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Back to Blog */}
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-gray-600 transition-colors hover:text-gray-900"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="font-medium">Înapoi la toate articolele</span>
            </Link>

            {/* Visit Main Site */}
            <Link
              href="https://destexplore.eu"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-600 transition-colors hover:text-blue-700"
            >
              <span className="font-medium">Vizitează Dest Explore</span>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
          </div>
        </footer>
      </article>
    </main>
  );
}

