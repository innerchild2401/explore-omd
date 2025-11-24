import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { format } from 'date-fns';
import { getImageUrl } from '@/lib/utils';
import OptimizedImage from '@/components/ui/OptimizedImage';
import { notFound } from 'next/navigation';

export const revalidate = 60; // Revalidate every minute

export default async function BlogPage() {
  const supabase = await createClient();

  // Fetch published blog posts
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('id, title, subtitle, slug, excerpt, featured_image, featured_image_alt, published_at, reading_time')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (!posts) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <section className="bg-gray-50 py-12">
        <div className="mx-auto max-w-7xl px-4">
          <h1 className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl">
            Blog / Insights
          </h1>
          <p className="text-lg text-gray-600">
            Articole recente despre turism, tehnologie și managementul destinațiilor.
          </p>
        </div>
      </section>

      {/* Posts Grid */}
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4">
          {posts.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-600">No blog posts yet. Check back soon!</p>
            </div>
          ) : (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group h-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md transition-all hover:-translate-y-1 hover:shadow-xl"
                >
                  {/* Featured Image */}
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-gray-100">
                    {post.featured_image ? (
                      <OptimizedImage
                        src={getImageUrl(post.featured_image)}
                        alt={post.featured_image_alt || post.title}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200">
                        <svg
                          className="h-16 w-16 text-blue-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="mb-2 text-xl font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {post.title}
                    </h3>
                    {post.subtitle && (
                      <p className="mb-3 text-sm text-gray-500 line-clamp-1">
                        {post.subtitle}
                      </p>
                    )}
                    {post.excerpt && (
                      <p className="mb-4 text-base text-gray-600 line-clamp-3">
                        {post.excerpt}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>
                        {post.published_at
                          ? format(new Date(post.published_at), 'd MMM yyyy')
                          : ''}
                      </span>
                      {post.reading_time && (
                        <span>{post.reading_time} min citire</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

