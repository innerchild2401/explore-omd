-- =============================================
-- BUSINESS REGISTRATION RLS POLICIES
-- Migration: 04_business_registration_rls.sql
-- =============================================

-- Allow authenticated users to create businesses (for registration)
CREATE POLICY "Authenticated users can register businesses"
ON businesses
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow business owners to read their own business
CREATE POLICY "Business owners can read own business"
ON businesses
FOR SELECT
TO authenticated
USING (
  auth.uid() = owner_id
);

-- Allow OMD admins to read all businesses in their OMD
CREATE POLICY "OMD admins can read all businesses in their OMD"
ON businesses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.omd_id = businesses.omd_id
    AND user_profiles.role IN ('omd_admin', 'super_admin')
  )
);

-- Allow OMD admins to update businesses in their OMD (for approval)
CREATE POLICY "OMD admins can update businesses in their OMD"
ON businesses
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.omd_id = businesses.omd_id
    AND user_profiles.role IN ('omd_admin', 'super_admin')
  )
);

-- Allow OMD admins to delete businesses in their OMD (for rejection)
CREATE POLICY "OMD admins can delete businesses in their OMD"
ON businesses
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.omd_id = businesses.omd_id
    AND user_profiles.role IN ('omd_admin', 'super_admin')
  )
);

-- Allow OMD admins to update user profiles in their OMD (for approval status)
CREATE POLICY "OMD admins can update user profiles in their OMD"
ON user_profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid()
    AND up.omd_id = user_profiles.omd_id
    AND up.role IN ('omd_admin', 'super_admin')
  )
);

