-- =============================================
-- Migration 45: Fix reservations RLS policies to work with hotels.id
-- =============================================
-- This migration fixes RLS policies that assume hotel_id references businesses.id
-- when it actually references hotels.id

-- =============================================
-- 1. DROP AND RECREATE RESERVATIONS RLS POLICIES
-- =============================================

-- Drop old policies
DROP POLICY IF EXISTS "Hotel owners can manage reservations" ON reservations;
DROP POLICY IF EXISTS "Hotel owners can manage their reservations" ON reservations;
DROP POLICY IF EXISTS "OMD admins can view reservations in their OMD" ON reservations;
DROP POLICY IF EXISTS "Super admins can manage all reservations" ON reservations;
DROP POLICY IF EXISTS "Anonymous users can create reservations" ON reservations;
DROP POLICY IF EXISTS "Anonymous users can read reservations" ON reservations;

-- Create new policy for hotel owners
-- hotel_id references hotels.id, so we need to join: reservations -> hotels -> businesses
CREATE POLICY "Hotel owners can manage reservations"
ON reservations
FOR ALL
TO authenticated
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 
    FROM hotels h
    JOIN businesses b ON b.id = h.business_id
    WHERE h.id = reservations.hotel_id
    AND b.owner_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 
    FROM hotels h
    JOIN businesses b ON b.id = h.business_id
    WHERE h.id = reservations.hotel_id
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
    FROM hotels h
    JOIN businesses b ON b.id = h.business_id
    JOIN user_profiles up ON up.omd_id = b.omd_id
    WHERE h.id = reservations.hotel_id
    AND up.id = auth.uid()
    AND up.role IN ('omd_admin', 'super_admin')
  )
);

-- Policy for super admins
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

-- Anonymous users can create reservations
CREATE POLICY "Anonymous users can create reservations"
ON reservations
FOR INSERT
TO anon, authenticated
WITH CHECK (
  hotel_id IS NOT NULL 
  AND guest_id IS NOT NULL 
  AND check_in_date IS NOT NULL 
  AND check_out_date IS NOT NULL 
  AND reservation_status = 'tentative'
);

-- Anonymous users can read reservations
CREATE POLICY "Anonymous users can read reservations"
ON reservations
FOR SELECT
TO anon, authenticated
USING (true);

-- =============================================
-- 2. DROP AND RECREATE BOOKING EVENTS RLS POLICIES
-- =============================================

-- Drop old policies
DROP POLICY IF EXISTS "Hotel owners can view booking events" ON booking_events;
DROP POLICY IF EXISTS "Hotel owners can manage booking events" ON booking_events;

-- Create new policy with correct schema
CREATE POLICY "Hotel owners can view booking events"
ON booking_events
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM reservations r
    JOIN hotels h ON h.id = r.hotel_id
    JOIN businesses b ON b.id = h.business_id
    WHERE r.id = booking_events.reservation_id
    AND b.owner_id = auth.uid()
  )
);

-- =============================================
-- 3. DROP AND RECREATE PAYMENT TRANSACTIONS RLS POLICIES
-- =============================================

-- Drop old policies
DROP POLICY IF EXISTS "Hotel owners can manage payment transactions" ON payment_transactions;

-- Create new policy with correct schema
CREATE POLICY "Hotel owners can manage payment transactions"
ON payment_transactions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM reservations r
    JOIN hotels h ON h.id = r.hotel_id
    JOIN businesses b ON b.id = h.business_id
    WHERE r.id = payment_transactions.reservation_id
    AND b.owner_id = auth.uid()
  )
);

-- =============================================
-- VERIFICATION
-- =============================================

-- Verify reservations policies
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'reservations'
ORDER BY policyname;

