-- =============================================
-- Apply Double-Booking Prevention System
-- Run this in Supabase SQL Editor
-- =============================================

-- Function to check if a room is available for a specific date range
CREATE OR REPLACE FUNCTION is_room_available_for_reservation(
  p_individual_room_id UUID,
  p_check_in_date DATE,
  p_check_out_date DATE,
  p_reservation_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_conflicting_reservations INTEGER;
BEGIN
  -- Check if there are any other confirmed/checked-in reservations for this room
  -- that overlap with the requested dates
  SELECT COUNT(*) INTO v_conflicting_reservations
  FROM reservations r
  WHERE r.individual_room_id = p_individual_room_id
    AND r.id != COALESCE(p_reservation_id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND r.reservation_status IN ('confirmed', 'checked_in', 'checked_out')
    AND NOT (r.check_out_date <= p_check_in_date OR r.check_in_date >= p_check_out_date);
  
  -- Return true if no conflicts (room is available)
  RETURN v_conflicting_reservations = 0;
END;
$$ LANGUAGE plpgsql;

-- Function to safely assign a room to a reservation
CREATE OR REPLACE FUNCTION safe_assign_room_to_reservation(
  p_reservation_id UUID,
  p_individual_room_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_reservation reservations%ROWTYPE;
  v_room_available BOOLEAN;
  v_result JSONB;
BEGIN
  -- Get reservation details
  SELECT * INTO v_reservation
  FROM reservations
  WHERE id = p_reservation_id;
  
  -- Check if reservation exists
  IF v_reservation.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservation not found');
  END IF;
  
  -- Check if room is available
  SELECT is_room_available_for_reservation(
    p_individual_room_id,
    v_reservation.check_in_date,
    v_reservation.check_out_date,
    p_reservation_id
  ) INTO v_room_available;
  
  -- If room is not available, return error
  IF NOT v_room_available THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Room is already booked for these dates. Please select a different room.'
    );
  END IF;
  
  -- Assign room to reservation
  UPDATE reservations
  SET 
    individual_room_id = p_individual_room_id,
    assignment_method = 'manual',
    updated_at = NOW()
  WHERE id = p_reservation_id;
  
  RETURN jsonb_build_object('success', true, 'reservation_id', p_reservation_id);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to check availability before assigning room
CREATE OR REPLACE FUNCTION check_room_availability_before_update()
RETURNS TRIGGER AS $$
DECLARE
  v_room_available BOOLEAN;
BEGIN
  -- Only check if individual_room_id is being updated
  IF TG_OP = 'UPDATE' AND NEW.individual_room_id IS DISTINCT FROM OLD.individual_room_id 
     AND NEW.individual_room_id IS NOT NULL THEN
    
    -- Check if room is available
    SELECT is_room_available_for_reservation(
      NEW.individual_room_id,
      NEW.check_in_date,
      NEW.check_out_date,
      NEW.id
    ) INTO v_room_available;
    
    -- If room is not available, prevent the update
    IF NOT v_room_available THEN
      RAISE EXCEPTION 'Room % is already booked for these dates. Cannot assign to reservation %.', 
        NEW.individual_room_id, NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS check_room_availability ON reservations;
CREATE TRIGGER check_room_availability
  BEFORE UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION check_room_availability_before_update();

-- Function to handle reservation cancellation and free up the room
CREATE OR REPLACE FUNCTION handle_reservation_cancellation()
RETURNS TRIGGER AS $$
BEGIN
  -- When a reservation is cancelled or deleted, free up the room
  IF OLD.reservation_status != 'cancelled' 
     AND NEW.reservation_status = 'cancelled'
     AND OLD.individual_room_id IS NOT NULL THEN
    
    -- Clear the room assignment so the room becomes available
    UPDATE reservations
    SET individual_room_id = NULL,
        assignment_method = NULL
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for cancellation handling
DROP TRIGGER IF EXISTS handle_cancellation ON reservations;
CREATE TRIGGER handle_cancellation
  AFTER UPDATE OF reservation_status ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION handle_reservation_cancellation();
