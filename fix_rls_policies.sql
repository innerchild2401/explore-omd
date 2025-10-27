-- Fix RLS policies to use hotels table instead of businesses
-- Drop the old policies
DROP POLICY IF EXISTS "Hotel owners can manage their reservations" ON reservations;
DROP POLICY IF EXISTS "OMD admins can view reservations in their OMD" ON reservations;

-- Recreate with correct logic - checking hotels table
CREATE POLICY "Hotel owners can manage their reservations"
ON reservations
FOR ALL
TO authenticated
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1
    FROM hotels h
    JOIN businesses b ON h.business_id = b.id
    WHERE h.id = reservations.hotel_id
    AND b.owner_id = auth.uid()
  )
);

CREATE POLICY "OMD admins can view reservations in their OMD"
ON reservations
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1
    FROM hotels h
    JOIN businesses b ON h.business_id = b.id
    JOIN user_profiles up ON up.omd_id = b.omd_id
    WHERE h.id = reservations.hotel_id
    AND up.id = auth.uid()
  )
);

