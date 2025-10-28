-- =============================================
-- COMPREHENSIVE RLS FIX FOR BOOKING FLOW
-- =============================================
-- This script fixes RLS policies for ALL tables involved in the booking process

-- Tables involved in booking flow:
-- 1. guest_profiles (SELECT, INSERT, UPDATE)
-- 2. booking_channels (SELECT, INSERT) 
-- 3. reservations (INSERT, SELECT)
-- 4. booking_events (INSERT) - triggered by reservation creation
-- 5. room_availability (INSERT, UPDATE) - triggered by reservation creation
-- 6. rooms (SELECT) - for room quantity checks

-- =============================================
-- CHECK ALL CURRENT POLICIES
-- =============================================
SELECT 'guest_profiles' as table_name, policyname, roles, cmd FROM pg_policies WHERE tablename = 'guest_profiles' AND 'anon' = ANY(roles)
UNION ALL
SELECT 'booking_channels' as table_name, policyname, roles, cmd FROM pg_policies WHERE tablename = 'booking_channels' AND 'anon' = ANY(roles)
UNION ALL
SELECT 'reservations' as table_name, policyname, roles, cmd FROM pg_policies WHERE tablename = 'reservations' AND 'anon' = ANY(roles)
UNION ALL
SELECT 'booking_events' as table_name, policyname, roles, cmd FROM pg_policies WHERE tablename = 'booking_events' AND 'anon' = ANY(roles)
UNION ALL
SELECT 'room_availability' as table_name, policyname, roles, cmd FROM pg_policies WHERE tablename = 'room_availability' AND 'anon' = ANY(roles)
UNION ALL
SELECT 'rooms' as table_name, policyname, roles, cmd FROM pg_policies WHERE tablename = 'rooms' AND 'anon' = ANY(roles)
ORDER BY table_name, cmd;

-- =============================================
-- ADD MISSING POLICIES
-- =============================================

-- Add anonymous access for booking_events
DROP POLICY IF EXISTS "Anonymous users can create booking events" ON booking_events;
CREATE POLICY "Anonymous users can create booking events"
ON booking_events
FOR INSERT
TO anon
WITH CHECK (true);

-- Add anonymous read access for rooms (needed for quantity checks in triggers)
DROP POLICY IF EXISTS "Anonymous users can read rooms" ON rooms;
CREATE POLICY "Anonymous users can read rooms"
ON rooms
FOR SELECT
TO anon
USING (true);

-- =============================================
-- FINAL VERIFICATION
-- =============================================
SELECT 'FINAL CHECK - All anonymous policies:' as final_check;

SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE 'anon' = ANY(roles)
ORDER BY tablename, cmd;
