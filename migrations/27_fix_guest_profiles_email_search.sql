-- =============================================
-- 27. FIX GUEST PROFILES RLS FOR EMAIL SEARCH
-- =============================================
-- This migration fixes the RLS policy on guest_profiles to allow
-- hotel owners to search for existing guests by email during booking

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Hotel owners can manage guest profiles" ON guest_profiles;

-- Create separate policies for different operations to be more specific
-- Policy for SELECT: Allow hotel owners to search for any guest by email
CREATE POLICY "Hotel owners can search guest profiles"
ON guest_profiles
FOR SELECT
TO authenticated
USING (
  -- Allow if user is a hotel owner (has a business)
  EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.owner_id = auth.uid()
  )
);

-- Policy for INSERT: Allow hotel owners to create new guest profiles
CREATE POLICY "Hotel owners can create guest profiles"
ON guest_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow creation if user is a hotel owner
  EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.owner_id = auth.uid()
  )
);

-- Policy for UPDATE: Allow hotel owners to update guest profiles
CREATE POLICY "Hotel owners can update guest profiles"
ON guest_profiles
FOR UPDATE
TO authenticated
USING (
  -- Allow if user is a hotel owner
  EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.owner_id = auth.uid()
  )
)
WITH CHECK (
  -- Allow updates if user is a hotel owner
  EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.owner_id = auth.uid()
  )
);

-- Policy for DELETE: Allow hotel owners to delete guest profiles
CREATE POLICY "Hotel owners can delete guest profiles"
ON guest_profiles
FOR DELETE
TO authenticated
USING (
  -- Allow if user is a hotel owner
  EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.owner_id = auth.uid()
  )
);

-- Test the policy by checking if hotel owners can search for guests
SELECT 
  'guest_profiles' as table_name,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'guest_profiles';

-- Show the current policy details
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'guest_profiles';
