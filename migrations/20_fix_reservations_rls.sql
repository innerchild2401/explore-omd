-- =============================================
-- Migration 20: Fix reservations RLS policies
-- =============================================
-- This migration fixes the RLS policies for the reservations table
-- to ensure hotel owners can create reservations

-- Drop existing policies
DROP POLICY IF EXISTS "Hotel owners can manage their reservations" ON reservations;
DROP POLICY IF EXISTS "OMD admins can view reservations in their OMD" ON reservations;

-- Create a more permissive policy for hotel owners
CREATE POLICY "Hotel owners can manage their reservations"
ON reservations
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM businesses b
    WHERE b.id = hotel_id
    AND b.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM businesses b
    WHERE b.id = hotel_id
    AND b.owner_id = auth.uid()
  )
);

-- Create policy for OMD admins to view reservations
CREATE POLICY "OMD admins can view reservations in their OMD"
ON reservations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM businesses b
    JOIN user_profiles up ON up.omd_id = b.omd_id
    WHERE b.id = hotel_id
    AND up.id = auth.uid()
    AND up.role IN ('omd_admin', 'super_admin')
  )
);

-- Create a policy for super admins to manage all reservations
CREATE POLICY "Super admins can manage all reservations"
ON reservations
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM user_profiles up
    WHERE up.id = auth.uid()
    AND up.role = 'super_admin'
  )
)
WITH CHECK (
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
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'reservations';
