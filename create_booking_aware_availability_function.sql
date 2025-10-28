-- Create a proper hotel availability function that checks for actual bookings
-- This version checks reservations to see if rooms are actually available

CREATE OR REPLACE FUNCTION check_hotel_availability_with_bookings(
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
  -- This checks both room capacity and existing reservations
  SELECT COUNT(DISTINCT r.id) INTO available_rooms
  FROM rooms r
  WHERE r.hotel_id = p_hotel_id
    AND r.is_active = true
    AND r.max_occupancy >= (p_adults + p_children)
    AND r.quantity > 0
    AND NOT EXISTS (
      -- Check if room is fully booked for any date in the stay period
      SELECT 1
      FROM reservations res
      WHERE res.room_id = r.id
        AND res.reservation_status IN ('confirmed', 'checked_in')
        AND res.check_in_date < p_check_out
        AND res.check_out_date > p_check_in
        -- Check if all rooms of this type are booked
        AND (
          SELECT COUNT(DISTINCT res2.individual_room_id)
          FROM reservations res2
          WHERE res2.room_id = r.id
            AND res2.reservation_status IN ('confirmed', 'checked_in')
            AND res2.check_in_date < p_check_out
            AND res2.check_out_date > p_check_in
        ) >= r.quantity
    );
  
  RETURN available_rooms > 0;
END;
$$ LANGUAGE plpgsql;

-- Alternative simpler version that checks if ANY room of the type is available
CREATE OR REPLACE FUNCTION check_hotel_availability_simple_bookings(
  p_hotel_id UUID,
  p_check_in DATE,
  p_check_out DATE,
  p_adults INTEGER DEFAULT 1,
  p_children INTEGER DEFAULT 0
) RETURNS BOOLEAN AS $$
DECLARE
  room_count INTEGER;
BEGIN
  -- Check if hotel has rooms that are not fully booked
  SELECT COUNT(DISTINCT r.id) INTO room_count
  FROM rooms r
  WHERE r.hotel_id = p_hotel_id
    AND r.is_active = true
    AND r.max_occupancy >= (p_adults + p_children)
    AND r.quantity > 0
    AND (
      -- Either no reservations exist for this room type in this period
      NOT EXISTS (
        SELECT 1
        FROM reservations res
        WHERE res.room_id = r.id
          AND res.reservation_status IN ('confirmed', 'checked_in')
          AND res.check_in_date < p_check_out
          AND res.check_out_date > p_check_in
      )
      -- OR there are reservations but not all rooms are booked
      OR (
        SELECT COUNT(DISTINCT res.individual_room_id)
        FROM reservations res
        WHERE res.room_id = r.id
          AND res.reservation_status IN ('confirmed', 'checked_in')
          AND res.check_in_date < p_check_out
          AND res.check_out_date > p_check_in
      ) < r.quantity
    );
  
  RETURN room_count > 0;
END;
$$ LANGUAGE plpgsql;
