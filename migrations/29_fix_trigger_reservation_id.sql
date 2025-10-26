-- =============================================
-- 29. FIX TRIGGER TO PROPERLY SET RESERVATION_ID
-- =============================================
-- The issue is that when multiple reservations affect the same room/date,
-- we can't set a single reservation_id. We need a different approach.

-- Drop the current trigger and function
DROP TRIGGER IF EXISTS trigger_update_room_availability ON reservations;
DROP FUNCTION IF EXISTS update_room_availability_on_reservation();

-- Create a better approach: Create a view that dynamically calculates availability
-- and shows the most recent reservation that affects each room/date
CREATE OR REPLACE FUNCTION update_room_availability_on_reservation()
RETURNS TRIGGER AS $$
DECLARE
  check_date DATE;
  reservation_count INTEGER;
  room_total_quantity INTEGER;
  most_recent_reservation_id UUID;
BEGIN
  -- Handle different trigger operations
  IF TG_OP = 'DELETE' THEN
    -- When a reservation is deleted, recalculate availability
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
      
      -- Get the most recent reservation that affects this room/date
      SELECT r.id INTO most_recent_reservation_id
      FROM reservations r
      WHERE r.room_id = OLD.room_id
        AND r.check_in_date <= check_date
        AND r.check_out_date > check_date
        AND r.reservation_status IN ('confirmed', 'checked_in', 'checked_out')
      ORDER BY r.created_at DESC
      LIMIT 1;
      
      -- Update availability
      INSERT INTO room_availability (room_id, date, available_quantity, reservation_id)
      VALUES (OLD.room_id, check_date, room_total_quantity - reservation_count, most_recent_reservation_id)
      ON CONFLICT (room_id, date)
      DO UPDATE SET 
        available_quantity = room_total_quantity - reservation_count,
        reservation_id = most_recent_reservation_id,
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
      
      -- Get the most recent reservation that affects this room/date
      SELECT r.id INTO most_recent_reservation_id
      FROM reservations r
      WHERE r.room_id = NEW.room_id
        AND r.check_in_date <= check_date
        AND r.check_out_date > check_date
        AND r.reservation_status IN ('confirmed', 'checked_in', 'checked_out')
      ORDER BY r.created_at DESC
      LIMIT 1;
      
      -- Update availability
      INSERT INTO room_availability (room_id, date, available_quantity, reservation_id)
      VALUES (NEW.room_id, check_date, room_total_quantity - reservation_count, most_recent_reservation_id)
      ON CONFLICT (room_id, date)
      DO UPDATE SET 
        available_quantity = room_total_quantity - reservation_count,
        reservation_id = most_recent_reservation_id,
        last_updated = NOW();
      
      check_date := check_date + INTERVAL '1 day';
    END LOOP;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_update_room_availability
  AFTER INSERT OR UPDATE OR DELETE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_room_availability_on_reservation();

-- Test the updated trigger by checking Suita room again
SELECT 
  'Updated Trigger Test' as check_type,
  ra.room_id,
  ro.name as room_name,
  ra.date,
  ra.available_quantity,
  ra.reservation_id,
  r.confirmation_number,
  r.reservation_status
FROM room_availability ra
JOIN rooms ro ON ra.room_id = ro.id
LEFT JOIN reservations r ON ra.reservation_id = r.id
WHERE ro.name = 'Suita'
  AND ra.date >= CURRENT_DATE 
  AND ra.date <= CURRENT_DATE + INTERVAL '7 days'
ORDER BY ra.date;
