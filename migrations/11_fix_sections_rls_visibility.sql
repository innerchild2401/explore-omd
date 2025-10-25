-- =============================================
-- FIX SECTIONS RLS - ENSURE VISIBLE SECTIONS ALWAYS SHOW
-- Migration: 11_fix_sections_rls_visibility.sql
-- =============================================
-- 
-- Problem: When logged in as a non-admin user, sections don't show
-- even though is_visible = true
-- 
-- Solution: Create clear, non-conflicting policies
-- =============================================

-- Drop ALL existing sections policies to start fresh
DROP POLICY IF EXISTS "Sections are viewable by everyone" ON sections;
DROP POLICY IF EXISTS "OMD admins can view all sections" ON sections;
DROP POLICY IF EXISTS "Users can create sections" ON sections;
DROP POLICY IF EXISTS "OMD admins can update sections" ON sections;
DROP POLICY IF EXISTS "OMD admins can delete sections" ON sections;

-- =============================================
-- SELECT POLICIES (Read Access)
-- =============================================

-- PUBLIC: Anyone (logged in or not) can view visible sections
CREATE POLICY "Public can view visible sections"
ON sections FOR SELECT
TO public
USING (is_visible = true);

-- AUTHENTICATED: OMD admins can view ALL sections in their OMD (including hidden)
CREATE POLICY "OMD admins can view all sections in their OMD"
ON sections FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.omd_id = sections.omd_id
    AND user_profiles.role IN ('omd_admin', 'super_admin')
  )
);

-- =============================================
-- INSERT POLICIES
-- =============================================

-- OMD admins can create sections for their OMD
CREATE POLICY "OMD admins can create sections"
ON sections FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.omd_id = sections.omd_id
    AND user_profiles.role IN ('omd_admin', 'super_admin')
  )
);

-- =============================================
-- UPDATE POLICIES
-- =============================================

-- OMD admins can update sections in their OMD
CREATE POLICY "OMD admins can update sections in their OMD"
ON sections FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.omd_id = sections.omd_id
    AND user_profiles.role IN ('omd_admin', 'super_admin')
  )
);

-- =============================================
-- DELETE POLICIES
-- =============================================

-- OMD admins can delete sections in their OMD
CREATE POLICY "OMD admins can delete sections in their OMD"
ON sections FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.omd_id = sections.omd_id
    AND user_profiles.role IN ('omd_admin', 'super_admin')
  )
);

-- =============================================
-- VERIFY POLICIES
-- =============================================

-- Show all policies for sections table
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd as operation,
  CASE 
    WHEN roles = '{public}' THEN 'public'
    WHEN roles = '{authenticated}' THEN 'authenticated'
    ELSE roles::text
  END as applies_to
FROM pg_policies 
WHERE tablename = 'sections'
ORDER BY cmd, policyname;

