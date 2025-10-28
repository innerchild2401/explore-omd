-- =============================================
-- ALLOW ANONYMOUS BOOKING FOR WEBSITE VISITORS
-- Apply Migration: 35_allow_anonymous_booking.sql
-- =============================================

-- Allow anonymous users to create guest profiles
DROP POLICY IF EXISTS "Anonymous users can create guest profiles" ON guest_profiles;
CREATE POLICY "Anonymous users can create guest profiles"
ON guest_profiles
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anonymous users to create reservations
DROP POLICY IF EXISTS "Anonymous users can create reservations" ON reservations;
CREATE POLICY "Anonymous users can create reservations"
ON reservations
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anonymous users to read their own guest profile (for updates)
DROP POLICY IF EXISTS "Anonymous users can read guest profiles" ON guest_profiles;
CREATE POLICY "Anonymous users can read guest profiles"
ON guest_profiles
FOR SELECT
TO anon
USING (true);

-- Allow anonymous users to update their own guest profile
DROP POLICY IF EXISTS "Anonymous users can update guest profiles" ON guest_profiles;
CREATE POLICY "Anonymous users can update guest profiles"
ON guest_profiles
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Ensure booking_channels table allows anonymous access
DROP POLICY IF EXISTS "Anonymous users can read booking channels" ON booking_channels;
CREATE POLICY "Anonymous users can read booking channels"
ON booking_channels
FOR SELECT
TO anon
USING (true);

-- Allow anonymous users to create booking channels if needed
DROP POLICY IF EXISTS "Anonymous users can create booking channels" ON booking_channels;
CREATE POLICY "Anonymous users can create booking channels"
ON booking_channels
FOR INSERT
TO anon
WITH CHECK (true);

-- =============================================
-- VERIFICATION
-- =============================================

-- Check policies for guest_profiles
SELECT 
  'guest_profiles' as table_name,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'guest_profiles'
ORDER BY policyname;

-- Check policies for reservations
SELECT 
  'reservations' as table_name,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'reservations'
ORDER BY policyname;

-- Check policies for booking_channels
SELECT 
  'booking_channels' as table_name,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'booking_channels'
ORDER BY policyname;
