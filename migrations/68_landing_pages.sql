-- =============================================
-- LANDING PAGES SYSTEM
-- Migration: 68_landing_pages.sql
-- =============================================
-- 
-- Creates landing pages system for label-based curated pages
-- Allows OMD admins to create landing pages with label combinations
-- =============================================

-- =============================================
-- 1. CREATE LANDING PAGES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS landing_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  omd_id UUID NOT NULL REFERENCES omds(id) ON DELETE CASCADE,
  title TEXT NOT NULL, -- SEO title
  meta_description TEXT NOT NULL, -- Meta description
  header_text TEXT NOT NULL, -- H1 header
  url_slug TEXT NOT NULL, -- URL-friendly slug
  intro_text TEXT, -- Introduction paragraph
  page_type TEXT NOT NULL DEFAULT 'curated' CHECK (page_type IN ('curated', 'auto_generated')), -- 'curated' or 'auto_generated'
  is_published BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id), -- OMD manager who created it (NULL for auto-generated)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(omd_id, url_slug)
);

CREATE INDEX idx_landing_pages_omd_id ON landing_pages(omd_id);
CREATE INDEX idx_landing_pages_slug ON landing_pages(omd_id, url_slug);
CREATE INDEX idx_landing_pages_type ON landing_pages(page_type);
CREATE INDEX idx_landing_pages_published ON landing_pages(omd_id, is_published);
CREATE INDEX idx_landing_pages_created_at ON landing_pages(created_at DESC);

-- =============================================
-- 2. CREATE LANDING PAGE LABELS JUNCTION TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS landing_page_labels (
  landing_page_id UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (landing_page_id, label_id)
);

CREATE INDEX idx_landing_page_labels_landing_page ON landing_page_labels(landing_page_id);
CREATE INDEX idx_landing_page_labels_label ON landing_page_labels(label_id);

-- =============================================
-- 3. CREATE LANDING PAGE BUSINESSES TABLE
-- =============================================
-- Optional manual override for business ordering/selection
CREATE TABLE IF NOT EXISTS landing_page_businesses (
  landing_page_id UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0, -- Manual ordering
  is_manually_added BOOLEAN DEFAULT false, -- True if manually added, false if auto-matched
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (landing_page_id, business_id)
);

CREATE INDEX idx_landing_page_businesses_landing_page ON landing_page_businesses(landing_page_id);
CREATE INDEX idx_landing_page_businesses_business ON landing_page_businesses(business_id);
CREATE INDEX idx_landing_page_businesses_order ON landing_page_businesses(landing_page_id, order_index);

-- =============================================
-- 4. CREATE UPDATED_AT TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION update_landing_pages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_landing_pages_updated_at
  BEFORE UPDATE ON landing_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_landing_pages_updated_at();

-- =============================================
-- 5. ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS
ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_page_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_page_businesses ENABLE ROW LEVEL SECURITY;

-- Landing Pages: Public can read published pages
CREATE POLICY "landing_pages_public_read"
  ON landing_pages FOR SELECT
  TO public
  USING (is_published = true);

-- Landing Pages: OMD admins can manage their OMD's pages
CREATE POLICY "landing_pages_omd_admin_all"
  ON landing_pages FOR ALL
  TO authenticated
  USING (
    omd_id IN (
      SELECT omd_id FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'omd_admin'
    )
  );

-- Landing Pages: Super admins can manage all pages
CREATE POLICY "landing_pages_super_admin_all"
  ON landing_pages FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Landing Page Labels: Public can read labels for published pages
CREATE POLICY "landing_page_labels_public_read"
  ON landing_page_labels FOR SELECT
  TO public
  USING (
    landing_page_id IN (
      SELECT id FROM landing_pages WHERE is_published = true
    )
  );

-- Landing Page Labels: OMD admins can manage labels for their OMD's pages
CREATE POLICY "landing_page_labels_omd_admin_all"
  ON landing_page_labels FOR ALL
  TO authenticated
  USING (
    landing_page_id IN (
      SELECT id FROM landing_pages
      WHERE omd_id IN (
        SELECT omd_id FROM user_profiles
        WHERE id = auth.uid()
        AND role = 'omd_admin'
      )
    )
  );

-- Landing Page Labels: Super admins can manage all
CREATE POLICY "landing_page_labels_super_admin_all"
  ON landing_page_labels FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Landing Page Businesses: Public can read businesses for published pages
CREATE POLICY "landing_page_businesses_public_read"
  ON landing_page_businesses FOR SELECT
  TO public
  USING (
    landing_page_id IN (
      SELECT id FROM landing_pages WHERE is_published = true
    )
  );

-- Landing Page Businesses: OMD admins can manage businesses for their OMD's pages
CREATE POLICY "landing_page_businesses_omd_admin_all"
  ON landing_page_businesses FOR ALL
  TO authenticated
  USING (
    landing_page_id IN (
      SELECT id FROM landing_pages
      WHERE omd_id IN (
        SELECT omd_id FROM user_profiles
        WHERE id = auth.uid()
        AND role = 'omd_admin'
      )
    )
  );

-- Landing Page Businesses: Super admins can manage all
CREATE POLICY "landing_page_businesses_super_admin_all"
  ON landing_page_businesses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- =============================================
-- 6. GRANT PERMISSIONS
-- =============================================
GRANT SELECT ON landing_pages TO public;
GRANT SELECT ON landing_page_labels TO public;
GRANT SELECT ON landing_page_businesses TO public;

