-- =============================================
-- FIX BUSINESSES TABLE RLS FOR REGISTRATION
-- Migration: 08_fix_businesses_rls.sql
-- =============================================

-- Enable RLS on businesses table
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- Drop all existing businesses policies to start fresh
DROP POLICY IF EXISTS "Authenticated users can register businesses" ON businesses;
DROP POLICY IF EXISTS "Business owners can read own business" ON businesses;
DROP POLICY IF EXISTS "OMD admins can read all businesses in their OMD" ON businesses;
DROP POLICY IF EXISTS "OMD admins can update businesses in their OMD" ON businesses;
DROP POLICY IF EXISTS "OMD admins can delete businesses in their OMD" ON businesses;
DROP POLICY IF EXISTS "Active businesses are viewable by everyone" ON businesses;
DROP POLICY IF EXISTS "Business owners can update their businesses" ON businesses;

-- =============================================
-- INSERT POLICIES (Business Registration)
-- =============================================

-- Allow authenticated users to register/create businesses
CREATE POLICY "Authenticated users can register businesses"
ON businesses FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = owner_id  -- User can only create businesses for themselves
);

-- =============================================
-- SELECT POLICIES (Read Access)
-- =============================================

-- Public can view active businesses
CREATE POLICY "Public can view active businesses"
ON businesses FOR SELECT
TO public
USING (status = 'active');

-- Business owners can view their own businesses (including pending)
CREATE POLICY "Business owners can view own businesses"
ON businesses FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

-- OMD admins can view all businesses in their OMD
CREATE POLICY "OMD admins can view all businesses in their OMD"
ON businesses FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.omd_id = businesses.omd_id
    AND user_profiles.role IN ('omd_admin', 'super_admin')
  )
);

-- =============================================
-- UPDATE POLICIES
-- =============================================

-- Business owners can update their own businesses
CREATE POLICY "Business owners can update own businesses"
ON businesses FOR UPDATE
TO authenticated
USING (owner_id = auth.uid());

-- OMD admins can update businesses in their OMD (for approval)
CREATE POLICY "OMD admins can update businesses in their OMD"
ON businesses FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.omd_id = businesses.omd_id
    AND user_profiles.role IN ('omd_admin', 'super_admin')
  )
);

-- =============================================
-- DELETE POLICIES
-- =============================================

-- Business owners can delete their own businesses
CREATE POLICY "Business owners can delete own businesses"
ON businesses FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- OMD admins can delete businesses in their OMD (for rejection)
CREATE POLICY "OMD admins can delete businesses in their OMD"
ON businesses FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.omd_id = businesses.omd_id
    AND user_profiles.role IN ('omd_admin', 'super_admin')
  )
);

-- Verify policies were created
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
WHERE tablename = 'businesses'
ORDER BY cmd, policyname;

