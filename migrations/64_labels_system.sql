-- =============================================
-- LABELS SYSTEM MIGRATION
-- Migration: 64_labels_system.sql
-- =============================================
-- 
-- Creates the labels system with categories and labels
-- Based on user-provided label structure
-- =============================================

-- =============================================
-- 1. CREATE LABEL CATEGORIES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS label_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  omd_id UUID NOT NULL REFERENCES omds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(omd_id, name)
);

CREATE INDEX idx_label_categories_omd_id ON label_categories(omd_id);
CREATE INDEX idx_label_categories_order ON label_categories(omd_id, order_index);

-- =============================================
-- 2. CREATE LABELS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS labels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES label_categories(id) ON DELETE CASCADE,
  omd_id UUID NOT NULL REFERENCES omds(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- Base name (used as key for translations)
  description TEXT, -- Human-readable description
  display_name TEXT, -- Optional display name (for localization)
  business_types TEXT[] DEFAULT '{}', -- ['hotel', 'restaurant', 'experience'] or [] for all
  is_omd_awarded_only BOOLEAN DEFAULT false, -- If true, businesses can't select it
  is_active BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category_id, name)
);

CREATE INDEX idx_labels_category_id ON labels(category_id);
CREATE INDEX idx_labels_omd_id ON labels(omd_id);
CREATE INDEX idx_labels_business_types ON labels USING GIN(business_types);
CREATE INDEX idx_labels_order ON labels(category_id, order_index);

-- =============================================
-- 3. CREATE LABEL TRANSLATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS label_translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  language TEXT NOT NULL, -- 'ro', 'en', 'de', etc.
  name TEXT NOT NULL, -- Translated name
  description TEXT, -- Translated description
  display_name TEXT, -- Translated display name
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(label_id, language)
);

CREATE INDEX idx_label_translations_label_id ON label_translations(label_id);
CREATE INDEX idx_label_translations_language ON label_translations(language);

-- =============================================
-- 4. CREATE BUSINESS LABELS JUNCTION TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS business_labels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id), -- Who assigned it (business owner or OMD admin)
  is_omd_awarded BOOLEAN DEFAULT false, -- True if awarded by OMD, false if selected by business
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, label_id)
);

CREATE INDEX idx_business_labels_business_id ON business_labels(business_id);
CREATE INDEX idx_business_labels_label_id ON business_labels(label_id);

-- =============================================
-- 5. CREATE LABEL TEMPLATES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS label_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, -- Template name (e.g., "Family-Friendly Set")
  description TEXT, -- Template description
  category_id UUID REFERENCES label_categories(id) ON DELETE SET NULL,
  business_types TEXT[] DEFAULT '{}', -- Which business types this template applies to
  is_global BOOLEAN DEFAULT false, -- If true, available to all OMDs
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_label_templates_global ON label_templates(is_global) WHERE is_global = true;

-- =============================================
-- 6. CREATE LABEL TEMPLATE LABELS JUNCTION
-- =============================================
CREATE TABLE IF NOT EXISTS label_template_labels (
  template_id UUID NOT NULL REFERENCES label_templates(id) ON DELETE CASCADE,
  label_name TEXT NOT NULL, -- Label name (not ID, for template portability)
  order_index INTEGER DEFAULT 0,
  PRIMARY KEY (template_id, label_name)
);

-- =============================================
-- 7. CREATE TRIGGERS FOR UPDATED_AT
-- =============================================
CREATE TRIGGER update_label_categories_updated_at
  BEFORE UPDATE ON label_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_labels_updated_at
  BEFORE UPDATE ON labels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_label_translations_updated_at
  BEFORE UPDATE ON label_translations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 8. ENABLE RLS ON ALL TABLES
-- =============================================
ALTER TABLE label_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE label_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE label_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE label_template_labels ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 9. RLS POLICIES - LABEL CATEGORIES
-- =============================================

-- Public can view active categories
CREATE POLICY "Public can view active label categories"
ON label_categories FOR SELECT
TO public
USING (is_active = true);

-- OMD admins can manage categories in their OMD
CREATE POLICY "OMD admins can manage label categories"
ON label_categories FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.omd_id = label_categories.omd_id
    AND user_profiles.role IN ('omd_admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.omd_id = label_categories.omd_id
    AND user_profiles.role IN ('omd_admin', 'super_admin')
  )
);

-- =============================================
-- 10. RLS POLICIES - LABELS
-- =============================================

-- Public can view active labels
CREATE POLICY "Public can view active labels"
ON labels FOR SELECT
TO public
USING (is_active = true);

-- OMD admins can manage labels in their OMD
CREATE POLICY "OMD admins can manage labels"
ON labels FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.omd_id = labels.omd_id
    AND user_profiles.role IN ('omd_admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.omd_id = labels.omd_id
    AND user_profiles.role IN ('omd_admin', 'super_admin')
  )
);

-- =============================================
-- 11. RLS POLICIES - LABEL TRANSLATIONS
-- =============================================

-- Public can view translations
CREATE POLICY "Public can view label translations"
ON label_translations FOR SELECT
TO public
USING (true);

-- OMD admins can manage translations for labels in their OMD
CREATE POLICY "OMD admins can manage label translations"
ON label_translations FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM labels l
    JOIN user_profiles up ON up.omd_id = l.omd_id
    WHERE l.id = label_translations.label_id
    AND up.id = auth.uid()
    AND up.role IN ('omd_admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM labels l
    JOIN user_profiles up ON up.omd_id = l.omd_id
    WHERE l.id = label_translations.label_id
    AND up.id = auth.uid()
    AND up.role IN ('omd_admin', 'super_admin')
  )
);

-- =============================================
-- 12. RLS POLICIES - BUSINESS LABELS
-- =============================================

-- Public can view business labels (for filtering)
CREATE POLICY "Public can view business labels"
ON business_labels FOR SELECT
TO public
USING (true);

-- Business owners can select labels for their businesses (if not OMD-awarded only)
CREATE POLICY "Business owners can manage their labels"
ON business_labels FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM businesses b
    JOIN labels l ON l.id = business_labels.label_id
    WHERE b.id = business_labels.business_id
    AND b.owner_id = auth.uid()
    AND l.is_omd_awarded_only = false
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM businesses b
    JOIN labels l ON l.id = business_labels.label_id
    WHERE b.id = business_labels.business_id
    AND b.owner_id = auth.uid()
    AND l.is_omd_awarded_only = false
  )
);

-- OMD admins can award labels to any business in their OMD
CREATE POLICY "OMD admins can award labels"
ON business_labels FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM businesses b
    JOIN user_profiles up ON up.omd_id = b.omd_id
    WHERE b.id = business_labels.business_id
    AND up.id = auth.uid()
    AND up.role IN ('omd_admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM businesses b
    JOIN user_profiles up ON up.omd_id = b.omd_id
    WHERE b.id = business_labels.business_id
    AND up.id = auth.uid()
    AND up.role IN ('omd_admin', 'super_admin')
  )
);

-- =============================================
-- 13. RLS POLICIES - LABEL TEMPLATES
-- =============================================

-- Public can view global templates
CREATE POLICY "Public can view global templates"
ON label_templates FOR SELECT
TO public
USING (is_global = true);

-- Super admins can manage all templates
CREATE POLICY "Super admins can manage templates"
ON label_templates FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'super_admin'
  )
);

-- =============================================
-- 14. FUNCTION TO INITIALIZE LABELS FOR AN OMD
-- =============================================
-- This function creates all default categories and labels for a new OMD
CREATE OR REPLACE FUNCTION initialize_omd_labels(p_omd_id UUID)
RETURNS void AS $$
DECLARE
  v_category_id UUID;
  v_label_id UUID;
BEGIN
  -- 1. Theme & Mood
  INSERT INTO label_categories (omd_id, name, description, order_index)
  VALUES (p_omd_id, 'Theme & Mood', 'For building curated sections like Romantic Time, Family Fun, etc.', 1)
  RETURNING id INTO v_category_id;

  INSERT INTO labels (category_id, omd_id, name, order_index, business_types) VALUES
    (v_category_id, p_omd_id, 'Romantic', 1, '{}'),
    (v_category_id, p_omd_id, 'Luxury', 2, '{}'),
    (v_category_id, p_omd_id, 'Budget', 3, '{}'),
    (v_category_id, p_omd_id, 'Adventure', 4, '{}'),
    (v_category_id, p_omd_id, 'Relaxing', 5, '{}'),
    (v_category_id, p_omd_id, 'Cultural', 6, '{}'),
    (v_category_id, p_omd_id, 'Trendy', 7, '{}'),
    (v_category_id, p_omd_id, 'Local', 8, '{}'),
    (v_category_id, p_omd_id, 'Authentic', 9, '{}'),
    (v_category_id, p_omd_id, 'Premium', 10, '{}'),
    (v_category_id, p_omd_id, 'Traditional', 11, '{}'),
    (v_category_id, p_omd_id, 'Modern', 12, '{}'),
    (v_category_id, p_omd_id, 'Iconic', 13, '{}'),
    (v_category_id, p_omd_id, 'Hidden gem', 14, '{}'),
    (v_category_id, p_omd_id, 'Eco-friendly', 15, '{}'),
    (v_category_id, p_omd_id, 'Instagrammable', 16, '{}');

  -- 2. Audience
  INSERT INTO label_categories (omd_id, name, description, order_index)
  VALUES (p_omd_id, 'Audience', 'Who the place/activity is best suited for.', 2)
  RETURNING id INTO v_category_id;

  INSERT INTO labels (category_id, omd_id, name, order_index, business_types) VALUES
    (v_category_id, p_omd_id, 'Couples', 1, '{}'),
    (v_category_id, p_omd_id, 'Families', 2, '{}'),
    (v_category_id, p_omd_id, 'Kids', 3, '{}'),
    (v_category_id, p_omd_id, 'Teen-friendly', 4, '{}'),
    (v_category_id, p_omd_id, 'Solo travelers', 5, '{}'),
    (v_category_id, p_omd_id, 'Groups', 6, '{}'),
    (v_category_id, p_omd_id, 'Seniors', 7, '{}'),
    (v_category_id, p_omd_id, 'Business travelers', 8, '{}'),
    (v_category_id, p_omd_id, 'Backpackers', 9, '{}'),
    (v_category_id, p_omd_id, 'Pets allowed', 10, '{}');

  -- 3. Best Time & Occasions
  INSERT INTO label_categories (omd_id, name, description, order_index)
  VALUES (p_omd_id, 'Best Time & Occasions', 'Used for "Perfect for tonight", "Weekend ideas", etc.', 3)
  RETURNING id INTO v_category_id;

  INSERT INTO labels (category_id, omd_id, name, order_index, business_types) VALUES
    (v_category_id, p_omd_id, 'Morning', 1, '{}'),
    (v_category_id, p_omd_id, 'Afternoon', 2, '{}'),
    (v_category_id, p_omd_id, 'Evening', 3, '{}'),
    (v_category_id, p_omd_id, 'Late night', 4, '{}'),
    (v_category_id, p_omd_id, 'Rainy day', 5, '{}'),
    (v_category_id, p_omd_id, 'Winter', 6, '{}'),
    (v_category_id, p_omd_id, 'Summer', 7, '{}'),
    (v_category_id, p_omd_id, 'All weather', 8, '{}'),
    (v_category_id, p_omd_id, 'Special occasions', 9, '{}'),
    (v_category_id, p_omd_id, 'Anniversary', 10, '{}'),
    (v_category_id, p_omd_id, 'First date', 11, '{}');

  -- 4. Cuisine / Food Style
  INSERT INTO label_categories (omd_id, name, description, order_index)
  VALUES (p_omd_id, 'Cuisine / Food Style', 'Visible to restaurants, bars, cafés — but the group is universal.', 4)
  RETURNING id INTO v_category_id;

  INSERT INTO labels (category_id, omd_id, name, order_index, business_types) VALUES
    (v_category_id, p_omd_id, 'Local cuisine', 1, '{}'),
    (v_category_id, p_omd_id, 'International', 2, '{}'),
    (v_category_id, p_omd_id, 'Seafood', 3, '{}'),
    (v_category_id, p_omd_id, 'Grill / BBQ', 4, '{}'),
    (v_category_id, p_omd_id, 'Street food', 5, '{}'),
    (v_category_id, p_omd_id, 'Vegetarian', 6, '{}'),
    (v_category_id, p_omd_id, 'Vegan', 7, '{}'),
    (v_category_id, p_omd_id, 'Gluten-free', 8, '{}'),
    (v_category_id, p_omd_id, 'Wine-focused', 9, '{}'),
    (v_category_id, p_omd_id, 'Craft beer', 10, '{}'),
    (v_category_id, p_omd_id, 'Fine dining', 11, '{}'),
    (v_category_id, p_omd_id, 'Casual dining', 12, '{}'),
    (v_category_id, p_omd_id, 'Chef-led', 13, '{}'),
    (v_category_id, p_omd_id, 'Tasting menu', 14, '{}');

  -- 5. Features & Amenities
  INSERT INTO label_categories (omd_id, name, description, order_index)
  VALUES (p_omd_id, 'Features & Amenities', 'Cross-business (hotel, spa, restaurant, tour).', 5)
  RETURNING id INTO v_category_id;

  INSERT INTO labels (category_id, omd_id, name, order_index, business_types) VALUES
    (v_category_id, p_omd_id, 'Free parking', 1, '{}'),
    (v_category_id, p_omd_id, 'Near beach', 2, '{}'),
    (v_category_id, p_omd_id, 'Rooftop', 3, '{}'),
    (v_category_id, p_omd_id, 'Scenic view', 4, '{}'),
    (v_category_id, p_omd_id, 'Waterfront', 5, '{}'),
    (v_category_id, p_omd_id, 'Live music', 6, '{}'),
    (v_category_id, p_omd_id, 'Child play area', 7, '{}'),
    (v_category_id, p_omd_id, 'Gift shop', 8, '{}'),
    (v_category_id, p_omd_id, 'Free Wi-Fi', 9, '{}'),
    (v_category_id, p_omd_id, 'Outdoor seating', 10, '{}'),
    (v_category_id, p_omd_id, 'Wheelchair accessible', 11, '{}'),
    (v_category_id, p_omd_id, 'Private rooms', 12, '{}'),
    (v_category_id, p_omd_id, 'VIP service', 13, '{}'),
    (v_category_id, p_omd_id, 'Open late', 14, '{}');

  -- 6. Wellness & Spa
  INSERT INTO label_categories (omd_id, name, description, order_index)
  VALUES (p_omd_id, 'Wellness & Spa', 'Useful for spa listings, but harmless for others.', 6)
  RETURNING id INTO v_category_id;

  INSERT INTO labels (category_id, omd_id, name, order_index, business_types) VALUES
    (v_category_id, p_omd_id, 'Sauna', 1, '{}'),
    (v_category_id, p_omd_id, 'Steam room', 2, '{}'),
    (v_category_id, p_omd_id, 'Hammam', 3, '{}'),
    (v_category_id, p_omd_id, 'Jacuzzi', 4, '{}'),
    (v_category_id, p_omd_id, 'Massage', 5, '{}'),
    (v_category_id, p_omd_id, 'Facial', 6, '{}'),
    (v_category_id, p_omd_id, 'Couples massage', 7, '{}'),
    (v_category_id, p_omd_id, 'Indoor pool', 8, '{}'),
    (v_category_id, p_omd_id, 'Outdoor pool', 9, '{}'),
    (v_category_id, p_omd_id, 'Thermal waters', 10, '{}'),
    (v_category_id, p_omd_id, 'Yoga / meditation', 11, '{}'),
    (v_category_id, p_omd_id, 'Fitness center', 12, '{}');

  -- 7. Experiences & Tours
  INSERT INTO label_categories (omd_id, name, description, order_index)
  VALUES (p_omd_id, 'Experiences & Tours', 'Great for activities, adventure, workshops, etc.', 7)
  RETURNING id INTO v_category_id;

  INSERT INTO labels (category_id, omd_id, name, order_index, business_types) VALUES
    (v_category_id, p_omd_id, 'Guided', 1, '{}'),
    (v_category_id, p_omd_id, 'Self-guided', 2, '{}'),
    (v_category_id, p_omd_id, 'Indoor', 3, '{}'),
    (v_category_id, p_omd_id, 'Outdoor', 4, '{}'),
    (v_category_id, p_omd_id, 'Educational', 5, '{}'),
    (v_category_id, p_omd_id, 'Hands-on workshop', 6, '{}'),
    (v_category_id, p_omd_id, 'Adrenaline', 7, '{}'),
    (v_category_id, p_omd_id, 'Relaxing experience', 8, '{}'),
    (v_category_id, p_omd_id, 'Sightseeing', 9, '{}'),
    (v_category_id, p_omd_id, 'Wildlife', 10, '{}'),
    (v_category_id, p_omd_id, 'Boat trip', 11, '{}'),
    (v_category_id, p_omd_id, 'Catamaran', 12, '{}'),
    (v_category_id, p_omd_id, 'Sunset trip', 13, '{}'),
    (v_category_id, p_omd_id, 'Snorkeling', 14, '{}'),
    (v_category_id, p_omd_id, 'Fishing', 15, '{}'),
    (v_category_id, p_omd_id, 'Sailing', 16, '{}'),
    (v_category_id, p_omd_id, 'Wine tasting tour', 17, '{}'),
    (v_category_id, p_omd_id, 'Food tour', 18, '{}');

  -- 8. Location & Setting
  INSERT INTO label_categories (omd_id, name, description, order_index)
  VALUES (p_omd_id, 'Location & Setting', 'Used for filtering within a destination.', 8)
  RETURNING id INTO v_category_id;

  INSERT INTO labels (category_id, omd_id, name, order_index, business_types) VALUES
    (v_category_id, p_omd_id, 'Beachfront', 1, '{}'),
    (v_category_id, p_omd_id, 'Old town', 2, '{}'),
    (v_category_id, p_omd_id, 'City center', 3, '{}'),
    (v_category_id, p_omd_id, 'Suburbs', 4, '{}'),
    (v_category_id, p_omd_id, 'Mountain', 5, '{}'),
    (v_category_id, p_omd_id, 'Rural', 6, '{}'),
    (v_category_id, p_omd_id, 'Island', 7, '{}'),
    (v_category_id, p_omd_id, 'Waterfront', 8, '{}'),
    (v_category_id, p_omd_id, 'Nature area', 9, '{}');

  -- 9. Pricing Positioning
  INSERT INTO label_categories (omd_id, name, description, order_index)
  VALUES (p_omd_id, 'Pricing Positioning', 'For filtering or promotions.', 9)
  RETURNING id INTO v_category_id;

  INSERT INTO labels (category_id, omd_id, name, order_index, business_types) VALUES
    (v_category_id, p_omd_id, 'Budget', 1, '{}'),
    (v_category_id, p_omd_id, 'Mid-range', 2, '{}'),
    (v_category_id, p_omd_id, 'Premium', 3, '{}'),
    (v_category_id, p_omd_id, 'Luxury', 4, '{}'),
    (v_category_id, p_omd_id, 'Good value', 5, '{}');

  -- 10. Special Selling Points
  INSERT INTO label_categories (omd_id, name, description, order_index)
  VALUES (p_omd_id, 'Special Selling Points', 'These are high-conversion tags.', 10)
  RETURNING id INTO v_category_id;

  INSERT INTO labels (category_id, omd_id, name, order_index, business_types, is_omd_awarded_only) VALUES
    (v_category_id, p_omd_id, 'Must-try', 1, '{}', true), -- OMD awarded only
    (v_category_id, p_omd_id, 'Famous place', 2, '{}', true), -- OMD awarded only
    (v_category_id, p_omd_id, 'Locals'' favorite', 3, '{}', true), -- OMD awarded only
    (v_category_id, p_omd_id, 'Trending', 4, '{}', true), -- OMD awarded only
    (v_category_id, p_omd_id, 'Newly opened', 5, '{}', false), -- Businesses can select
    (v_category_id, p_omd_id, 'Award-winning', 6, '{}', true), -- OMD awarded only
    (v_category_id, p_omd_id, 'Certified Quality', 7, '{}', true); -- OMD awarded only

END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 15. INITIALIZE LABELS FOR ALL EXISTING OMDS
-- =============================================
DO $$
DECLARE
  omd_record RECORD;
BEGIN
  FOR omd_record IN SELECT id FROM omds LOOP
    PERFORM initialize_omd_labels(omd_record.id);
  END LOOP;
END $$;

-- =============================================
-- 16. TRIGGER TO AUTO-INITIALIZE LABELS FOR NEW OMDS
-- =============================================
CREATE OR REPLACE FUNCTION auto_initialize_omd_labels()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM initialize_omd_labels(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_initialize_omd_labels ON omds;
CREATE TRIGGER trigger_auto_initialize_omd_labels
  AFTER INSERT ON omds
  FOR EACH ROW
  EXECUTE FUNCTION auto_initialize_omd_labels();

-- =============================================
-- 17. COMMENTS FOR DOCUMENTATION
-- =============================================
COMMENT ON TABLE label_categories IS 'Categories that organize labels (e.g., Theme & Mood, Audience, etc.)';
COMMENT ON TABLE labels IS 'Individual labels within categories (e.g., Romantic, Luxury, Families, etc.)';
COMMENT ON TABLE label_translations IS 'Translations for labels in different languages';
COMMENT ON TABLE business_labels IS 'Junction table linking businesses to their labels';
COMMENT ON TABLE label_templates IS 'Pre-made label sets that can be applied to OMDs';
COMMENT ON FUNCTION initialize_omd_labels IS 'Creates all default categories and labels for a new OMD';

