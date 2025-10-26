-- =============================================
-- Migration 21: Temporary permissive RLS for testing
-- =============================================
-- This creates a temporary permissive policy to allow reservation creation
-- WARNING: This is less secure - only use for testing

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Hotel owners can manage their reservations" ON reservations;
DROP POLICY IF EXISTS "OMD admins can view reservations in their OMD" ON reservations;
DROP POLICY IF EXISTS "Super admins can manage all reservations" ON reservations;

-- Create a temporary permissive policy for testing
CREATE POLICY "Temporary: Allow all authenticated users to manage reservations"
ON reservations
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Verify the policy is created
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'reservations';
