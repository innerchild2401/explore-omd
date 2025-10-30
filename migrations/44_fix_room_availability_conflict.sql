-- =============================================
-- FIX ROOM AVAILABILITY TRIGGER CONFLICTS
-- Migration: 44_fix_room_availability_conflict.sql
-- =============================================
-- Remove the conflicting trigger and keep only one
-- =============================================

-- Drop the conflicting trigger (update_room_availability_on_booking)
-- We'll keep only update_room_availability_on_reservation which is more complete
DROP TRIGGER IF EXISTS update_availability_on_booking ON reservations;
DROP FUNCTION IF EXISTS update_room_availability_on_booking() CASCADE;

-- Now fix update_room_availability_on_reservation to work with both columns
DROP FUNCTION IF EXISTS update_room_availability_on_reservation() CASCADE;

CREATE OR REPLACE FUNCTION update_room_availability_on_reservation()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  check_date DATE;
  reservation_count INTEGER;
  room_total_quantity INTEGER;
  existing_availability RECORD;
BEGIN
  -- Handle different trigger operations
  IF TG_OP = 'DELETE' THEN
    -- When a reservation is deleted, restore availability
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
      
      -- Update availability with BOTH available_quantity AND availability_status
      INSERT INTO room_availability (room_id, date, available_quantity, availability_status)
      VALUES (OLD.room_id, check_date, room_total_quantity - reservation_count, 
              CASE WHEN room_total_quantity - reservation_count > 0 THEN 'available' ELSE 'booked' END)
      ON CONFLICT (room_id, date)
      DO UPDATE SET 
        available_quantity = room_total_quantity - reservation_count,
        availability_status = CASE WHEN room_total_quantity - reservation_count > 0 THEN 'available' ELSE 'booked' END,
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
      
      -- Update availability with BOTH available_quantity AND availability_status
      INSERT INTO room_availability (room_id, date, available_quantity, availability_status, reservation_id)
      VALUES (NEW.room_id, check_date, room_total_quantity - reservation_count, 
              CASE WHEN room_total_quantity - reservation_count > 0 THEN 'available' ELSE 'booked' END,
              CASE WHEN room_total_quantity - reservation_count < room_total_quantity THEN NEW.id ELSE NULL END)
      ON CONFLICT (room_id, date)
      DO UPDATE SET 
        available_quantity = room_total_quantity - reservation_count,
        availability_status = CASE WHEN room_total_quantity - reservation_count > 0 THEN 'available' ELSE 'booked' END,
        reservation_id = CASE WHEN room_total_quantity - reservation_count < room_total_quantity THEN NEW.id ELSE NULL END,
        last_updated = NOW();
      
      check_date := check_date + INTERVAL '1 day';
    END LOOP;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_update_room_availability ON reservations;
CREATE TRIGGER trigger_update_room_availability
  AFTER INSERT OR UPDATE OR DELETE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_room_availability_on_reservation();

-- Verify
SELECT 
  'Triggers' as check_type,
  COUNT(*) as count
FROM pg_trigger
WHERE tgname = 'trigger_update_room_availability';

