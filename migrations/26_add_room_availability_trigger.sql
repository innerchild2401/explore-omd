-- =============================================
-- 26. ADD ROOM AVAILABILITY UPDATE TRIGGER
-- =============================================
-- This migration adds a trigger to automatically update room_availability
-- when reservations are created, updated, or deleted

-- Function to update room availability based on reservations
CREATE OR REPLACE FUNCTION update_room_availability_on_reservation()
RETURNS TRIGGER AS $$
DECLARE
  check_date DATE;
  reservation_count INTEGER;
  room_total_quantity INTEGER;
BEGIN
  -- Handle different trigger operations
  IF TG_OP = 'DELETE' THEN
    -- When a reservation is deleted, we need to restore availability
    check_date := OLD.check_in_date;
    
    WHILE check_date < OLD.check_out_date LOOP
      -- Get current reservation count for this room and date
      SELECT COUNT(*) INTO reservation_count
      FROM reservations r
      WHERE r.room_id = OLD.room_id
        AND r.check_in_date <= check_date
        AND r.check_out_date > check_date
        AND r.reservation_status IN ('confirmed', 'checked_in', 'checked_out');
      
      -- Get room total quantity
      SELECT quantity INTO room_total_quantity
      FROM rooms
      WHERE id = OLD.room_id;
      
      -- Update availability
      INSERT INTO room_availability (room_id, date, available_quantity)
      VALUES (OLD.room_id, check_date, room_total_quantity - reservation_count)
      ON CONFLICT (room_id, date)
      DO UPDATE SET 
        available_quantity = room_total_quantity - reservation_count,
        last_updated = NOW();
      
      check_date := check_date + INTERVAL '1 day';
    END LOOP;
    
    RETURN OLD;
    
  ELSIF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- When a reservation is created or updated
    check_date := NEW.check_in_date;
    
    WHILE check_date < NEW.check_out_date LOOP
      -- Get current reservation count for this room and date
      SELECT COUNT(*) INTO reservation_count
      FROM reservations r
      WHERE r.room_id = NEW.room_id
        AND r.check_in_date <= check_date
        AND r.check_out_date > check_date
        AND r.reservation_status IN ('confirmed', 'checked_in', 'checked_out');
      
      -- Get room total quantity
      SELECT quantity INTO room_total_quantity
      FROM rooms
      WHERE id = NEW.room_id;
      
      -- Update availability
      INSERT INTO room_availability (room_id, date, available_quantity)
      VALUES (NEW.room_id, check_date, room_total_quantity - reservation_count)
      ON CONFLICT (room_id, date)
      DO UPDATE SET 
        available_quantity = room_total_quantity - reservation_count,
        last_updated = NOW();
      
      check_date := check_date + INTERVAL '1 day';
    END LOOP;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for reservations table
DROP TRIGGER IF EXISTS trigger_update_room_availability ON reservations;
CREATE TRIGGER trigger_update_room_availability
  AFTER INSERT OR UPDATE OR DELETE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_room_availability_on_reservation();

-- Function to recalculate all room availability based on current reservations
CREATE OR REPLACE FUNCTION recalculate_all_room_availability()
RETURNS VOID AS $$
DECLARE
  room_record RECORD;
  check_date DATE;
  reservation_count INTEGER;
BEGIN
  -- Clear existing availability data
  DELETE FROM room_availability;
  
  -- For each room, calculate availability for the next 365 days
  FOR room_record IN 
    SELECT id, quantity FROM rooms
  LOOP
    check_date := CURRENT_DATE;
    
    -- Calculate availability for next 365 days
    FOR i IN 0..364 LOOP
      -- Count reservations for this room and date
      SELECT COUNT(*) INTO reservation_count
      FROM reservations r
      WHERE r.room_id = room_record.id
        AND r.check_in_date <= check_date
        AND r.check_out_date > check_date
        AND r.reservation_status IN ('confirmed', 'checked_in', 'checked_out');
      
      -- Insert availability record
      INSERT INTO room_availability (room_id, date, available_quantity)
      VALUES (room_record.id, check_date, room_record.quantity - reservation_count);
      
      check_date := check_date + INTERVAL '1 day';
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Recalculate all room availability to fix any existing data inconsistencies
SELECT recalculate_all_room_availability();

-- Test the trigger by checking current reservations and their availability impact
SELECT 
  'Testing room availability trigger' as test_description,
  COUNT(*) as total_reservations
FROM reservations
WHERE reservation_status IN ('confirmed', 'checked_in', 'checked_out');
