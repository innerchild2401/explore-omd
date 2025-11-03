-- =============================================
-- MIGRATION 51: Hotel-Wide Room Number Uniqueness
-- Adds hotel_id to individual_rooms and enforces hotel-wide uniqueness
-- Handles existing conflicts by intelligently renaming rooms
-- =============================================

-- =============================================
-- STEP 1: Add hotel_id column to individual_rooms
-- =============================================

ALTER TABLE individual_rooms
ADD COLUMN IF NOT EXISTS hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE;

-- =============================================
-- STEP 2: Backfill hotel_id from room_id relationship
-- =============================================

UPDATE individual_rooms ir
SET hotel_id = (
  SELECT r.hotel_id
  FROM rooms r
  WHERE r.id = ir.room_id
)
WHERE hotel_id IS NULL;

-- =============================================
-- STEP 3: Handle conflicts - rename duplicate room numbers within same hotel
-- Strategy: For each duplicate, keep the first one (by creation date) and rename others
-- We'll add a suffix like "-A", "-B", etc. or use the room type name prefix
-- =============================================

DO $$
DECLARE
  conflict_group RECORD;
  conflict_room RECORD;
  new_room_number TEXT;
  suffix_counter INTEGER;
  room_type_name TEXT;
  room_prefix TEXT;
  v_hotel_id UUID;
  v_room_number TEXT;
BEGIN
  -- Find all hotel_id, room_number combinations that have duplicates
  FOR conflict_group IN
    SELECT 
      ir.hotel_id,
      ir.room_number,
      COUNT(*) as duplicate_count
    FROM individual_rooms ir
    GROUP BY ir.hotel_id, ir.room_number
    HAVING COUNT(*) > 1
  LOOP
    v_hotel_id := conflict_group.hotel_id;
    v_room_number := conflict_group.room_number;
    
    -- For each duplicate group, keep the first (oldest) and rename the rest
    suffix_counter := 0;
    
    FOR conflict_room IN
      SELECT 
        ir.id,
        ir.room_number,
        ir.created_at,
        r.name as room_type_name
      FROM individual_rooms ir
      JOIN rooms r ON r.id = ir.room_id
      WHERE ir.hotel_id = v_hotel_id
        AND ir.room_number = v_room_number
      ORDER BY ir.created_at ASC, ir.id ASC
    LOOP
      -- First occurrence keeps original number
      IF suffix_counter = 0 THEN
        suffix_counter := suffix_counter + 1;
        CONTINUE;
      END IF;
      
      -- For subsequent occurrences, try to generate a new number
      -- Strategy: Add room type prefix or suffix
      room_prefix := UPPER(LEFT(REPLACE(conflict_room.room_type_name, ' ', ''), 3));
      IF room_prefix = '' THEN
        room_prefix := 'R';
      END IF;
      
      -- Try to find a unique number by appending suffix
      new_room_number := conflict_room.room_number || '-' || room_prefix;
      
      -- If that's still taken, try with counter
      WHILE EXISTS (
        SELECT 1 FROM individual_rooms 
        WHERE hotel_id = v_hotel_id 
          AND room_number = new_room_number
      ) LOOP
        suffix_counter := suffix_counter + 1;
        new_room_number := conflict_room.room_number || '-' || suffix_counter::TEXT;
      END LOOP;
      
      -- Update the room number
      UPDATE individual_rooms
      SET room_number = new_room_number,
          updated_at = NOW()
      WHERE id = conflict_room.id;
      
      -- Log the change (we could add an audit table later)
      RAISE NOTICE 'Renamed individual room % from % to % to resolve conflict', 
        conflict_room.id, conflict_room.room_number, new_room_number;
      
      suffix_counter := suffix_counter + 1;
    END LOOP;
  END LOOP;
END $$;

-- =============================================
-- STEP 4: Ensure all individual_rooms have hotel_id (safety check)
-- =============================================

-- If any rooms still don't have hotel_id, this will fail and alert us
UPDATE individual_rooms ir
SET hotel_id = (
  SELECT r.hotel_id
  FROM rooms r
  WHERE r.id = ir.room_id
  LIMIT 1
)
WHERE hotel_id IS NULL;

-- =============================================
-- STEP 5: Drop old unique constraint and add new hotel-wide constraint
-- =============================================

-- Drop the old constraint (unique per room type)
ALTER TABLE individual_rooms
DROP CONSTRAINT IF EXISTS individual_rooms_room_id_room_number_key;

-- Add new constraint (unique per hotel)
ALTER TABLE individual_rooms
ADD CONSTRAINT individual_rooms_hotel_id_room_number_key 
UNIQUE(hotel_id, room_number);

-- =============================================
-- STEP 6: Add index for performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_individual_rooms_hotel_id 
ON individual_rooms(hotel_id);

CREATE INDEX IF NOT EXISTS idx_individual_rooms_hotel_number 
ON individual_rooms(hotel_id, room_number);

-- =============================================
-- STEP 7: Make hotel_id NOT NULL (now that it's populated)
-- =============================================

ALTER TABLE individual_rooms
ALTER COLUMN hotel_id SET NOT NULL;

-- =============================================
-- STEP 8: Update RLS policies to use hotel_id directly
-- =============================================

-- Drop old policies
DROP POLICY IF EXISTS "hotel_owners_manage_individual_rooms" ON individual_rooms;
DROP POLICY IF EXISTS "public_view_individual_rooms" ON individual_rooms;

-- Create new policies using hotel_id directly
CREATE POLICY "hotel_owners_manage_individual_rooms"
  ON individual_rooms
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hotels h
      JOIN businesses b ON b.id = h.business_id
      WHERE h.id = individual_rooms.hotel_id
        AND b.owner_id = auth.uid()
    )
  );

CREATE POLICY "public_view_individual_rooms"
  ON individual_rooms
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hotels h
      JOIN businesses b ON b.id = h.business_id
      WHERE h.id = individual_rooms.hotel_id
        AND b.owner_id = auth.uid()
    )
  );

-- =============================================
-- STEP 9: Update generate_individual_rooms function
-- to check hotel-wide uniqueness
-- =============================================

CREATE OR REPLACE FUNCTION generate_individual_rooms(
  p_room_type_id UUID,
  p_prefix TEXT DEFAULT '',
  p_start_number INTEGER DEFAULT 1,
  p_count INTEGER DEFAULT 1,
  p_floor_number INTEGER DEFAULT NULL
) RETURNS TABLE(individual_room_id UUID, room_number TEXT) AS $$
DECLARE
  v_individual_room_id UUID;
  v_room_num TEXT;
  v_floor_num INTEGER;
  v_hotel_id UUID;
  i INTEGER;
  v_room_number TEXT;
  v_suffix INTEGER;
BEGIN
  -- Get hotel_id from room type
  SELECT hotel_id INTO v_hotel_id
  FROM rooms
  WHERE id = p_room_type_id;
  
  IF v_hotel_id IS NULL THEN
    RAISE EXCEPTION 'Room type % does not exist or has no associated hotel', p_room_type_id;
  END IF;
  
  -- Set floor number
  v_floor_num := COALESCE(p_floor_number, (p_start_number / 100));
  
  -- Generate individual rooms
  FOR i IN 1..p_count LOOP
    -- Calculate base room number
    IF (p_start_number + i - 1) < 10 THEN
      v_room_number := p_prefix || '0' || (p_start_number + i - 1)::TEXT;
    ELSE
      v_room_number := p_prefix || (p_start_number + i - 1)::TEXT;
    END IF;
    
    -- Check if this room number already exists for this hotel
    v_suffix := 0;
    WHILE EXISTS (
      SELECT 1 FROM individual_rooms
      WHERE hotel_id = v_hotel_id
        AND room_number = v_room_number
    ) LOOP
      -- If exists, try adding a suffix
      v_suffix := v_suffix + 1;
      v_room_number := v_room_number || '-' || v_suffix::TEXT;
    END LOOP;
    
    -- Insert the room with the unique number
    INSERT INTO individual_rooms (
      room_id,
      hotel_id,
      room_number,
      floor_number,
      current_status
    )
    VALUES (
      p_room_type_id,
      v_hotel_id,
      v_room_number,
      v_floor_num,
      'clean'
    )
    RETURNING id, room_number INTO v_individual_room_id, v_room_num;
    
    -- Return the values
    individual_room_id := v_individual_room_id;
    room_number := v_room_num;
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- STEP 10: Add function to get next available room number
-- for a given prefix and floor
-- =============================================

CREATE OR REPLACE FUNCTION get_next_available_room_number(
  p_hotel_id UUID,
  p_prefix TEXT DEFAULT '',
  p_floor_number INTEGER DEFAULT NULL,
  p_start_from INTEGER DEFAULT 1
) RETURNS INTEGER AS $$
DECLARE
  v_next_number INTEGER;
  v_test_number TEXT;
BEGIN
  v_next_number := p_start_from;
  
  LOOP
    -- Format the number (pad with zero if needed)
    IF v_next_number < 10 THEN
      v_test_number := p_prefix || '0' || v_next_number::TEXT;
    ELSE
      v_test_number := p_prefix || v_next_number::TEXT;
    END IF;
    
    -- Check if this number is available for this hotel
    IF NOT EXISTS (
      SELECT 1 FROM individual_rooms
      WHERE hotel_id = p_hotel_id
        AND room_number = v_test_number
    ) THEN
      RETURN v_next_number;
    END IF;
    
    v_next_number := v_next_number + 1;
    
    -- Safety limit to prevent infinite loop
    IF v_next_number > 9999 THEN
      RAISE EXCEPTION 'Could not find available room number after 9999 attempts';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- STEP 11: Add function to get existing room numbers for a hotel
-- =============================================

CREATE OR REPLACE FUNCTION get_existing_room_numbers(
  p_hotel_id UUID,
  p_floor_number INTEGER DEFAULT NULL,
  p_prefix TEXT DEFAULT ''
) RETURNS TABLE(room_number TEXT, room_type_name TEXT, floor_number INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ir.room_number,
    r.name as room_type_name,
    ir.floor_number
  FROM individual_rooms ir
  JOIN rooms r ON r.id = ir.room_id
  WHERE ir.hotel_id = p_hotel_id
    AND (p_floor_number IS NULL OR ir.floor_number = p_floor_number)
    AND (p_prefix = '' OR ir.room_number LIKE p_prefix || '%')
  ORDER BY ir.floor_number, ir.room_number;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- STEP 12: Add validation trigger to prevent quantity < existing individual rooms
-- =============================================

CREATE OR REPLACE FUNCTION validate_room_type_quantity()
RETURNS TRIGGER AS $$
DECLARE
  v_existing_count INTEGER;
BEGIN
  -- Only check on UPDATE when quantity is being decreased
  IF TG_OP = 'UPDATE' AND NEW.quantity < OLD.quantity THEN
    -- Count existing individual rooms for this room type
    SELECT COUNT(*) INTO v_existing_count
    FROM individual_rooms
    WHERE room_id = NEW.id;
    
    -- Prevent update if quantity would be less than existing rooms
    IF NEW.quantity < v_existing_count THEN
      RAISE EXCEPTION 'Cannot set quantity to % because there are already % individual rooms of this type. Delete % room(s) first.', 
        NEW.quantity, v_existing_count, (v_existing_count - NEW.quantity);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create it
DROP TRIGGER IF EXISTS check_room_type_quantity ON rooms;
CREATE TRIGGER check_room_type_quantity
  BEFORE UPDATE ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION validate_room_type_quantity();

-- =============================================
-- STEP 13: Improve auto-assignment function to check both availability systems
-- =============================================

CREATE OR REPLACE FUNCTION auto_assign_room_for_reservation(
  p_reservation_id UUID,
  p_room_type_id UUID,
  p_check_in_date DATE,
  p_check_out_date DATE,
  p_preferences JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_room_id UUID;
  v_hotel_id UUID;
BEGIN
  -- Get hotel_id from room type
  SELECT hotel_id INTO v_hotel_id
  FROM rooms
  WHERE id = p_room_type_id;
  
  IF v_hotel_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Find available room matching criteria
  -- Check both individual room availability AND reservation conflicts
  SELECT ir.id INTO v_room_id
  FROM individual_rooms ir
  JOIN rooms r ON r.id = ir.room_id
  WHERE r.id = p_room_type_id
    AND ir.hotel_id = v_hotel_id
    AND ir.current_status = 'clean'
    -- Check individual room availability table
    AND NOT EXISTS (
      SELECT 1 FROM individual_room_availability ira
      WHERE ira.individual_room_id = ir.id
        AND ira.date BETWEEN p_check_in_date AND (p_check_out_date - INTERVAL '1 day')
        AND ira.status = 'reserved'
    )
    -- Also check reservations table for confirmed/checked_in reservations
    AND NOT EXISTS (
      SELECT 1 FROM reservations res
      WHERE res.individual_room_id = ir.id
        AND res.reservation_status IN ('confirmed', 'checked_in', 'checked_out')
        AND NOT (res.check_out_date <= p_check_in_date OR res.check_in_date >= p_check_out_date)
        AND res.id != COALESCE(p_reservation_id, '00000000-0000-0000-0000-000000000000'::UUID)
    )
  ORDER BY 
    -- Prioritize by preferences
    CASE 
      WHEN p_preferences->>'floor' = 'high' AND ir.floor_number IS NOT NULL THEN -ir.floor_number
      WHEN p_preferences->>'floor' = 'low' AND ir.floor_number IS NOT NULL THEN ir.floor_number
      ELSE 0
    END,
    -- Random for equal candidates
    RANDOM()
  LIMIT 1;
  
  -- If no room found, return NULL
  IF v_room_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Update reservation with room assignment
  UPDATE reservations
  SET individual_room_id = v_room_id,
      updated_at = NOW()
  WHERE id = p_reservation_id;
  
  -- Mark availability for dates in individual_room_availability table
  INSERT INTO individual_room_availability (individual_room_id, date, status, reservation_id)
  SELECT v_room_id, date, 'reserved', p_reservation_id
  FROM generate_series(p_check_in_date, p_check_out_date - INTERVAL '1 day', INTERVAL '1 day') AS date
  ON CONFLICT (individual_room_id, date) DO UPDATE SET
    status = 'reserved',
    reservation_id = p_reservation_id,
    updated_at = NOW();
  
  RETURN v_room_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

COMMENT ON COLUMN individual_rooms.hotel_id IS 'Direct reference to hotel for hotel-wide room number uniqueness';
COMMENT ON FUNCTION get_next_available_room_number IS 'Returns the next available room number for a given hotel, prefix, and floor';
COMMENT ON FUNCTION get_existing_room_numbers IS 'Returns all existing room numbers for a hotel, optionally filtered by floor and prefix';

