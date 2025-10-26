-- =============================================
-- FIX GUEST PROFILES RLS POLICY
-- Migration: 17_fix_guest_profiles_rls.sql
-- =============================================

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Hotel owners can manage guest profiles" ON guest_profiles;

-- Create separate policies for different operations
-- Policy for SELECT: Hotel owners can view guest profiles of their guests
CREATE POLICY "Hotel owners can view guest profiles"
ON guest_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM reservations r
    JOIN hotels h ON r.hotel_id = h.id
    JOIN businesses b ON h.business_id = b.id
    WHERE r.guest_id = guest_profiles.id
    AND b.owner_id = auth.uid()
  )
);

-- Policy for INSERT: Hotel owners can create new guest profiles
CREATE POLICY "Hotel owners can create guest profiles"
ON guest_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow creation if the user is a hotel owner (for new guests)
  EXISTS (
    SELECT 1 FROM hotels h
    JOIN businesses b ON h.business_id = b.id
    WHERE b.owner_id = auth.uid()
  )
);

-- Policy for UPDATE: Hotel owners can update guest profiles of their guests
CREATE POLICY "Hotel owners can update guest profiles"
ON guest_profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM reservations r
    JOIN hotels h ON r.hotel_id = h.id
    JOIN businesses b ON h.business_id = b.id
    WHERE r.guest_id = guest_profiles.id
    AND b.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM reservations r
    JOIN hotels h ON r.hotel_id = h.id
    JOIN businesses b ON h.business_id = b.id
    WHERE r.guest_id = guest_profiles.id
    AND b.owner_id = auth.uid()
  )
);

-- Policy for DELETE: Hotel owners can delete guest profiles of their guests
CREATE POLICY "Hotel owners can delete guest profiles"
ON guest_profiles
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM reservations r
    JOIN hotels h ON r.hotel_id = h.id
    JOIN businesses b ON h.business_id = b.id
    WHERE r.guest_id = guest_profiles.id
    AND b.owner_id = auth.uid()
  )
);

-- =============================================
-- VERIFICATION
-- =============================================

-- Test that hotel owners can create guest profiles
-- This should work now for authenticated hotel owners
SELECT 
  'guest_profiles' as table_name,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'guest_profiles';
