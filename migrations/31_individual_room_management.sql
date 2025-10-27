-- =============================================
-- INDIVIDUAL ROOM MANAGEMENT SYSTEM
-- Migration: 31_individual_room_management.sql
-- Phase 1: Database Schema Implementation
-- =============================================

-- =============================================
-- 1. INDIVIDUAL ROOMS TABLE
-- Physical room instances (e.g., Room 201, Room 202)
-- =============================================

CREATE TABLE IF NOT EXISTS individual_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE, -- References room type
  
  -- Physical Identification
  room_number TEXT NOT NULL,          -- "201", "1501A", "Suite B"
  floor_number INTEGER,
  wing TEXT,                          -- "North Wing", "Tower"
  building TEXT,                       -- If multi-building property
  
  -- Room Details
  view_type TEXT,                     -- "ocean", "city", "garden", "no_view"
  bed_configuration_specific JSONB,   -- Actual beds in this room
  
  -- Status
  current_status TEXT DEFAULT 'clean' CHECK (current_status IN ('clean', 'dirty', 'occupied', 'out_of_order', 'blocked')),
  
  -- Physical Attributes
  size_sqm INTEGER,                   -- Exact room size (if different from room type)
  balcony BOOLEAN DEFAULT false,
  accessible BOOLEAN DEFAULT false,    -- ADA compliance
  smoking BOOLEAN DEFAULT false,
  
  -- Notes
  notes TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  -- Room numbers must be unique per hotel (via room_id which references rooms which reference hotel_id)
  UNIQUE(room_id, room_number)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_individual_rooms_room_id ON individual_rooms(room_id);
CREATE INDEX IF NOT EXISTS idx_individual_rooms_status ON individual_rooms(current_status);
CREATE INDEX IF NOT EXISTS idx_individual_rooms_floor ON individual_rooms(floor_number);

-- =============================================
-- 2. ROOM STATUS HISTORY TABLE
-- Track all room status changes for audit and housekeeping
-- =============================================

CREATE TABLE IF NOT EXISTS room_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  individual_room_id UUID NOT NULL REFERENCES individual_rooms(id) ON DELETE CASCADE,
  
  -- Status Change
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  
  -- Context
  reservation_id UUID, -- Can reference either hotel_reservations or reservations table
  
  -- Additional Info
  notes TEXT,
  
  -- Timestamps
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance and queries
CREATE INDEX IF NOT EXISTS idx_room_status_history_room ON room_status_history(individual_room_id);
CREATE INDEX IF NOT EXISTS idx_room_status_history_date ON room_status_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_room_status_history_reservation ON room_status_history(reservation_id);

-- =============================================
-- 3. UPDATE RESERVATIONS TABLE
-- Add individual room assignment columns
-- =============================================

-- Add individual_room_id column to hotel_reservations
ALTER TABLE hotel_reservations 
ADD COLUMN IF NOT EXISTS individual_room_id UUID REFERENCES individual_rooms(id),
ADD COLUMN IF NOT EXISTS room_assigned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS assignment_method TEXT CHECK (assignment_method IN ('auto', 'manual', 'guest_request'));

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_hotel_reservations_individual_room ON hotel_reservations(individual_room_id);

-- =============================================
-- 4. INDIVIDUAL ROOM AVAILABILITY TABLE
-- Track availability per physical room (not room type)
-- =============================================

CREATE TABLE IF NOT EXISTS individual_room_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  individual_room_id UUID NOT NULL REFERENCES individual_rooms(id) ON DELETE CASCADE,
  
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('available', 'reserved', 'maintenance', 'blocked')),
  
  -- Reservation reference
  reservation_id UUID, -- Can reference hotel_reservations or reservations
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(individual_room_id, date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_individual_room_availability_room ON individual_room_availability(individual_room_id);
CREATE INDEX IF NOT EXISTS idx_individual_room_availability_date ON individual_room_availability(date);
CREATE INDEX IF NOT EXISTS idx_individual_room_availability_status ON individual_room_availability(status);
CREATE INDEX IF NOT EXISTS idx_individual_room_availability_reservation ON individual_room_availability(reservation_id);

-- =============================================
-- 5. TRIGGER FOR UPDATED_AT
-- =============================================

-- Create update trigger for individual_rooms
DROP TRIGGER IF EXISTS update_individual_rooms_updated_at ON individual_rooms;
CREATE TRIGGER update_individual_rooms_updated_at
  BEFORE UPDATE ON individual_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create update trigger for individual_room_availability
DROP TRIGGER IF EXISTS update_individual_room_availability_updated_at ON individual_room_availability;
CREATE TRIGGER update_individual_room_availability_updated_at
  BEFORE UPDATE ON individual_room_availability
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 6. AUTO-ASSIGNMENT FUNCTION
-- Automatically assign best available room for a reservation
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
BEGIN
  -- Find available room matching criteria
  SELECT ir.id INTO v_room_id
  FROM individual_rooms ir
  JOIN rooms r ON r.id = ir.room_id
  WHERE r.id = p_room_type_id
    AND ir.current_status = 'clean'
    AND NOT EXISTS (
      SELECT 1 FROM individual_room_availability ira
      WHERE ira.individual_room_id = ir.id
        AND ira.date BETWEEN p_check_in_date AND (p_check_out_date - INTERVAL '1 day')
        AND ira.status = 'reserved'
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
  UPDATE hotel_reservations
  SET individual_room_id = v_room_id,
      room_assigned_at = NOW(),
      assignment_method = 'auto'
  WHERE id = p_reservation_id;
  
  -- Mark availability for dates
  INSERT INTO individual_room_availability (individual_room_id, date, status, reservation_id)
  SELECT v_room_id, date, 'reserved', p_reservation_id
  FROM generate_series(p_check_in_date, p_check_out_date - INTERVAL '1 day', INTERVAL '1 day') AS date
  ON CONFLICT (individual_room_id, date) DO UPDATE SET
    status = 'reserved',
    reservation_id = p_reservation_id,
    updated_at = NOW();
  
  -- Update room status to occupied at check-in
  UPDATE individual_rooms
  SET current_status = 'occupied',
      updated_at = NOW()
  WHERE id = v_room_id;
  
  RETURN v_room_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 7. RLS POLICIES
-- Ensure proper data isolation per hotel
-- =============================================

-- Enable RLS on all new tables
ALTER TABLE individual_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE individual_room_availability ENABLE ROW LEVEL SECURITY;

-- Policy: Hotel owners can view and manage their own rooms
DROP POLICY IF EXISTS "hotel_owners_manage_individual_rooms" ON individual_rooms;
CREATE POLICY "hotel_owners_manage_individual_rooms"
  ON individual_rooms
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rooms r
      JOIN hotels h ON h.id = r.hotel_id
      JOIN businesses b ON b.id = h.business_id
      WHERE r.id = individual_rooms.room_id
        AND b.owner_id = auth.uid()
    )
  );

-- Policy: Public can view individual rooms for active hotels
DROP POLICY IF EXISTS "public_view_individual_rooms" ON individual_rooms;
CREATE POLICY "public_view_individual_rooms"
  ON individual_rooms
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rooms r
      JOIN hotels h ON h.id = r.hotel_id
      JOIN businesses b ON b.id = h.business_id
      WHERE r.id = individual_rooms.room_id
        AND b.status = 'active'
    )
  );

-- Policy: Hotel owners can manage their room status history
DROP POLICY IF EXISTS "hotel_owners_manage_status_history" ON room_status_history;
CREATE POLICY "hotel_owners_manage_status_history"
  ON room_status_history
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM individual_rooms ir
      JOIN rooms r ON r.id = ir.room_id
      JOIN hotels h ON h.id = r.hotel_id
      JOIN businesses b ON b.id = h.business_id
      WHERE ir.id = room_status_history.individual_room_id
        AND b.owner_id = auth.uid()
    )
  );

-- Policy: Hotel owners can view their room availability
DROP POLICY IF EXISTS "hotel_owners_view_room_availability" ON individual_room_availability;
CREATE POLICY "hotel_owners_view_room_availability"
  ON individual_room_availability
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM individual_rooms ir
      JOIN rooms r ON r.id = ir.room_id
      JOIN hotels h ON h.id = r.hotel_id
      JOIN businesses b ON b.id = h.business_id
      WHERE ir.id = individual_room_availability.individual_room_id
        AND b.owner_id = auth.uid()
    )
  );

-- =============================================
-- 8. HELPER FUNCTION: GENERATE INDIVIDUAL ROOMS
-- Auto-generate physical rooms from room types
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
  i INTEGER;
BEGIN
  -- Set floor number
  v_floor_num := COALESCE(p_floor_number, (p_start_number / 100));
  
  -- Generate individual rooms
  FOR i IN 1..p_count LOOP
    INSERT INTO individual_rooms (
      room_id,
      room_number,
      floor_number,
      current_status
    )
    VALUES (
      p_room_type_id,
      p_prefix || (p_start_number + i - 1)::TEXT,
      v_floor_num,
      'clean'
    )
    RETURNING id, individual_rooms.room_number INTO v_individual_room_id, v_room_num;
    
    -- Return the values (individual_room_id and room_number are OUT parameters from RETURNS TABLE)
    individual_room_id := v_individual_room_id;
    room_number := v_room_num;
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

COMMENT ON TABLE individual_rooms IS 'Physical room instances, tracking individual rooms (e.g., Room 201)';
COMMENT ON TABLE room_status_history IS 'Audit trail of all room status changes for housekeeping and operations';
COMMENT ON TABLE individual_room_availability IS 'Daily availability tracking per physical room';

