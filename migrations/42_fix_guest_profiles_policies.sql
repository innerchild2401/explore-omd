-- =============================================
-- FIX GUEST PROFILES POLICIES
-- Migration: 42_fix_guest_profiles_policies.sql
-- =============================================
-- Quick fix to ensure anonymous users can create guest profiles
-- This should be run if migration 41 didn't work properly
-- =============================================

-- Drop all guest_profiles policies to start fresh
DROP POLICY IF EXISTS "Anonymous users can create guest profiles" ON guest_profiles;
DROP POLICY IF EXISTS "Anonymous users can read guest profiles" ON guest_profiles;
DROP POLICY IF EXISTS "Anonymous users can update guest profiles" ON guest_profiles;
DROP POLICY IF EXISTS "Hotel owners can create guest profiles" ON guest_profiles;
DROP POLICY IF EXISTS "Hotel owners can delete guest profiles" ON guest_profiles;
DROP POLICY IF EXISTS "Hotel owners can manage guest profiles" ON guest_profiles;
DROP POLICY IF EXISTS "Hotel owners can search guest profiles" ON guest_profiles;
DROP POLICY IF EXISTS "Hotel owners can update guest profiles" ON guest_profiles;

-- Create anonymous user policies with highest priority
CREATE POLICY "Anonymous users can create guest profiles"
ON guest_profiles
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Anonymous users can read guest profiles"
ON guest_profiles
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Anonymous users can update guest profiles"
ON guest_profiles
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Create hotel owner policies for management
CREATE POLICY "Hotel owners can create guest profiles"
ON guest_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.owner_id = auth.uid()
  )
);

CREATE POLICY "Hotel owners can delete guest profiles"
ON guest_profiles
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.owner_id = auth.uid()
  )
);

CREATE POLICY "Hotel owners can search guest profiles"
ON guest_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.owner_id = auth.uid()
  )
);

CREATE POLICY "Hotel owners can update guest profiles"
ON guest_profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.owner_id = auth.uid()
  )
);

CREATE POLICY "Hotel owners can manage guest profiles"
ON guest_profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM reservations r
    JOIN businesses b ON r.hotel_id = b.id
    WHERE r.guest_id = guest_profiles.id
    AND b.owner_id = auth.uid()
  )
);

-- Verify policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'guest_profiles'
ORDER BY policyname;

