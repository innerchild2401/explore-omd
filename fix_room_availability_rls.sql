-- =============================================
-- FIX ROOM_AVAILABILITY RLS FOR ANONYMOUS USERS
-- =============================================

-- First, check what policies exist for room_availability
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'room_availability'
ORDER BY policyname;

-- Allow anonymous users to read room availability
DROP POLICY IF EXISTS "Anonymous users can read room availability" ON room_availability;
CREATE POLICY "Anonymous users can read room availability"
ON room_availability
FOR SELECT
TO anon
USING (true);

-- Allow anonymous users to insert room availability records
DROP POLICY IF EXISTS "Anonymous users can insert room availability" ON room_availability;
CREATE POLICY "Anonymous users can insert room availability"
ON room_availability
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anonymous users to update room availability records
DROP POLICY IF EXISTS "Anonymous users can update room availability" ON room_availability;
CREATE POLICY "Anonymous users can update room availability"
ON room_availability
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Verify the policies
SELECT 
  'room_availability' as table_name,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'room_availability'
AND 'anon' = ANY(roles)
ORDER BY policyname;
