-- Fix booking_events RLS policy
-- Run this in your Supabase SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "Hotel owners can manage booking events" ON booking_events;
DROP POLICY IF EXISTS "Hotel owners can view booking events" ON booking_events;
DROP POLICY IF EXISTS "OMD admins can view booking events" ON booking_events;
DROP POLICY IF EXISTS "Super admins can manage all booking events" ON booking_events;

-- Create policy for hotel owners to manage booking events
-- Updated to work with reservations.hotel_id -> businesses.id relationship
CREATE POLICY "Hotel owners can manage booking events"
ON booking_events
FOR ALL
TO authenticated
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1
    FROM reservations r
    JOIN businesses b ON b.id = r.hotel_id
    WHERE r.id = booking_events.reservation_id
    AND b.owner_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1
    FROM reservations r
    JOIN businesses b ON b.id = r.hotel_id
    WHERE r.id = booking_events.reservation_id
    AND b.owner_id = auth.uid()
  )
);

-- Policy for OMD admins to view booking events
CREATE POLICY "OMD admins can view booking events"
ON booking_events
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1
    FROM reservations r
    JOIN businesses b ON b.id = r.hotel_id
    JOIN user_profiles up ON up.omd_id = b.omd_id
    WHERE r.id = booking_events.reservation_id
    AND up.id = auth.uid()
    AND up.role IN ('omd_admin', 'super_admin')
  )
);

-- Policy for super admins to manage all booking events
CREATE POLICY "Super admins can manage all booking events"
ON booking_events
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
