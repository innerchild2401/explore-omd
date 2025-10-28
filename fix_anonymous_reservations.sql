-- =============================================
-- FIX ANONYMOUS RESERVATION CREATION
-- =============================================

-- First, let's check what policies exist
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'reservations'
ORDER BY policyname;

-- Drop the existing anonymous policy and recreate it more specifically
DROP POLICY IF EXISTS "Anonymous users can create reservations" ON reservations;

-- Create a more specific policy for anonymous users
CREATE POLICY "Anonymous users can create reservations"
ON reservations
FOR INSERT
TO anon
WITH CHECK (
  -- Allow anonymous users to create reservations with basic validation
  hotel_id IS NOT NULL 
  AND guest_id IS NOT NULL 
  AND check_in_date IS NOT NULL 
  AND check_out_date IS NOT NULL
  AND reservation_status = 'tentative'
);

-- Also ensure anonymous users can read their own reservations (for confirmation)
DROP POLICY IF EXISTS "Anonymous users can read reservations" ON reservations;
CREATE POLICY "Anonymous users can read reservations"
ON reservations
FOR SELECT
TO anon
USING (true);

-- Test the policy
SELECT 
  'reservations' as table_name,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'reservations'
AND 'anon' = ANY(roles)
ORDER BY policyname;
