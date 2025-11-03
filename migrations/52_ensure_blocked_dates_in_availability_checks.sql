-- =============================================
-- MIGRATION 52: Ensure Blocked Dates are Properly Filtered in Availability Checks
-- =============================================

-- Update check_hotel_availability to explicitly check for blocked status
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
  -- Check both available_quantity AND availability_status to exclude blocked rooms
  SELECT COUNT(DISTINCT r.id) INTO available_rooms
  FROM rooms r
  WHERE r.hotel_id = p_hotel_id
    AND r.is_active = true
    AND r.max_occupancy >= (p_adults + p_children)
    AND NOT EXISTS (
      -- Check if room is fully booked OR blocked for any date in the stay period
      SELECT 1
      FROM room_availability ra
      WHERE ra.room_id = r.id
        AND ra.date >= p_check_in
        AND ra.date < p_check_out
        AND (
          ra.available_quantity <= 0 
          OR ra.availability_status IN ('blocked', 'maintenance', 'out_of_order')
        )
    );
  
  RETURN available_rooms > 0;
END;
$$ LANGUAGE plpgsql;

-- Create check_hotel_availability_simple_bookings function (if missing)
CREATE OR REPLACE FUNCTION check_hotel_availability_simple_bookings(
  p_hotel_id UUID,
  p_check_in DATE,
  p_check_out DATE,
  p_adults INTEGER DEFAULT 1,
  p_children INTEGER DEFAULT 0
) RETURNS BOOLEAN AS $$
BEGIN
  -- Simply call the main check_hotel_availability function
  RETURN check_hotel_availability(p_hotel_id, p_check_in, p_check_out, p_adults, p_children);
END;
$$ LANGUAGE plpgsql;

-- Update get_hotel_room_availability to exclude blocked rooms
CREATE OR REPLACE FUNCTION get_hotel_room_availability(
  p_hotel_id UUID,
  p_check_in DATE,
  p_check_out DATE,
  p_adults INTEGER DEFAULT 1,
  p_children INTEGER DEFAULT 0
) RETURNS TABLE (
  room_id UUID,
  room_name TEXT,
  room_type TEXT,
  base_price DECIMAL(10,2),
  max_occupancy INTEGER,
  is_available BOOLEAN,
  available_quantity INTEGER,
  min_stay_nights INTEGER,
  dynamic_price DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id as room_id,
    r.name as room_name,
    r.room_type,
    r.base_price,
    r.max_occupancy,
    CASE 
      WHEN r.max_occupancy < (p_adults + p_children) THEN false
      WHEN EXISTS (
        SELECT 1
        FROM room_availability ra
        WHERE ra.room_id = r.id
          AND ra.date >= p_check_in
          AND ra.date < p_check_out
          AND (
            ra.available_quantity <= 0
            OR ra.availability_status IN ('blocked', 'maintenance', 'out_of_order')
          )
      ) THEN false
      ELSE true
    END as is_available,
    COALESCE(
      (SELECT MIN(ra.available_quantity)
       FROM room_availability ra
       WHERE ra.room_id = r.id
         AND ra.date >= p_check_in
         AND ra.date < p_check_out
         AND ra.availability_status NOT IN ('blocked', 'maintenance', 'out_of_order')), 
      r.quantity
    ) as available_quantity,
    COALESCE(r.min_stay_nights, 1) as min_stay_nights,
    -- For now, return base_price as dynamic_price (can be enhanced later)
    r.base_price as dynamic_price
  FROM rooms r
  WHERE r.hotel_id = p_hotel_id
    AND r.is_active = true
  ORDER BY r.base_price ASC;
END;
$$ LANGUAGE plpgsql;

-- Ensure check_room_availability also checks for blocked status explicitly
CREATE OR REPLACE FUNCTION check_room_availability(
  p_room_id UUID,
  p_check_in DATE,
  p_check_out DATE
) RETURNS BOOLEAN AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  -- Check for conflicts in the date range
  -- This includes booked, blocked, maintenance, and out_of_order statuses
  SELECT COUNT(*) INTO conflict_count
  FROM room_availability
  WHERE room_id = p_room_id
    AND date >= p_check_in
    AND date < p_check_out
    AND (
      availability_status IN ('booked', 'blocked', 'maintenance', 'out_of_order')
      OR available_quantity <= 0
    );
  
  RETURN conflict_count = 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_hotel_availability IS 'Checks if hotel has available rooms, excluding blocked/maintenance/out_of_order dates';
COMMENT ON FUNCTION check_hotel_availability_simple_bookings IS 'Alias for check_hotel_availability for backward compatibility';
COMMENT ON FUNCTION check_room_availability IS 'Checks if a specific room is available for dates, excluding blocked/maintenance/out_of_order dates';

