-- Fix booking_events trigger to run with proper security context
-- SECURITY DEFINER allows the trigger to insert into booking_events
-- bypassing RLS by running with the permissions of the function owner

-- Drop and recreate the function with SECURITY DEFINER
DROP FUNCTION IF EXISTS create_booking_event() CASCADE;

CREATE OR REPLACE FUNCTION create_booking_event()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_desc TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    event_desc := 'Reservation created';
    INSERT INTO booking_events (reservation_id, event_type, event_description, new_values)
    VALUES (NEW.id, 'created', event_desc, row_to_json(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    event_desc := 'Reservation modified';
    INSERT INTO booking_events (reservation_id, event_type, event_description, old_values, new_values)
    VALUES (NEW.id, 'modified', event_desc, row_to_json(OLD), row_to_json(NEW));
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS create_reservation_event ON reservations;
CREATE TRIGGER create_reservation_event
  AFTER INSERT OR UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION create_booking_event();
