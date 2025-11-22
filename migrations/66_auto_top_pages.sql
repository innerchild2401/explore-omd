-- =============================================
-- AUTO-GENERATED TOP PAGES SYSTEM
-- Migration: 66_auto_top_pages.sql
-- =============================================
-- 
-- Creates tables for auto-generated ranking pages
-- These pages are automatically generated based on business data
-- =============================================

-- =============================================
-- 1. AUTO TOP PAGES TABLE (Page Configuration)
-- =============================================
CREATE TABLE IF NOT EXISTS auto_top_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  omd_id UUID NOT NULL REFERENCES omds(id) ON DELETE CASCADE,
  page_type TEXT NOT NULL, -- 'most-booked-hotels', 'cheapest-hotels', 'highest-rated-hotels', etc.
  business_type TEXT NOT NULL, -- 'hotel', 'restaurant', 'experience', 'all'
  time_period TEXT, -- 'all-time', 'last-7-days', 'this-month', NULL
  title_template TEXT NOT NULL, -- "Top {count} Cele Mai Rezervate Hoteluri în {destination}"
  meta_description_template TEXT NOT NULL, -- Template with placeholders
  header_template TEXT NOT NULL, -- Usually same as title
  intro_template TEXT, -- Optional intro paragraph template
  url_slug TEXT NOT NULL, -- URL-friendly slug
  filter_criteria JSONB DEFAULT '{}', -- Additional filters (property_subtype, star_rating, price_range, etc.)
  count INTEGER DEFAULT 5, -- How many businesses to show
  is_active BOOLEAN DEFAULT true,
  last_generated_at TIMESTAMPTZ, -- When content was last regenerated
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(omd_id, page_type, business_type, time_period)
);

CREATE INDEX idx_auto_top_pages_omd_id ON auto_top_pages(omd_id);
CREATE INDEX idx_auto_top_pages_type ON auto_top_pages(page_type, business_type);
CREATE INDEX idx_auto_top_pages_active ON auto_top_pages(omd_id, is_active);

-- =============================================
-- 2. AUTO TOP PAGE CONTENT (Cached Results)
-- =============================================
CREATE TABLE IF NOT EXISTS auto_top_page_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auto_top_page_id UUID NOT NULL REFERENCES auto_top_pages(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL, -- 1, 2, 3, 4, 5
  metric_value DECIMAL(10,2), -- The value that determined ranking (bookings count, price, rating, etc.)
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (auto_top_page_id, business_id)
);

CREATE INDEX idx_auto_top_page_content_page_id ON auto_top_page_content(auto_top_page_id);
CREATE INDEX idx_auto_top_page_content_business_id ON auto_top_page_content(business_id);
CREATE INDEX idx_auto_top_page_content_rank ON auto_top_page_content(auto_top_page_id, rank);

-- =============================================
-- 3. RLS POLICIES
-- =============================================

ALTER TABLE auto_top_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_top_page_content ENABLE ROW LEVEL SECURITY;

-- Public can view active pages
CREATE POLICY "Public can view active auto top pages"
  ON auto_top_pages
  FOR SELECT
  USING (is_active = true);

-- Public can view page content
CREATE POLICY "Public can view auto top page content"
  ON auto_top_page_content
  FOR SELECT
  USING (true);

-- OMD admins can view their OMD's pages
CREATE POLICY "OMD admins can view their OMD's auto top pages"
  ON auto_top_pages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('omd_admin', 'super_admin')
        AND (
          user_profiles.role = 'super_admin'
          OR auto_top_pages.omd_id = user_profiles.omd_id
        )
    )
  );

-- Super admins can manage all pages
CREATE POLICY "Super admins can manage auto top pages"
  ON auto_top_pages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'super_admin'
    )
  );

-- =============================================
-- 4. INITIAL PAGE CONFIGURATIONS
-- =============================================
-- These will be created for each OMD when they're first accessed
-- For now, we'll create a function to initialize them

CREATE OR REPLACE FUNCTION initialize_auto_top_pages_for_omd(p_omd_id UUID)
RETURNS void AS $func$
DECLARE
  omd_name TEXT;
BEGIN
  -- Get OMD name for templates
  SELECT name INTO omd_name FROM omds WHERE id = p_omd_id;
  
  -- HOTELS - Most Booked (All Time)
  INSERT INTO auto_top_pages (omd_id, page_type, business_type, time_period, title_template, meta_description_template, header_template, url_slug, count, is_active)
  VALUES (
    p_omd_id,
    'most-booked-hotels',
    'hotel',
    'all-time',
    'Top {count} Cele Mai Rezervate Hoteluri în {destination}',
    'Descoperă cele mai rezervate hoteluri din {destination}. {business1}, {business2}, {business3} și altele.',
    'Top {count} Cele Mai Rezervate Hoteluri în {destination}',
    'most-booked-hotels',
    5,
    true
  ) ON CONFLICT (omd_id, page_type, business_type, time_period) DO NOTHING;

  -- HOTELS - Most Booked (Last 7 Days)
  INSERT INTO auto_top_pages (omd_id, page_type, business_type, time_period, title_template, meta_description_template, header_template, url_slug, count, is_active)
  VALUES (
    p_omd_id,
    'most-booked-hotels',
    'hotel',
    'last-7-days',
    'Top {count} Cele Mai Rezervate Hoteluri în Ultima Săptămână - {destination}',
    'Cele mai rezervate hoteluri din {destination} în ultima săptămână. {business1}, {business2}, {business3} și altele.',
    'Top {count} Cele Mai Rezervate Hoteluri în Ultima Săptămână - {destination}',
    'most-booked-hotels/last-7-days',
    5,
    true
  ) ON CONFLICT (omd_id, page_type, business_type, time_period) DO NOTHING;

  -- HOTELS - Most Booked (This Month)
  INSERT INTO auto_top_pages (omd_id, page_type, business_type, time_period, title_template, meta_description_template, header_template, url_slug, count, is_active)
  VALUES (
    p_omd_id,
    'most-booked-hotels',
    'hotel',
    'this-month',
    'Top {count} Cele Mai Rezervate Hoteluri în Luna Aceasta - {destination}',
    'Cele mai rezervate hoteluri din {destination} în luna aceasta. {business1}, {business2}, {business3} și altele.',
    'Top {count} Cele Mai Rezervate Hoteluri în Luna Aceasta - {destination}',
    'most-booked-hotels/this-month',
    5,
    true
  ) ON CONFLICT (omd_id, page_type, business_type, time_period) DO NOTHING;

  -- HOTELS - Cheapest
  INSERT INTO auto_top_pages (omd_id, page_type, business_type, time_period, title_template, meta_description_template, header_template, url_slug, count, is_active)
  VALUES (
    p_omd_id,
    'cheapest-hotels',
    'hotel',
    NULL,
    'Top {count} Cele Mai Ieftine Hoteluri în {destination}',
    'Descoperă cele mai accesibile hoteluri din {destination}. {business1}, {business2}, {business3} și altele.',
    'Top {count} Cele Mai Ieftine Hoteluri în {destination}',
    'cheapest-hotels',
    5,
    true
  ) ON CONFLICT (omd_id, page_type, business_type, time_period) DO NOTHING;

  -- HOTELS - Highest Rated
  INSERT INTO auto_top_pages (omd_id, page_type, business_type, time_period, title_template, meta_description_template, header_template, url_slug, count, is_active)
  VALUES (
    p_omd_id,
    'highest-rated-hotels',
    'hotel',
    NULL,
    'Top {count} Cele Mai Bine Evaluate Hoteluri în {destination}',
    'Cele mai bine evaluate hoteluri din {destination}. {business1}, {business2}, {business3} și altele.',
    'Top {count} Cele Mai Bine Evaluate Hoteluri în {destination}',
    'highest-rated-hotels',
    5,
    true
  ) ON CONFLICT (omd_id, page_type, business_type, time_period) DO NOTHING;

  -- HOTELS - Resorts
  INSERT INTO auto_top_pages (omd_id, page_type, business_type, time_period, title_template, meta_description_template, header_template, url_slug, filter_criteria, count, is_active)
  VALUES (
    p_omd_id,
    'resorts',
    'hotel',
    NULL,
    'Top {count} Resorturi în {destination}',
    'Cele mai bune resorturi din {destination}. {business1}, {business2}, {business3} și altele.',
    'Top {count} Resorturi în {destination}',
    'resorts',
    '{"property_subtype": "resort"}'::jsonb,
    5,
    true
  ) ON CONFLICT (omd_id, page_type, business_type, time_period) DO NOTHING;

  -- HOTELS - B&B
  INSERT INTO auto_top_pages (omd_id, page_type, business_type, time_period, title_template, meta_description_template, header_template, url_slug, filter_criteria, count, is_active)
  VALUES (
    p_omd_id,
    'bnb',
    'hotel',
    NULL,
    'Top {count} B&B-uri în {destination}',
    'Cele mai bune B&B-uri din {destination}. {business1}, {business2}, {business3} și altele.',
    'Top {count} B&B-uri în {destination}',
    'bnb',
    '{"property_subtype": "bnb"}'::jsonb,
    5,
    true
  ) ON CONFLICT (omd_id, page_type, business_type, time_period) DO NOTHING;

  -- HOTELS - Apartments
  INSERT INTO auto_top_pages (omd_id, page_type, business_type, time_period, title_template, meta_description_template, header_template, url_slug, filter_criteria, count, is_active)
  VALUES (
    p_omd_id,
    'apartments',
    'hotel',
    NULL,
    'Top {count} Apartamente în {destination}',
    'Cele mai bune apartamente din {destination}. {business1}, {business2}, {business3} și altele.',
    'Top {count} Apartamente în {destination}',
    'apartments',
    '{"property_subtype": "apartment"}'::jsonb,
    5,
    true
  ) ON CONFLICT (omd_id, page_type, business_type, time_period) DO NOTHING;

  -- HOTELS - 5 Star
  INSERT INTO auto_top_pages (omd_id, page_type, business_type, time_period, title_template, meta_description_template, header_template, url_slug, filter_criteria, count, is_active)
  VALUES (
    p_omd_id,
    '5-star-hotels',
    'hotel',
    NULL,
    'Top {count} Hoteluri 5 Stele în {destination}',
    'Cele mai bune hoteluri 5 stele din {destination}. {business1}, {business2}, {business3} și altele.',
    'Top {count} Hoteluri 5 Stele în {destination}',
    '5-star-hotels',
    '{"star_rating": 5}'::jsonb,
    5,
    true
  ) ON CONFLICT (omd_id, page_type, business_type, time_period) DO NOTHING;

  -- HOTELS - 4 Star
  INSERT INTO auto_top_pages (omd_id, page_type, business_type, time_period, title_template, meta_description_template, header_template, url_slug, filter_criteria, count, is_active)
  VALUES (
    p_omd_id,
    '4-star-hotels',
    'hotel',
    NULL,
    'Top {count} Hoteluri 4 Stele în {destination}',
    'Cele mai bune hoteluri 4 stele din {destination}. {business1}, {business2}, {business3} și altele.',
    'Top {count} Hoteluri 4 Stele în {destination}',
    '4-star-hotels',
    '{"star_rating": 4}'::jsonb,
    5,
    true
  ) ON CONFLICT (omd_id, page_type, business_type, time_period) DO NOTHING;

  -- RESTAURANTS - Most Visited (All Time)
  INSERT INTO auto_top_pages (omd_id, page_type, business_type, time_period, title_template, meta_description_template, header_template, url_slug, count, is_active)
  VALUES (
    p_omd_id,
    'most-visited-restaurants',
    'restaurant',
    'all-time',
    'Top {count} Cele Mai Vizitate Restaurante în {destination}',
    'Cele mai vizitate restaurante din {destination}. {business1}, {business2}, {business3} și altele.',
    'Top {count} Cele Mai Vizitate Restaurante în {destination}',
    'most-visited-restaurants',
    5,
    true
  ) ON CONFLICT (omd_id, page_type, business_type, time_period) DO NOTHING;

  -- RESTAURANTS - Most Visited (Last 7 Days)
  INSERT INTO auto_top_pages (omd_id, page_type, business_type, time_period, title_template, meta_description_template, header_template, url_slug, count, is_active)
  VALUES (
    p_omd_id,
    'most-visited-restaurants',
    'restaurant',
    'last-7-days',
    'Top {count} Cele Mai Vizitate Restaurante în Ultima Săptămână - {destination}',
    'Cele mai vizitate restaurante din {destination} în ultima săptămână. {business1}, {business2}, {business3} și altele.',
    'Top {count} Cele Mai Vizitate Restaurante în Ultima Săptămână - {destination}',
    'most-visited-restaurants/last-7-days',
    5,
    true
  ) ON CONFLICT (omd_id, page_type, business_type, time_period) DO NOTHING;

  -- RESTAURANTS - Most Visited (This Month)
  INSERT INTO auto_top_pages (omd_id, page_type, business_type, time_period, title_template, meta_description_template, header_template, url_slug, count, is_active)
  VALUES (
    p_omd_id,
    'most-visited-restaurants',
    'restaurant',
    'this-month',
    'Top {count} Cele Mai Vizitate Restaurante în Luna Aceasta - {destination}',
    'Cele mai vizitate restaurante din {destination} în luna aceasta. {business1}, {business2}, {business3} și altele.',
    'Top {count} Cele Mai Vizitate Restaurante în Luna Aceasta - {destination}',
    'most-visited-restaurants/this-month',
    5,
    true
  ) ON CONFLICT (omd_id, page_type, business_type, time_period) DO NOTHING;

  -- RESTAURANTS - Budget
  INSERT INTO auto_top_pages (omd_id, page_type, business_type, time_period, title_template, meta_description_template, header_template, url_slug, filter_criteria, count, is_active)
  VALUES (
    p_omd_id,
    'budget-restaurants',
    'restaurant',
    NULL,
    'Top {count} Restaurante Buget în {destination}',
    'Cele mai bune restaurante buget din {destination}. {business1}, {business2}, {business3} și altele.',
    'Top {count} Restaurante Buget în {destination}',
    'budget-restaurants',
    jsonb_build_object('price_range', '$'),
    5,
    true
  ) ON CONFLICT (omd_id, page_type, business_type, time_period) DO NOTHING;

  -- RESTAURANTS - Mid-Range
  INSERT INTO auto_top_pages (omd_id, page_type, business_type, time_period, title_template, meta_description_template, header_template, url_slug, filter_criteria, count, is_active)
  VALUES (
    p_omd_id,
    'mid-range-restaurants',
    'restaurant',
    NULL,
    'Top {count} Restaurante Mid-Range în {destination}',
    'Cele mai bune restaurante mid-range din {destination}. {business1}, {business2}, {business3} și altele.',
    'Top {count} Restaurante Mid-Range în {destination}',
    'mid-range-restaurants',
    jsonb_build_object('price_range', '$$'),
    5,
    true
  ) ON CONFLICT (omd_id, page_type, business_type, time_period) DO NOTHING;

  -- RESTAURANTS - Fine Dining
  INSERT INTO auto_top_pages (omd_id, page_type, business_type, time_period, title_template, meta_description_template, header_template, url_slug, filter_criteria, count, is_active)
  VALUES (
    p_omd_id,
    'fine-dining-restaurants',
    'restaurant',
    NULL,
    'Top {count} Restaurante Fine Dining în {destination}',
    'Cele mai bune restaurante fine dining din {destination}. {business1}, {business2}, {business3} și altele.',
    'Top {count} Restaurante Fine Dining în {destination}',
    'fine-dining-restaurants',
    jsonb_build_object('price_range', jsonb_build_array('$$$', '$$$$')),
    5,
    true
  ) ON CONFLICT (omd_id, page_type, business_type, time_period) DO NOTHING;

  -- RESTAURANTS - Highest Rated
  INSERT INTO auto_top_pages (omd_id, page_type, business_type, time_period, title_template, meta_description_template, header_template, url_slug, count, is_active)
  VALUES (
    p_omd_id,
    'highest-rated-restaurants',
    'restaurant',
    NULL,
    'Top {count} Cele Mai Bine Evaluate Restaurante în {destination}',
    'Cele mai bine evaluate restaurante din {destination}. {business1}, {business2}, {business3} și altele.',
    'Top {count} Cele Mai Bine Evaluate Restaurante în {destination}',
    'highest-rated-restaurants',
    5,
    true
  ) ON CONFLICT (omd_id, page_type, business_type, time_period) DO NOTHING;

  -- EXPERIENCES - Most Booked (All Time)
  INSERT INTO auto_top_pages (omd_id, page_type, business_type, time_period, title_template, meta_description_template, header_template, url_slug, count, is_active)
  VALUES (
    p_omd_id,
    'most-booked-experiences',
    'experience',
    'all-time',
    'Top {count} Cele Mai Rezervate Experiențe în {destination}',
    'Cele mai rezervate experiențe din {destination}. {business1}, {business2}, {business3} și altele.',
    'Top {count} Cele Mai Rezervate Experiențe în {destination}',
    'most-booked-experiences',
    5,
    true
  ) ON CONFLICT (omd_id, page_type, business_type, time_period) DO NOTHING;

  -- EXPERIENCES - Most Booked (Last 7 Days)
  INSERT INTO auto_top_pages (omd_id, page_type, business_type, time_period, title_template, meta_description_template, header_template, url_slug, count, is_active)
  VALUES (
    p_omd_id,
    'most-booked-experiences',
    'experience',
    'last-7-days',
    'Top {count} Cele Mai Rezervate Experiențe în Ultima Săptămână - {destination}',
    'Cele mai rezervate experiențe din {destination} în ultima săptămână. {business1}, {business2}, {business3} și altele.',
    'Top {count} Cele Mai Rezervate Experiențe în Ultima Săptămână - {destination}',
    'most-booked-experiences/last-7-days',
    5,
    true
  ) ON CONFLICT (omd_id, page_type, business_type, time_period) DO NOTHING;

  -- EXPERIENCES - Most Booked (This Month)
  INSERT INTO auto_top_pages (omd_id, page_type, business_type, time_period, title_template, meta_description_template, header_template, url_slug, count, is_active)
  VALUES (
    p_omd_id,
    'most-booked-experiences',
    'experience',
    'this-month',
    'Top {count} Cele Mai Rezervate Experiențe în Luna Aceasta - {destination}',
    'Cele mai rezervate experiențe din {destination} în luna aceasta. {business1}, {business2}, {business3} și altele.',
    'Top {count} Cele Mai Rezervate Experiențe în Luna Aceasta - {destination}',
    'most-booked-experiences/this-month',
    5,
    true
  ) ON CONFLICT (omd_id, page_type, business_type, time_period) DO NOTHING;

  -- EXPERIENCES - Cheapest
  INSERT INTO auto_top_pages (omd_id, page_type, business_type, time_period, title_template, meta_description_template, header_template, url_slug, count, is_active)
  VALUES (
    p_omd_id,
    'cheapest-experiences',
    'experience',
    NULL,
    'Top {count} Cele Mai Ieftine Experiențe în {destination}',
    'Cele mai accesibile experiențe din {destination}. {business1}, {business2}, {business3} și altele.',
    'Top {count} Cele Mai Ieftine Experiențe în {destination}',
    'cheapest-experiences',
    5,
    true
  ) ON CONFLICT (omd_id, page_type, business_type, time_period) DO NOTHING;

  -- EXPERIENCES - Highest Rated
  INSERT INTO auto_top_pages (omd_id, page_type, business_type, time_period, title_template, meta_description_template, header_template, url_slug, count, is_active)
  VALUES (
    p_omd_id,
    'highest-rated-experiences',
    'experience',
    NULL,
    'Top {count} Cele Mai Bine Evaluate Experiențe în {destination}',
    'Cele mai bine evaluate experiențe din {destination}. {business1}, {business2}, {business3} și altele.',
    'Top {count} Cele Mai Bine Evaluate Experiențe în {destination}',
    'highest-rated-experiences',
    5,
    true
  ) ON CONFLICT (omd_id, page_type, business_type, time_period) DO NOTHING;

  -- EXPERIENCES - Easy
  INSERT INTO auto_top_pages (omd_id, page_type, business_type, time_period, title_template, meta_description_template, header_template, url_slug, filter_criteria, count, is_active)
  VALUES (
    p_omd_id,
    'easy-experiences',
    'experience',
    NULL,
    'Top {count} Experiențe Ușoare în {destination}',
    'Cele mai bune experiențe ușoare din {destination}. {business1}, {business2}, {business3} și altele.',
    'Top {count} Experiențe Ușoare în {destination}',
    'easy-experiences',
    '{"difficulty_level": "easy"}'::jsonb,
    5,
    true
  ) ON CONFLICT (omd_id, page_type, business_type, time_period) DO NOTHING;

  -- EXPERIENCES - Moderate
  INSERT INTO auto_top_pages (omd_id, page_type, business_type, time_period, title_template, meta_description_template, header_template, url_slug, filter_criteria, count, is_active)
  VALUES (
    p_omd_id,
    'moderate-experiences',
    'experience',
    NULL,
    'Top {count} Experiențe Moderate în {destination}',
    'Cele mai bune experiențe moderate din {destination}. {business1}, {business2}, {business3} și altele.',
    'Top {count} Experiențe Moderate în {destination}',
    'moderate-experiences',
    '{"difficulty_level": "moderate"}'::jsonb,
    5,
    true
  ) ON CONFLICT (omd_id, page_type, business_type, time_period) DO NOTHING;

  -- EXPERIENCES - Challenging
  INSERT INTO auto_top_pages (omd_id, page_type, business_type, time_period, title_template, meta_description_template, header_template, url_slug, filter_criteria, count, is_active)
  VALUES (
    p_omd_id,
    'challenging-experiences',
    'experience',
    NULL,
    'Top {count} Experiențe Provocatoare în {destination}',
    'Cele mai bune experiențe provocatoare din {destination}. {business1}, {business2}, {business3} și altele.',
    'Top {count} Experiențe Provocatoare în {destination}',
    'challenging-experiences',
    '{"difficulty_level": ["challenging", "expert"]}'::jsonb,
    5,
    true
  ) ON CONFLICT (omd_id, page_type, business_type, time_period) DO NOTHING;

  -- ALL BUSINESSES - Newest
  INSERT INTO auto_top_pages (omd_id, page_type, business_type, time_period, title_template, meta_description_template, header_template, url_slug, count, is_active)
  VALUES (
    p_omd_id,
    'newest-businesses',
    'all',
    NULL,
    'Top {count} Cele Mai Noi Locații în {destination}',
    'Cele mai noi locații din {destination}. {business1}, {business2}, {business3} și altele.',
    'Top {count} Cele Mai Noi Locații în {destination}',
    'newest-businesses',
    5,
    true
  ) ON CONFLICT (omd_id, page_type, business_type, time_period) DO NOTHING;

END;
$func$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

