-- =============================================
-- Enhanced Hotel Availability System
-- =============================================

-- Function to check if a hotel has any available rooms for given dates
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
    AND NOT EXISTS (
      -- Check if room is fully booked for any date in the stay period
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

-- Function to get room availability details for a hotel
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
          AND ra.available_quantity <= 0
      ) THEN false
      ELSE true
    END as is_available,
    COALESCE(
      (SELECT MIN(ra.available_quantity)
       FROM room_availability ra
       WHERE ra.room_id = r.id
         AND ra.date >= p_check_in
         AND ra.date < p_check_out), 
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

-- Function to check minimum stay requirements
CREATE OR REPLACE FUNCTION check_minimum_stay(
  p_room_id UUID,
  p_check_in DATE,
  p_check_out DATE
) RETURNS BOOLEAN AS $$
DECLARE
  min_stay INTEGER;
  stay_nights INTEGER;
BEGIN
  -- Get minimum stay requirement for the room
  SELECT COALESCE(min_stay_nights, 1) INTO min_stay
  FROM rooms
  WHERE id = p_room_id;
  
  -- Calculate actual stay nights
  stay_nights := p_check_out - p_check_in;
  
  RETURN stay_nights >= min_stay;
END;
$$ LANGUAGE plpgsql;

-- Function to get dynamic pricing for a room (placeholder for future enhancement)
CREATE OR REPLACE FUNCTION get_dynamic_price(
  p_room_id UUID,
  p_check_in DATE,
  p_check_out DATE,
  p_adults INTEGER DEFAULT 1,
  p_children INTEGER DEFAULT 0
) RETURNS DECIMAL(10,2) AS $$
DECLARE
  base_price DECIMAL(10,2);
  total_price DECIMAL(10,2) := 0;
  current_date DATE;
BEGIN
  -- Get base price
  SELECT r.base_price INTO base_price
  FROM rooms r
  WHERE r.id = p_room_id;
  
  -- For now, return base price * nights
  -- This can be enhanced with seasonal pricing, demand-based pricing, etc.
  total_price := base_price * (p_check_out - p_check_in);
  
  RETURN total_price;
END;
$$ LANGUAGE plpgsql;
