-- Fix the hotel availability function
-- The current function might be too strict

CREATE OR REPLACE FUNCTION check_hotel_availability(
  p_hotel_id UUID,
  p_check_in DATE,
  p_check_out DATE,
  p_adults INTEGER DEFAULT 1,
  p_children INTEGER DEFAULT 0
) RETURNS BOOLEAN AS $$
DECLARE
  available_rooms INTEGER;
BEGIN
  -- Count rooms that have availability for the entire stay period
  SELECT COUNT(DISTINCT r.id) INTO available_rooms
  FROM rooms r
  WHERE r.hotel_id = p_hotel_id
    AND r.is_active = true
    AND r.max_occupancy >= (p_adults + p_children)
    AND r.quantity > 0  -- Make sure room has quantity > 0
    AND NOT EXISTS (
      -- Check if room is fully booked for any date in the stay period
      -- Only check if there are actual availability records
      SELECT 1
      FROM room_availability ra
      WHERE ra.room_id = r.id
        AND ra.date >= p_check_in
        AND ra.date < p_check_out
        AND ra.available_quantity <= 0
    );
  
  RETURN available_rooms > 0;
END;
$$ LANGUAGE plpgsql;

-- Also create a simpler version for testing
CREATE OR REPLACE FUNCTION check_hotel_availability_simple(
  p_hotel_id UUID,
  p_check_in DATE,
  p_check_out DATE,
  p_adults INTEGER DEFAULT 1,
  p_children INTEGER DEFAULT 0
) RETURNS BOOLEAN AS $$
DECLARE
  room_count INTEGER;
BEGIN
  -- Simply check if hotel has any active rooms that can accommodate the guests
  SELECT COUNT(*) INTO room_count
  FROM rooms r
  WHERE r.hotel_id = p_hotel_id
    AND r.is_active = true
    AND r.max_occupancy >= (p_adults + p_children)
    AND r.quantity > 0;
  
  RETURN room_count > 0;
END;
$$ LANGUAGE plpgsql;
