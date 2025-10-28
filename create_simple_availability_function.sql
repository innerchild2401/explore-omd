-- Create a simpler hotel availability function
-- This version doesn't rely on room_availability table

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
