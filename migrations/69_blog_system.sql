-- =============================================
-- BLOG SYSTEM
-- Migration: 69_blog_system.sql
-- =============================================
-- 
-- Creates blog system for marketing content
-- Single blog for the platform (not per OMD)
-- Only accessible to super_admin
-- =============================================

-- =============================================
-- 1. CREATE BLOG POSTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Content
  title TEXT NOT NULL,
  subtitle TEXT,
  slug TEXT NOT NULL UNIQUE,
  content JSONB NOT NULL DEFAULT '[]', -- Array of content blocks
  excerpt TEXT, -- Auto-generated or manual
  
  -- Media
  featured_image TEXT, -- URL to featured image
  featured_image_alt TEXT,
  
  -- Metadata
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  
  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  canonical_url TEXT,
  
  -- Engagement
  view_count INTEGER DEFAULT 0,
  reading_time INTEGER, -- Minutes (calculated)
  word_count INTEGER, -- Calculated
  
  -- Organization
  is_featured BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX idx_blog_posts_status ON blog_posts(status);
CREATE INDEX idx_blog_posts_published ON blog_posts(status, published_at DESC) WHERE status = 'published';
CREATE INDEX idx_blog_posts_author ON blog_posts(author_id);
CREATE INDEX idx_blog_posts_created_at ON blog_posts(created_at DESC);

-- =============================================
-- 2. CREATE BLOG TAGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS blog_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT, -- Optional tag color
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_blog_tags_slug ON blog_tags(slug);
CREATE INDEX idx_blog_tags_name ON blog_tags(name);

-- =============================================
-- 3. CREATE BLOG POST TAGS JUNCTION TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS blog_post_tags (
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES blog_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX idx_blog_post_tags_post ON blog_post_tags(post_id);
CREATE INDEX idx_blog_post_tags_tag ON blog_post_tags(tag_id);

-- =============================================
-- 4. CREATE BLOG POST VIEWS TABLE (Analytics)
-- =============================================
CREATE TABLE IF NOT EXISTS blog_post_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id), -- NULL for anonymous
  ip_address INET,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_blog_post_views_post ON blog_post_views(post_id);
CREATE INDEX idx_blog_post_views_viewed_at ON blog_post_views(viewed_at DESC);

-- =============================================
-- 5. CREATE UPDATED_AT TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION update_blog_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_posts_updated_at();

-- =============================================
-- 6. ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_views ENABLE ROW LEVEL SECURITY;

-- Blog Posts: Public can read published posts
CREATE POLICY "blog_posts_public_read"
  ON blog_posts FOR SELECT
  TO public
  USING (status = 'published');

-- Blog Posts: Super admins can manage all posts
CREATE POLICY "blog_posts_super_admin_all"
  ON blog_posts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Blog Tags: Public can read all tags
CREATE POLICY "blog_tags_public_read"
  ON blog_tags FOR SELECT
  TO public
  USING (true);

-- Blog Tags: Super admins can manage all tags
CREATE POLICY "blog_tags_super_admin_all"
  ON blog_tags FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Blog Post Tags: Public can read tags for published posts
CREATE POLICY "blog_post_tags_public_read"
  ON blog_post_tags FOR SELECT
  TO public
  USING (
    post_id IN (
      SELECT id FROM blog_posts WHERE status = 'published'
    )
  );

-- Blog Post Tags: Super admins can manage all
CREATE POLICY "blog_post_tags_super_admin_all"
  ON blog_post_tags FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Blog Post Views: Anyone can insert views
CREATE POLICY "blog_post_views_insert"
  ON blog_post_views FOR INSERT
  TO public
  WITH CHECK (true);

-- Blog Post Views: Super admins can read all views
CREATE POLICY "blog_post_views_super_admin_read"
  ON blog_post_views FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- =============================================
-- 7. GRANT PERMISSIONS
-- =============================================
GRANT SELECT ON blog_posts TO public;
GRANT SELECT ON blog_tags TO public;
GRANT SELECT ON blog_post_tags TO public;
GRANT INSERT ON blog_post_views TO public;


