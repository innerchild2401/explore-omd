-- =============================================
-- FIX ROOM AVAILABILITY TRIGGERS
-- Migration: 43_fix_room_availability_triggers.sql
-- =============================================
-- Add SECURITY DEFINER to room availability trigger functions
-- so they can insert/update room_availability records
-- =============================================

-- Fix the create_room_availability function
DROP FUNCTION IF EXISTS create_room_availability(UUID, DATE, DATE, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION create_room_availability(
  p_room_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_status TEXT DEFAULT 'available'
) RETURNS VOID 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_date DATE;
BEGIN
  FOR current_date IN p_start_date..(p_end_date - 1) LOOP
    INSERT INTO room_availability (room_id, date, availability_status)
    VALUES (p_room_id, current_date, p_status)
    ON CONFLICT (room_id, date) 
    DO UPDATE SET 
      availability_status = EXCLUDED.availability_status,
      last_updated = NOW();
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Fix the update_room_availability_on_booking function (from migration 16)
DROP FUNCTION IF EXISTS update_room_availability_on_booking() CASCADE;

CREATE OR REPLACE FUNCTION update_room_availability_on_booking()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.room_id IS NOT NULL THEN
    -- Mark room as booked for the reservation dates
    PERFORM create_room_availability(
      NEW.room_id, 
      NEW.check_in_date, 
      NEW.check_out_date, 
      'booked'
    );
    
    -- Update room availability records with reservation_id
    UPDATE room_availability
    SET reservation_id = NEW.id
    WHERE room_id = NEW.room_id
      AND date >= NEW.check_in_date
      AND date < NEW.check_out_date;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle room changes
    IF OLD.room_id IS DISTINCT FROM NEW.room_id THEN
      -- Free up old room
      IF OLD.room_id IS NOT NULL THEN
        UPDATE room_availability
        SET availability_status = 'available', reservation_id = NULL
        WHERE room_id = OLD.room_id
          AND date >= OLD.check_in_date
          AND date < OLD.check_out_date;
      END IF;
      
      -- Book new room
      IF NEW.room_id IS NOT NULL THEN
        PERFORM create_room_availability(
          NEW.room_id, 
          NEW.check_in_date, 
          NEW.check_out_date, 
          'booked'
        );
        
        UPDATE room_availability
        SET reservation_id = NEW.id
        WHERE room_id = NEW.room_id
          AND date >= NEW.check_in_date
          AND date < NEW.check_out_date;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the update_availability_on_booking trigger
DROP TRIGGER IF EXISTS update_availability_on_booking ON reservations;
CREATE TRIGGER update_availability_on_booking
  AFTER INSERT OR UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_room_availability_on_booking();

-- Fix the update_room_availability_on_reservation function
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
      
      -- Check if there's already availability data for this room/date
      SELECT * INTO existing_availability
      FROM room_availability
      WHERE room_id = NEW.room_id AND date = check_date;
      
      -- Update availability
      INSERT INTO room_availability (room_id, date, available_quantity, reservation_id)
      VALUES (NEW.room_id, check_date, room_total_quantity - reservation_count, NEW.id)
      ON CONFLICT (room_id, date)
      DO UPDATE SET 
        available_quantity = room_total_quantity - reservation_count,
        reservation_id = CASE 
          WHEN room_total_quantity - reservation_count < room_total_quantity THEN NEW.id
          ELSE NULL
        END,
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

-- Verify the function and trigger were created
SELECT 
  'Functions' as check_type,
  COUNT(*) as count
FROM pg_proc
WHERE proname = 'update_room_availability_on_reservation';

SELECT 
  'Triggers' as check_type,
  COUNT(*) as count
FROM pg_trigger
WHERE tgname = 'trigger_update_room_availability';

