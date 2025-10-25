-- =============================================
-- FIX USER_PROFILES INFINITE RECURSION
-- Migration: 12_fix_user_profiles_infinite_recursion.sql
-- =============================================
--
-- Problem: The "OMD admins can view user profiles in their OMD" policy
-- causes infinite recursion because it queries user_profiles 
-- to check if the current user is an admin
--
-- Solution: Remove the recursive policy and only keep the simple ones
-- =============================================

-- Drop ALL existing user_profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "OMD admins can update user profiles in their OMD" ON user_profiles;
DROP POLICY IF EXISTS "OMD admins can view user profiles in their OMD" ON user_profiles;

-- =============================================
-- SELECT POLICIES (Read Access)
-- =============================================

-- Users can ALWAYS view their own profile
-- This is the PRIMARY policy and must work without any subqueries
CREATE POLICY "Users can view their own profile"
ON user_profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- =============================================
-- INSERT POLICIES
-- =============================================

-- Users can insert their own profile (during signup/onboarding)
CREATE POLICY "Users can insert their own profile"
ON user_profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- =============================================
-- UPDATE POLICIES
-- =============================================

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON user_profiles FOR UPDATE
TO authenticated
USING (id = auth.uid());

-- =============================================
-- VERIFY POLICIES
-- =============================================

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
WHERE tablename = 'user_profiles'
ORDER BY cmd, policyname;

