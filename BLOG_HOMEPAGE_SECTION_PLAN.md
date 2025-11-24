# 🏠 Blog Homepage Section - Implementation Plan

## Overview

Add a blog section to the main marketing homepage (`app/page.tsx`) that displays recent blog posts as cards with a link to the full blog.

---

## Design Specification

### Section Placement
- **Location**: After "Destinații pilot" section, before Contact form
- **Section ID**: `#blog` (for anchor links)

### Visual Design

```
┌─────────────────────────────────────────────────────────┐
│  Blog / Insights                                        │
│  Articole recente despre turism și tehnologie          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ [Image]  │  │ [Image]  │  │ [Image]  │            │
│  │ Title    │  │ Title    │  │ Title    │            │
│  │ Excerpt  │  │ Excerpt  │  │ Excerpt  │            │
│  │ Date     │  │ Date     │  │ Date     │            │
│  └──────────┘  └──────────┘  └──────────┘            │
│                                                         │
│  [View All Posts →]                                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Styling
- **Background**: White (`bg-white`)
- **Padding**: `py-20` (matches other sections)
- **Max Width**: `max-w-7xl` (matches other sections)
- **Card Design**: 
  - Rounded corners (`rounded-xl`)
  - Shadow on hover (`hover:shadow-xl`)
  - Image on top
  - Title, excerpt, date below
  - Clickable entire card

### Card Layout
- **Desktop**: 3 columns (`md:grid-cols-3`)
- **Tablet**: 2 columns (`sm:grid-cols-2`)
- **Mobile**: 1 column (default)

---

## Component Structure

### New Component: `components/blog/BlogSection.tsx`

```typescript
interface BlogPost {
  id: string;
  title: string;
  subtitle?: string;
  slug: string;
  excerpt?: string;
  featured_image?: string;
  featured_image_alt?: string;
  published_at: string;
  reading_time?: number;
  author?: {
    name: string;
    avatar?: string;
  };
}

interface BlogSectionProps {
  posts: BlogPost[]; // 3-6 recent posts
}
```

### Features
1. **Post Cards**: Display posts in grid layout
2. **Featured Image**: Show featured image or placeholder
3. **Excerpt**: Show excerpt or auto-generate from content
4. **Date**: Format published date (e.g., "15 ianuarie 2025")
5. **Reading Time**: Show if available
6. **Link**: Entire card links to `/blog/[slug]`
7. **CTA Button**: "View All Posts" links to `/blog`

---

## Implementation Steps

### Step 1: Create Blog Section Component

**File**: `components/blog/BlogSection.tsx`

**Features**:
- Fetch recent published posts (3-6)
- Display as cards in grid
- Match homepage styling
- Responsive design
- Framer Motion animations (match existing)

### Step 2: Add to Homepage

**File**: `app/page.tsx`

**Changes**:
- Import `BlogSection` component
- Add section after "Destinații pilot"
- Fetch blog posts (server-side or client-side)
- Handle loading/error states

### Step 3: Create API Route (Optional)

**File**: `app/api/blog/recent/route.ts`

**Purpose**: Fetch recent published posts
- Limit: 6 posts
- Order: `published_at DESC`
- Filter: `status = 'published'`
- Include: featured_image, excerpt, author

---

## Code Example

### BlogSection Component

```tsx
'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { getImageUrl } from '@/lib/utils';
import OptimizedImage from '@/components/ui/OptimizedImage';

interface BlogPost {
  id: string;
  title: string;
  subtitle?: string;
  slug: string;
  excerpt?: string;
  featured_image?: string;
  featured_image_alt?: string;
  published_at: string;
  reading_time?: number;
}

interface BlogSectionProps {
  posts: BlogPost[];
}

export default function BlogSection({ posts }: BlogSectionProps) {
  if (posts.length === 0) {
    return null; // Don't show section if no posts
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <section id="blog" className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl">
            Blog / Insights
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            Articole recente despre turism, tehnologie și managementul destinațiilor.
          </p>
        </motion.div>

        {/* Posts Grid */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Link href={`/blog/${post.slug}`}>
                <div className="group h-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md transition-all hover:-translate-y-1 hover:shadow-xl">
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
                      <p className="mb-3 text-sm text-gray-500">
                        {post.subtitle}
                      </p>
                    )}
                    {post.excerpt && (
                      <p className="mb-4 text-gray-600 line-clamp-3">
                        {post.excerpt}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{formatDate(post.published_at)}</span>
                      {post.reading_time && (
                        <span>{post.reading_time} min citire</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 text-center"
        >
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-8 py-4 text-lg font-semibold text-white transition-all hover:bg-blue-700 hover:scale-105"
          >
            Vezi toate articolele
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
```

### Homepage Integration

```tsx
// In app/page.tsx, add after "Destinații pilot" section:

import BlogSection from '@/components/blog/BlogSection';
import { createClient } from '@/lib/supabase/server';

// In the component, fetch blog posts:
const supabase = await createClient();
const { data: blogPosts } = await supabase
  .from('blog_posts')
  .select('id, title, subtitle, slug, excerpt, featured_image, featured_image_alt, published_at, reading_time')
  .eq('status', 'published')
  .order('published_at', { ascending: false })
  .limit(6);

// In JSX, add section:
{blogPosts && blogPosts.length > 0 && (
  <BlogSection posts={blogPosts} />
)}
```

---

## Database Query

```sql
-- Get recent published posts for homepage
SELECT 
  id,
  title,
  subtitle,
  slug,
  excerpt,
  featured_image,
  featured_image_alt,
  published_at,
  reading_time
FROM blog_posts
WHERE status = 'published'
ORDER BY published_at DESC
LIMIT 6;
```

---

## Styling Notes

- Match existing homepage section patterns
- Use same spacing (`py-20`, `max-w-7xl`)
- Use same animation patterns (Framer Motion)
- Use blue accent color (`blue-600`) for CTA button
- Cards should have hover effects (lift + shadow)
- Images should have hover scale effect

---

## Responsive Behavior

- **Mobile (< 640px)**: 1 column, full width cards
- **Tablet (640px - 1024px)**: 2 columns
- **Desktop (> 1024px)**: 3 columns

---

## Next Steps

1. ✅ Create `BlogSection` component
2. ✅ Add to homepage (`app/page.tsx`)
3. ✅ Create API route for fetching posts (optional)
4. ✅ Test responsive design
5. ✅ Add loading/error states
6. ✅ Test with real blog posts

---

**Status**: Ready for Implementation

