-- =============================================
-- Migration 23: Fix RLS policy for hotel owners creating reservations
-- =============================================
-- This migration fixes the RLS policy to allow hotel owners to create reservations
-- for their own hotel (for testing/admin purposes)

-- Drop existing policies
DROP POLICY IF EXISTS "Hotel owners can manage their reservations" ON reservations;
DROP POLICY IF EXISTS "OMD admins can view reservations in their OMD" ON reservations;
DROP POLICY IF EXISTS "Super admins can manage all reservations" ON reservations;

-- Create a policy that allows hotel owners to create reservations for their own hotel
CREATE POLICY "Hotel owners can manage their reservations"
ON reservations
FOR ALL
TO authenticated
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1
    FROM businesses b
    WHERE b.id = hotel_id
    AND b.owner_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1
    FROM businesses b
    WHERE b.id = hotel_id
    AND b.owner_id = auth.uid()
  )
);

-- Policy for OMD admins to view reservations
CREATE POLICY "OMD admins can view reservations in their OMD"
ON reservations
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1
    FROM businesses b
    JOIN user_profiles up ON up.omd_id = b.omd_id
    WHERE b.id = hotel_id
    AND up.id = auth.uid()
    AND up.role IN ('omd_admin', 'super_admin')
  )
);

-- Policy for super admins to manage all reservations
CREATE POLICY "Super admins can manage all reservations"
ON reservations
FOR ALL
TO authenticated
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1
    FROM user_profiles up
    WHERE up.id = auth.uid()
    AND up.role = 'super_admin'
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1
    FROM user_profiles up
    WHERE up.id = auth.uid()
    AND up.role = 'super_admin'
  )
);

-- Verify policies are created
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'reservations';
