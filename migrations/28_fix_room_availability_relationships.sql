-- =============================================
-- 28. FIX ROOM_AVAILABILITY DATABASE RELATIONSHIPS
-- =============================================
-- This migration fixes the database schema to properly relate
-- room_availability with reservations for better query performance

-- First, let's check the current schema of room_availability
SELECT 
  'Current Schema Check' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'room_availability'
ORDER BY ordinal_position;

-- Add reservation_id column if it doesn't exist (it should from migration 16)
-- But let's make sure it's properly set up
ALTER TABLE room_availability 
ADD COLUMN IF NOT EXISTS reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL;

-- Create an index on reservation_id for better performance
CREATE INDEX IF NOT EXISTS idx_room_availability_reservation_id 
ON room_availability(reservation_id);

-- Update the trigger to properly set reservation_id when reservations are created
-- This will make the relationship work correctly
CREATE OR REPLACE FUNCTION update_room_availability_on_reservation()
RETURNS TRIGGER AS $$
DECLARE
  check_date DATE;
  reservation_count INTEGER;
  room_total_quantity INTEGER;
  existing_availability RECORD;
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
      INSERT INTO room_availability (room_id, date, available_quantity, reservation_id)
      VALUES (OLD.room_id, check_date, room_total_quantity - reservation_count, NULL)
      ON CONFLICT (room_id, date)
      DO UPDATE SET 
        available_quantity = room_total_quantity - reservation_count,
        reservation_id = NULL,
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

-- Recreate the trigger to use the updated function
DROP TRIGGER IF EXISTS trigger_update_room_availability ON reservations;
CREATE TRIGGER trigger_update_room_availability
  AFTER INSERT OR UPDATE OR DELETE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_room_availability_on_reservation();

-- Test the relationship by checking if we can now join properly
SELECT 
  'Relationship Test' as check_type,
  ra.room_id,
  ra.date,
  ra.available_quantity,
  ra.reservation_id,
  r.confirmation_number,
  r.reservation_status
FROM room_availability ra
LEFT JOIN reservations r ON ra.reservation_id = r.id
WHERE ra.date >= CURRENT_DATE 
  AND ra.date <= CURRENT_DATE + INTERVAL '7 days'
ORDER BY ra.room_id, ra.date
LIMIT 10;
