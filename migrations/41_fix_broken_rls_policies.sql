-- =============================================
-- FIX BROKEN RLS POLICIES AND ANALYTICS TRIGGERS
-- Migration: 41_fix_broken_rls_policies.sql
-- =============================================
-- Fix RLS policies that incorrectly assume reservations.hotel_id -> hotels.id
-- when it actually references businesses.id directly
-- Also fix analytics triggers with incorrect field names
-- =============================================

-- =============================================
-- PART 1: FIX ANALYTICS TRIGGERS
-- =============================================

-- Fix hotel revenue trigger
CREATE OR REPLACE FUNCTION auto_track_hotel_revenue()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track for completed bookings (reservation_status = 'confirmed')
  IF NEW.reservation_status = 'confirmed' AND (OLD.reservation_status IS NULL OR OLD.reservation_status != 'confirmed') THEN
    PERFORM track_business_revenue(
      p_business_id := NEW.hotel_id,  -- hotel_id references businesses.id directly
      p_source_type := 'hotel_reservation',
      p_source_id := NEW.id,
      p_gross_amount := NEW.total_amount,
      p_check_in_date := NEW.check_in_date,
      p_check_out_date := NEW.check_out_date,
      p_payment_status := COALESCE(NEW.payment_status, 'pending')
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger to ensure it uses the updated function
DROP TRIGGER IF EXISTS trigger_auto_track_hotel_revenue ON reservations;
CREATE TRIGGER trigger_auto_track_hotel_revenue
  AFTER INSERT OR UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION auto_track_hotel_revenue();

-- =============================================
-- PART 2: FIX RLS POLICIES
-- =============================================

-- =============================================
-- 1. DROP AND RECREATE GUEST PROFILES RLS POLICIES
-- =============================================

-- Drop old policies - only drop the one that joins through reservations
-- Keep the other ones (search, update, create, delete) that use businesses directly
DROP POLICY IF EXISTS "Hotel owners can manage guest profiles" ON guest_profiles;

-- Ensure anonymous users can create guest profiles (for booking form)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'guest_profiles' 
    AND policyname = 'Anonymous users can create guest profiles'
  ) THEN
    CREATE POLICY "Anonymous users can create guest profiles"
    ON guest_profiles
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'guest_profiles' 
    AND policyname = 'Anonymous users can read guest profiles'
  ) THEN
    CREATE POLICY "Anonymous users can read guest profiles"
    ON guest_profiles
    FOR SELECT
    TO anon, authenticated
    USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'guest_profiles' 
    AND policyname = 'Anonymous users can update guest profiles'
  ) THEN
    CREATE POLICY "Anonymous users can update guest profiles"
    ON guest_profiles
    FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- Create new policy with correct schema
CREATE POLICY "Hotel owners can manage guest profiles"
ON guest_profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM reservations r
    JOIN businesses b ON r.hotel_id = b.id  -- hotel_id references businesses.id
    WHERE r.guest_id = guest_profiles.id
    AND b.owner_id = auth.uid()
  )
);

-- =============================================
-- 2. DROP AND RECREATE RESERVATIONS RLS POLICIES
-- =============================================

-- Drop old policies (both the new one and the old duplicate)
DROP POLICY IF EXISTS "Hotel owners can manage reservations" ON reservations;
DROP POLICY IF EXISTS "Hotel owners can manage their reservations" ON reservations;
DROP POLICY IF EXISTS "OMD admins can view reservations in their OMD" ON reservations;

-- Create new policy with correct schema
CREATE POLICY "Hotel owners can manage reservations"
ON reservations
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.id = reservations.hotel_id  -- hotel_id references businesses.id directly
    AND b.owner_id = auth.uid()
  )
);

-- Create OMD admin policy with correct schema
CREATE POLICY "OMD admins can view reservations in their OMD"
ON reservations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM businesses b
    JOIN user_profiles up ON up.omd_id = b.omd_id
    WHERE b.id = reservations.hotel_id  -- hotel_id references businesses.id directly
    AND up.id = auth.uid()
    AND up.role IN ('omd_admin', 'super_admin')
  )
);

-- =============================================
-- 3. DROP AND RECREATE BOOKING EVENTS RLS POLICIES
-- =============================================

-- Drop old policies (both the new one and the old duplicate)
DROP POLICY IF EXISTS "Hotel owners can view booking events" ON booking_events;
DROP POLICY IF EXISTS "Hotel owners can manage booking events" ON booking_events;

-- Create new policy with correct schema
CREATE POLICY "Hotel owners can view booking events"
ON booking_events
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM reservations r
    JOIN businesses b ON r.hotel_id = b.id  -- hotel_id references businesses.id
    WHERE r.id = booking_events.reservation_id
    AND b.owner_id = auth.uid()
  )
);

-- =============================================
-- 4. DROP AND RECREATE PAYMENT TRANSACTIONS RLS POLICIES
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
    SELECT 1 FROM reservations r
    JOIN businesses b ON r.hotel_id = b.id  -- hotel_id references businesses.id
    WHERE r.id = payment_transactions.reservation_id
    AND b.owner_id = auth.uid()
  )
);

-- =============================================
-- 5. VERIFY ROOM AVAILABILITY POLICIES (should be OK but verify)
-- =============================================

-- Note: Room availability policies should work because they join through rooms -> hotels -> businesses
-- But let's make sure they're correct:
DROP POLICY IF EXISTS "Hotel owners can manage room availability" ON room_availability;

CREATE POLICY "Hotel owners can manage room availability"
ON room_availability
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM rooms r
    JOIN hotels h ON r.hotel_id = h.id  -- rooms.hotel_id references hotels.id
    JOIN businesses b ON h.business_id = b.id  -- hotels.business_id references businesses.id
    WHERE r.id = room_availability.room_id
    AND b.owner_id = auth.uid()
  )
);

-- =============================================
-- VERIFICATION
-- =============================================

-- Show all policies that reference reservations
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('guest_profiles', 'reservations', 'booking_events', 'payment_transactions', 'room_availability')
ORDER BY tablename, policyname;

