-- =============================================
-- FIX USER_PROFILES RLS FOR BUSINESS REGISTRATION
-- Migration: 06_fix_user_profiles_rls.sql
-- =============================================

-- Enable RLS on user_profiles if not already enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing user_profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated users can insert their own profile" ON user_profiles;

-- Allow users to read their own profile
CREATE POLICY "Users can view their own profile" 
ON user_profiles FOR SELECT 
TO authenticated
USING (auth.uid() = id);

-- Allow authenticated users to insert their own profile during signup
-- This is crucial for both OMD admin onboarding AND business owner registration
CREATE POLICY "Authenticated users can insert their own profile" 
ON user_profiles FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile" 
ON user_profiles FOR UPDATE 
TO authenticated
USING (auth.uid() = id);

-- IMPORTANT: Also allow OMD admins to update user profiles in their OMD
-- (needed for business approval flow)
CREATE POLICY "OMD admins can update user profiles in their OMD" 
ON user_profiles FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid()
    AND up.omd_id = user_profiles.omd_id
    AND up.role IN ('omd_admin', 'super_admin')
  )
);

-- Allow OMD admins to view user profiles in their OMD
CREATE POLICY "OMD admins can view user profiles in their OMD" 
ON user_profiles FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid()
    AND up.omd_id = user_profiles.omd_id
    AND up.role IN ('omd_admin', 'super_admin')
  )
);

