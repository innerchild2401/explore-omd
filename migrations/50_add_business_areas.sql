-- =============================================
-- BUSINESS AREAS SYSTEM
-- Migration: 50_add_business_areas.sql
-- =============================================
-- 
-- Allows OMD admins to define areas within their destination
-- and businesses to select which area they operate in
-- =============================================

-- =============================================
-- 1. CREATE AREAS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  omd_id UUID NOT NULL REFERENCES omds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(omd_id, name)
);

CREATE INDEX idx_areas_omd_id ON areas(omd_id);

-- =============================================
-- 2. ADD AREA_ID TO BUSINESSES TABLE
-- =============================================
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES areas(id) ON DELETE SET NULL;

CREATE INDEX idx_businesses_area_id ON businesses(area_id);

-- =============================================
-- 3. ENABLE RLS ON AREAS TABLE
-- =============================================
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can view areas" ON areas;
DROP POLICY IF EXISTS "OMD admins can manage areas in their OMD" ON areas;

-- Public can view areas (for filtering/display)
CREATE POLICY "Public can view areas"
ON areas FOR SELECT
TO public
USING (true);

-- OMD admins can manage areas in their OMD
CREATE POLICY "OMD admins can manage areas in their OMD"
ON areas FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.omd_id = areas.omd_id
    AND user_profiles.role IN ('omd_admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.omd_id = areas.omd_id
    AND user_profiles.role IN ('omd_admin', 'super_admin')
  )
);

-- =============================================
-- 4. CREATE UPDATED_AT TRIGGER FOR AREAS
-- =============================================
CREATE OR REPLACE FUNCTION update_areas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_areas_updated_at ON areas;
CREATE TRIGGER trigger_update_areas_updated_at
  BEFORE UPDATE ON areas
  FOR EACH ROW
  EXECUTE FUNCTION update_areas_updated_at();

